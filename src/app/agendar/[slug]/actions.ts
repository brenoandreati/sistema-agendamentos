"use server";

import { redirect } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { getCustomer } from "@/lib/auth";
import { eligibleProfessionals, getBookingCatalog } from "@/lib/booking";
import { findOrCreateClient } from "@/lib/clients";
import { onlyDigits } from "@/lib/format";
import { approvePayment, onlineAmountCents, startCheckout } from "@/lib/payments";
import { findConflict, getDayAvailability, lockProfessional } from "@/lib/scheduling";
import { isDateStr, zonedToUtc } from "@/lib/time";

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

export async function createBooking(input: BookingInput): Promise<BookingResult> {
  const catalog = await getBookingCatalog(input.slug);
  if (!catalog) return { error: "Página de agendamento não encontrada." };
  const { shop } = catalog;

  const customer = await getCustomer();
  const name = customer?.name ?? input.name.trim();
  const phone = customer?.phone ?? onlyDigits(input.phone);
  const email = customer?.email ?? (input.email?.trim().toLowerCase() || null);
  if (name.length < 2) return { error: "Informe seu nome." };
  if (phone.length < 10 || phone.length > 13) return { error: "Informe seu WhatsApp com DDD." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Confira o e-mail informado." };
  if (!isDateStr(input.date) || !Number.isInteger(input.time)) return { error: "Escolha o dia e o horário." };

  const services = input.serviceIds.map((id) => catalog.services.find((s) => s.id === id));
  if (!services.length || services.some((s) => !s)) return { error: "Escolha pelo menos um serviço." };
  const chosen = services.filter((s) => s !== undefined);
  const durationMin = chosen.reduce((sum, s) => sum + s.durationMin, 0);
  const totalCents = chosen.reduce((sum, s) => sum + s.priceCents, 0);

  const candidates = eligibleProfessionals(catalog.professionals, input.serviceIds).filter(
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

  const client = await findOrCreateClient(shop.id, name, phone, email);

  const startAt = zonedToUtc(input.date, input.time, shop.timezone);
  const endAt = new Date(startAt.getTime() + durationMin * 60_000);
  const amountCents = onlineAmountCents(shop, totalCents);
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
        notes: input.notes?.trim().slice(0, 500) || null,
        services: {
          create: chosen.map((s) => ({ serviceId: s.id, name: s.name, durationMin: s.durationMin, priceCents: s.priceCents })),
        },
      },
    });
  });
  if (!appointment) return { error: TAKEN };

  const statusPage = `/agendar/${shop.slug}/agendamento/${appointment.publicToken}`;
  if (!needsPayment) return { redirectTo: statusPage };

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
  if (!payment || payment.provider !== "demo" || payment.appointment?.publicToken !== token) {
    redirect("/");
  }
  const expired = payment.appointment.holdExpiresAt && payment.appointment.holdExpiresAt < new Date();
  if (!expired && payment.status === "PENDING") {
    await approvePayment(payment.id, { method: method === "CREDIT_CARD" ? "CREDIT_CARD" : "PIX" });
  }
  redirect(`/agendar/${payment.shop.slug}/agendamento/${token}`);
}
