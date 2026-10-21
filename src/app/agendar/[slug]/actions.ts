"use server";

import { redirect } from "next/navigation";
import { customerCancelPolicy } from "@/lib/cancellation";
import { notifyAppointmentLater } from "@/lib/notify";
import type { PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { eligibleProfessionals, getBookingCatalog } from "@/lib/booking";
import { findOrCreateClient } from "@/lib/clients";
import { EMAIL_RE, fail, text, type ActionState } from "@/lib/action";
import { addNote, onlyDigits } from "@/lib/format";
import { allWithinLimits, clientIp, TOO_MANY } from "@/lib/rate-limit";
import { approvePayment, chargeAtBookingCents, startCheckout } from "@/lib/payments";
import { findConflict, getDayAvailability, lockProfessional } from "@/lib/scheduling";
import { formatDateNumeric, formatTime, isDateStr, toDateStr, zonedToUtc } from "@/lib/time";

export type BookingInput = {
  slug: string;
  serviceIds: string[];
  professionalId: string; // "any" = sem preferência
  date: string;
  time: number; // minutos desde 00:00
  /** Dados de quem agenda sem conta. Com conta logada, valem os dados da conta. */
  name: string;
  phone: string;
  email?: string;
  notes?: string;
};

export type BookingResult = { error: string } | { redirectTo: string };

const TAKEN = "Esse horário acabou de ser ocupado. Escolha outro horário, por favor.";
const MAX_SERVICES = 6;
/** Horários futuros que o mesmo WhatsApp pode ter no mesmo negócio pelo site. */
const MAX_UPCOMING_PER_PHONE = 4;

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const catalog = await getBookingCatalog(input.slug);
  if (!catalog) return { error: "Página de agendamento não encontrada." };
  const { shop } = catalog;

  // Na demonstração, ninguém deixa dados reais: a conta não é ligada e o WhatsApp é trocado por um fictício.
  const customer = shop.isDemo ? null : await getCustomer();
  const name = customer?.name ?? String(input.name ?? "").trim().slice(0, 80);
  const phone = customer?.phone ?? onlyDigits(String(input.phone ?? "").slice(0, 30));
  const email = customer?.email ?? (String(input.email ?? "").trim().toLowerCase().slice(0, 254) || null);
  if (name.length < 2) return { error: "Informe seu nome." };
  if (phone.length < 10 || phone.length > 13) return { error: "Informe seu WhatsApp com DDD." };
  if (email && !EMAIL_RE.test(email)) return { error: "Confira o e-mail informado." };
  if (!isDateStr(input.date) || !Number.isInteger(input.time)) return { error: "Escolha o dia e o horário." };
  if (!Array.isArray(input.serviceIds) || input.serviceIds.length > MAX_SERVICES) return { error: "Escolha até 6 serviços." };

  const allowed = await allWithinLimits([
    [`booking:ip:${await clientIp()}`, 20, 600],
    [`booking:phone:${shop.id}:${phone}`, 6, 3600],
  ]);
  if (!allowed) return { error: TOO_MANY };

  const serviceIds = [...new Set(input.serviceIds.map(String))];
  const services = serviceIds.map((id) => catalog.services.find((s) => s.id === id));
  if (!services.length || services.some((s) => !s)) return { error: "Escolha pelo menos um serviço." };
  const chosen = services.filter((s) => s !== undefined);
  const durationMin = chosen.reduce((sum, s) => sum + s.durationMin, 0);
  const totalCents = chosen.reduce((sum, s) => sum + s.priceCents, 0);

  const candidates = eligibleProfessionals(catalog.professionals, serviceIds).filter(
    (p) => input.professionalId === "any" || p.id === input.professionalId,
  );
  const availability = await getDayAvailability({
    shop,
    dateStr: input.date,
    durationMin,
    professionalIds: candidates.map((p) => p.id),
    publicBooking: true,
  });
  const professional = candidates.find((p) => availability[p.id]?.includes(input.time));
  if (!professional) return { error: TAKEN };

  const clientPhone = shop.isDemo ? `119${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}` : phone;
  const existing = await db.client.findUnique({ where: { shopId_phone: { shopId: shop.id, phone: clientPhone } }, select: { id: true } });
  if (existing) {
    const upcoming = await db.appointment.count({
      where: {
        clientId: existing.id,
        startAt: { gt: new Date() },
        OR: [{ status: "CONFIRMED" }, { status: "PENDING_PAYMENT", holdExpiresAt: { gt: new Date() } }],
      },
    });
    if (upcoming >= MAX_UPCOMING_PER_PHONE) {
      return { error: `Você já tem ${upcoming} horários marcados aqui. Para marcar mais, fale com o negócio pelo WhatsApp.` };
    }
  }
  const client = await findOrCreateClient(shop.id, name, clientPhone, shop.isDemo ? null : email);
  const otherName = client.name.trim().toLowerCase() !== name.toLowerCase() ? `Agendado no nome de: ${name}` : null;

  // Quem volta do pagamento sem pagar e escolhe de novo não fica preso na própria reserva.
  const ownHolds = await db.appointment.findMany({
    where: { shopId: shop.id, clientId: client.id, status: "PENDING_PAYMENT" },
    select: { id: true },
  });
  if (ownHolds.length) {
    const ids = ownHolds.map((a) => a.id);
    await db.$transaction([
      db.appointment.updateMany({ where: { id: { in: ids }, status: "PENDING_PAYMENT" }, data: { status: "EXPIRED" } }),
      db.payment.updateMany({ where: { appointmentId: { in: ids }, status: "PENDING" }, data: { status: "CANCELED" } }),
    ]);
  }

  const startAt = zonedToUtc(input.date, input.time, shop.timezone);
  const endAt = new Date(startAt.getTime() + durationMin * 60_000);
  const amountCents = await chargeAtBookingCents(shop, totalCents);
  const needsPayment = amountCents > 0;

  const appointment = await db.$transaction(async (tx) => {
    await lockProfessional(tx, professional.id);
    if (await findConflict(tx, { professionalId: professional.id, startAt, endAt })) return null;
    return tx.appointment.create({
      data: {
        shopId: shop.id,
        professionalId: professional.id,
        clientId: client.id,
        customerId: customer?.id ?? null,
        startAt,
        endAt,
        totalCents,
        source: "ONLINE",
        status: needsPayment ? "PENDING_PAYMENT" : "CONFIRMED",
        holdExpiresAt: needsPayment ? new Date(Date.now() + shop.paymentHoldMin * 60_000) : null,
        notes: [otherName, input.notes?.trim().slice(0, 500)].filter(Boolean).join("\n") || null,
        services: {
          create: chosen.map((s) => ({ serviceId: s.id, name: s.name, durationMin: s.durationMin, priceCents: s.priceCents })),
        },
      },
    });
  });
  if (!appointment) return { error: TAKEN };

  const statusPage = `/agendar/${shop.slug}/agendamento/${appointment.publicToken}`;
  if (!needsPayment) {
    notifyAppointmentLater(appointment.id, "new");
    return { redirectTo: statusPage };
  }

  try {
    const checkoutUrl = await startCheckout({
      shop,
      appointment,
      clientName: client.name,
      title: `${shop.name} - ${chosen.map((s) => s.name).join(" + ")}`,
      amountCents,
    });
    return { redirectTo: checkoutUrl };
  } catch (error) {
    console.error("Falha ao criar pagamento", error);
    await db.appointment.update({ where: { id: appointment.id }, data: { status: "EXPIRED" } });
    await db.payment.updateMany({ where: { appointmentId: appointment.id, status: "PENDING" }, data: { status: "CANCELED" } });
    return { error: "Não conseguimos abrir o pagamento agora. Tente de novo em instantes." };
  }
}

/** Aprova um pagamento do modo demonstração (sem Mercado Pago configurado). */
export async function approveDemoPayment(form: FormData) {
  const paymentId = String(form.get("paymentId") ?? "");
  const token = String(form.get("token") ?? "");
  const method = String(form.get("method") ?? "PIX") as PaymentMethod;

  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { appointment: true, shop: true } });
  // Pagamento simulado só existe na demonstração. Negócio real sem Mercado Pago não cobra online.
  if (!payment || payment.provider !== "demo" || !payment.shop.isDemo || payment.appointment?.publicToken !== token) {
    redirect("/");
  }
  const expired = payment.appointment.holdExpiresAt && payment.appointment.holdExpiresAt < new Date();
  if (!expired && payment.status === "PENDING") {
    await approvePayment(payment.id, { method: method === "CREDIT_CARD" ? "CREDIT_CARD" : "PIX" });
  }
  redirect(`/agendar/${payment.shop.slug}/agendamento/${token}`);
}

/** O cliente cancela o próprio horário pela página do agendamento, dentro do prazo do negócio. */
export async function cancelByCustomer(_: ActionState, form: FormData): Promise<ActionState> {
  const token = text(form, "token", 100);
  const appointment = await db.appointment.findUnique({ where: { publicToken: token }, include: { shop: true } });
  if (!appointment) return fail("Agendamento não encontrado.");
  const policy = customerCancelPolicy(appointment, appointment.shop);
  if (!policy.allowed) return fail(policy.reason);

  const now = new Date();
  const tz = appointment.shop.timezone;
  await db.$transaction([
    db.appointment.update({
      where: { id: appointment.id },
      data: {
        status: "CANCELED",
        holdExpiresAt: null,
        notes: addNote(appointment.notes, `Cancelado pelo cliente pelo site em ${formatDateNumeric(toDateStr(now, tz))} às ${formatTime(now, tz)}.`),
      },
    }),
    db.payment.updateMany({ where: { appointmentId: appointment.id, status: "PENDING" }, data: { status: "CANCELED" } }),
  ]);
  notifyAppointmentLater(appointment.id, "canceled");
  redirect(`/agendar/${appointment.shop.slug}/agendamento/${appointment.publicToken}`);
}
