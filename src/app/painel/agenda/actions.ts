"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AppointmentStatus, PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { findOrCreateClient } from "@/lib/clients";
import { fail, text, type ActionState } from "@/lib/action";
import { onlyDigits, PAYMENT_METHOD } from "@/lib/format";
import { parseMoney } from "@/lib/money";
import { findConflict, lockProfessional } from "@/lib/scheduling";
import { hhmmToMinutes, isDateStr, zonedToUtc } from "@/lib/time";

const CONFLICT_MESSAGE = {
  appointment: "Esse horário já está ocupado para esse profissional. Escolha outro ou marque \"Encaixe\".",
  block: "Esse horário está bloqueado na agenda do profissional. Escolha outro ou marque \"Encaixe\".",
};

async function resolveClient(shopId: string, form: FormData) {
  const clientId = text(form, "clientId");
  if (clientId) {
    const client = await db.client.findFirst({ where: { id: clientId, shopId } });
    return client ?? "Cliente não encontrado.";
  }
  const name = text(form, "clientName");
  const phone = onlyDigits(text(form, "clientPhone"));
  if (!name) return "Escolha um cliente ou informe o nome do cliente novo.";
  if (phone.length < 10) return "Informe o telefone do cliente com DDD.";
  return findOrCreateClient(shopId, name, phone);
}

export async function saveAppointment(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireUser();
  const id = text(form, "id");
  const date = text(form, "date");
  const time = hhmmToMinutes(text(form, "time"));
  const professionalId = text(form, "professionalId");
  const serviceIds = form.getAll("serviceIds").map(String);
  const allowOverlap = form.get("allowOverlap") === "on";

  if (!isDateStr(date)) return fail("Escolha a data.");
  if (time === null) return fail("Escolha o horário.");
  if (!serviceIds.length) return fail("Escolha pelo menos um serviço.");

  const [professional, services] = await Promise.all([
    db.professional.findFirst({ where: { id: professionalId, shopId: shop.id } }),
    db.service.findMany({ where: { id: { in: serviceIds }, shopId: shop.id } }),
  ]);
  if (!professional) return fail("Escolha o profissional.");
  if (services.length !== serviceIds.length) return fail("Algum serviço escolhido não existe mais.");

  const client = await resolveClient(shop.id, form);
  if (typeof client === "string") return fail(client);

  const existing = id ? await db.appointment.findFirst({ where: { id, shopId: shop.id } }) : null;
  if (id && !existing) return fail("Agendamento não encontrado.");

  const ordered = serviceIds.map((sid) => services.find((s) => s.id === sid)!);
  const durationMin = ordered.reduce((sum, s) => sum + s.durationMin, 0);
  const totalCents = ordered.reduce((sum, s) => sum + s.priceCents, 0);
  const startAt = zonedToUtc(date, time, shop.timezone);
  const endAt = new Date(startAt.getTime() + durationMin * 60_000);
  const notes = text(form, "notes") || null;
  const serviceRows = ordered.map((s) => ({ serviceId: s.id, name: s.name, durationMin: s.durationMin, priceCents: s.priceCents }));

  const result = await db.$transaction(async (tx) => {
    await lockProfessional(tx, professional.id);
    if (!allowOverlap) {
      const conflict = await findConflict(tx, { professionalId: professional.id, startAt, endAt, excludeAppointmentId: id || undefined });
      if (conflict) return { error: CONFLICT_MESSAGE[conflict], id: null };
    }
    if (existing) {
      await tx.appointmentService.deleteMany({ where: { appointmentId: existing.id } });
      await tx.appointment.update({
        where: { id: existing.id },
        data: { professionalId: professional.id, clientId: client.id, startAt, endAt, totalCents, notes, services: { create: serviceRows } },
      });
      return { error: null, id: existing.id };
    }
    const created = await tx.appointment.create({
      data: {
        shopId: shop.id,
        professionalId: professional.id,
        clientId: client.id,
        startAt,
        endAt,
        totalCents,
        notes,
        status: "CONFIRMED",
        source: "MANUAL",
        services: { create: serviceRows },
      },
    });
    return { error: null, id: created.id };
  });

  if (result.error !== null) return fail(result.error);
  revalidatePath("/painel", "layout");
  redirect(`/painel/agendamentos/${result.id}`);
}

const ALLOWED_STATUS: AppointmentStatus[] = ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELED"];

export async function setAppointmentStatus(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireUser();
  const id = text(form, "id");
  const status = text(form, "status") as AppointmentStatus;
  if (!ALLOWED_STATUS.includes(status)) return fail("Situação inválida.");
  const appointment = await db.appointment.findFirst({ where: { id, shopId: shop.id } });
  if (!appointment) return fail("Agendamento não encontrado.");

  const result = await db.$transaction(async (tx) => {
    const reopening = ["CANCELED", "EXPIRED"].includes(appointment.status) && status !== "CANCELED";
    if (reopening) {
      await lockProfessional(tx, appointment.professionalId);
      const conflict = await findConflict(tx, {
        professionalId: appointment.professionalId,
        startAt: appointment.startAt,
        endAt: appointment.endAt,
        excludeAppointmentId: appointment.id,
      });
      if (conflict) return "Esse horário já foi ocupado por outro agendamento. Remarque para outro horário.";
    }
    await tx.appointment.update({ where: { id }, data: { status, holdExpiresAt: null } });
    if (status === "CANCELED") {
      await tx.payment.updateMany({ where: { appointmentId: id, status: "PENDING" }, data: { status: "CANCELED" } });
    }
    return null;
  });
  if (result) return fail(result);
  revalidatePath("/painel", "layout");
  return { ok: true };
}

export async function registerPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireUser();
  const appointmentId = text(form, "appointmentId");
  const amountCents = parseMoney(text(form, "amount"));
  const method = text(form, "method") as PaymentMethod;
  if (!amountCents || amountCents <= 0) return fail("Informe o valor recebido.");
  if (!(method in PAYMENT_METHOD)) return fail("Escolha a forma de pagamento.");

  const appointment = await db.appointment.findFirst({ where: { id: appointmentId, shopId: shop.id } });
  if (!appointment) return fail("Agendamento não encontrado.");

  await db.$transaction([
    db.payment.create({
      data: {
        shopId: shop.id,
        appointmentId,
        clientId: appointment.clientId,
        amountCents,
        method,
        channel: "IN_PERSON",
        status: "APPROVED",
        paidAt: new Date(),
      },
    }),
    ...(form.get("complete") === "on" && ["CONFIRMED", "PENDING_PAYMENT", "NO_SHOW"].includes(appointment.status)
      ? [db.appointment.update({ where: { id: appointmentId }, data: { status: "COMPLETED", holdExpiresAt: null } })]
      : []),
  ]);
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Pagamento registrado." };
}

export async function removePayment(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireUser();
  const payment = await db.payment.findFirst({ where: { id: text(form, "paymentId"), shopId: shop.id } });
  if (!payment) return fail("Pagamento não encontrado.");
  if (payment.channel === "ONLINE") {
    return fail("Pagamentos online precisam ser estornados pelo Mercado Pago.");
  }
  await db.payment.update({ where: { id: payment.id }, data: { status: "CANCELED" } });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Pagamento removido." };
}

export async function createBlock(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireUser();
  const professionalIds = form.getAll("professionalIds").map(String);
  const date = text(form, "date");
  const allDay = form.get("allDay") === "on";
  const start = allDay ? 0 : hhmmToMinutes(text(form, "start"));
  const end = allDay ? 24 * 60 : hhmmToMinutes(text(form, "end"));
  if (!isDateStr(date)) return fail("Escolha a data.");
  if (start === null || end === null || end <= start) return fail("O fim do bloqueio precisa ser depois do início.");

  const professionals = await db.professional.findMany({ where: { shopId: shop.id, id: { in: professionalIds } } });
  if (!professionals.length) return fail("Escolha pelo menos um profissional.");

  const startAt = zonedToUtc(date, start, shop.timezone);
  const endAt = zonedToUtc(date, end, shop.timezone);
  await db.timeBlock.createMany({
    data: professionals.map((p) => ({
      shopId: shop.id,
      professionalId: p.id,
      startAt,
      endAt,
      reason: text(form, "reason") || null,
    })),
  });
  // Quem já estava marcado nesse horário continua na agenda: avisa para o negócio remarcar se precisar.
  const overlapping = await db.appointment.count({
    where: {
      shopId: shop.id,
      professionalId: { in: professionals.map((p) => p.id) },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
    },
  });
  revalidatePath("/painel", "layout");
  redirect(`/painel/agenda?data=${date}${overlapping ? `&aviso=${overlapping}` : ""}`);
}

export async function deleteBlock(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireUser();
  await db.timeBlock.deleteMany({ where: { id: text(form, "id"), shopId: shop.id } });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Bloqueio removido." };
}
