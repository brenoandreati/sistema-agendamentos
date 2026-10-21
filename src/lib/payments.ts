import "server-only";
import { headers } from "next/headers";
import type { PaymentMethod, Shop } from "@prisma/client";
import type { ShopRow } from "./queries";
import { db } from "./db";
import { decryptSecret } from "./crypto";
import { addNote } from "./format";
import { createPreference, getPayment, toPaymentMethod } from "./mercadopago";
import { notifyAppointmentLater } from "./notify";
import { onlineAmountCents } from "./pricing";
import { findConflict, lockProfessional } from "./scheduling";

export { onlineAmountCents };

/**
 * Token do Mercado Pago do próprio negócio. Cada negócio recebe na sua conta: não existe token
 * da plataforma. Se o token não puder ser lido (ex.: AUTH_SECRET trocado), conta como não conectado.
 */
export async function mercadoPagoToken(shop: Pick<Shop, "mpAccessToken" | "isDemo">): Promise<string | null> {
  if (shop.isDemo || !shop.mpAccessToken) return null; // na demonstração o pagamento é sempre simulado
  return decryptSecret(shop.mpAccessToken);
}

/** Se o negócio cobra online de verdade (Mercado Pago conectado) ou de mentira (demonstração). */
export async function chargesOnline(shop: Pick<Shop, "mpAccessToken" | "isDemo" | "paymentMode">) {
  if (shop.paymentMode === "NONE") return false;
  return shop.isDemo || Boolean(await mercadoPagoToken(shop));
}

/** Quanto o cliente paga ao agendar. Sem Mercado Pago conectado, nada: paga no local. */
export async function chargeAtBookingCents(shop: ShopRow, totalCents: number) {
  return (await chargesOnline(shop)) ? onlineAmountCents(shop, totalCents) : 0;
}

export async function appBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type CheckoutInput = {
  shop: ShopRow;
  appointment: { id: string; publicToken: string; holdExpiresAt: Date | null; clientId: string };
  clientName: string;
  title: string;
  amountCents: number;
};

/** Cria a cobrança online e devolve o link para o cliente pagar. */
export async function startCheckout({ shop, appointment, clientName, title, amountCents }: CheckoutInput) {
  const token = await mercadoPagoToken(shop);
  if (!token && !shop.isDemo) throw new Error("Negócio sem Mercado Pago conectado.");
  const payment = await db.payment.create({
    data: {
      shopId: shop.id,
      appointmentId: appointment.id,
      clientId: appointment.clientId,
      amountCents,
      channel: "ONLINE",
      status: "PENDING",
      provider: token ? "mercadopago" : "demo",
      description: title,
    },
  });

  let checkoutUrl: string;
  if (token) {
    const base = await appBaseUrl();
    const preference = await createPreference(token, {
      title,
      amountCents,
      externalReference: payment.id,
      payerName: clientName,
      backUrl: `${base}/agendar/${shop.slug}/agendamento/${appointment.publicToken}`,
      notificationUrl: `${base}/api/webhooks/mercadopago/${shop.id}`,
      expiresAt: appointment.holdExpiresAt ?? new Date(Date.now() + shop.paymentHoldMin * 60_000),
    });
    checkoutUrl = preference.init_point;
  } else {
    checkoutUrl = `/agendar/${shop.slug}/pagamento/${payment.id}?t=${appointment.publicToken}`;
  }

  await db.payment.update({ where: { id: payment.id }, data: { checkoutUrl } });
  return checkoutUrl;
}

/**
 * Marca o pagamento como pago e confirma o agendamento. Pode ser chamado mais de uma vez.
 * Se a reserva já tinha vencido e outra pessoa pegou o horário, o agendamento não é confirmado:
 * fica na lista "Precisa de atenção" do painel para o negócio devolver o dinheiro ou remarcar.
 */
export async function approvePayment(
  paymentId: string,
  data: { method: PaymentMethod; providerPaymentId?: string; paidAt?: Date },
): Promise<{ appointmentId: string; confirmed: boolean } | null> {
  const result = await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { appointment: true } });
    if (!payment || payment.status === "APPROVED") return null;
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: "APPROVED",
        method: data.method,
        providerPaymentId: data.providerPaymentId,
        paidAt: data.paidAt ?? new Date(),
      },
    });
    const appointment = payment.appointment;
    if (!appointment) return null;

    if (appointment.status === "CANCELED") {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: { notes: addNote(appointment.notes, "Pagamento aprovado depois do cancelamento: devolva o valor ao cliente.") },
      });
      return { appointmentId: appointment.id, confirmed: false };
    }
    if (appointment.status !== "PENDING_PAYMENT" && appointment.status !== "EXPIRED") return null;

    await lockProfessional(tx, appointment.professionalId);
    const conflict = await findConflict(tx, {
      professionalId: appointment.professionalId,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      excludeAppointmentId: appointment.id,
    });
    if (conflict) {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "EXPIRED",
          holdExpiresAt: null,
          notes: addNote(
            appointment.notes,
            "Pagamento aprovado depois que a reserva venceu, e o horário já estava ocupado. Devolva o valor ou remarque com o cliente.",
          ),
        },
      });
      return { appointmentId: appointment.id, confirmed: false };
    }
    await tx.appointment.update({
      where: { id: appointment.id },
      data: { status: "CONFIRMED", holdExpiresAt: null },
    });
    return { appointmentId: appointment.id, confirmed: true };
  });
  if (result) notifyAppointmentLater(result.appointmentId, result.confirmed ? "paid" : "paid-no-slot");
  return result;
}

/** Consulta um pagamento no Mercado Pago e atualiza o sistema. */
export async function syncMercadoPagoPayment(shop: ShopRow, providerPaymentId: string) {
  const token = await mercadoPagoToken(shop);
  if (!token) return null;
  const remote = await getPayment(token, providerPaymentId);
  if (!remote.external_reference) return null;

  const payment = await db.payment.findFirst({
    where: { id: remote.external_reference, shopId: shop.id },
  });
  if (!payment) return null;

  const refundedCents = Math.round((remote.transaction_amount_refunded ?? 0) * 100);
  if (remote.status === "approved") {
    await approvePayment(payment.id, {
      method: toPaymentMethod(remote),
      providerPaymentId: String(remote.id),
      paidAt: remote.date_approved ? new Date(remote.date_approved) : new Date(),
    });
    // Estorno parcial: o pagamento continua aprovado, mas só conta o que ficou.
    const keptCents = Math.round(remote.transaction_amount * 100) - refundedCents;
    if (refundedCents > 0 && keptCents > 0 && keptCents !== payment.amountCents) {
      await db.payment.update({
        where: { id: payment.id },
        data: { amountCents: keptCents, description: addNote(payment.description, `Estorno parcial no Mercado Pago.`) },
      });
    }
  } else if (remote.status === "refunded" || remote.status === "charged_back") {
    if (payment.status !== "REFUNDED") {
      await db.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
      if (payment.appointmentId) {
        const appointment = await db.appointment.findUnique({ where: { id: payment.appointmentId }, select: { notes: true } });
        await db.appointment.update({
          where: { id: payment.appointmentId },
          data: {
            notes: addNote(
              appointment?.notes ?? null,
              remote.status === "charged_back"
                ? "O cliente contestou o pagamento online no cartão (chargeback)."
                : "Pagamento online devolvido ao cliente.",
            ),
          },
        });
      }
    }
  } else if (payment.status === "PENDING") {
    await db.payment.update({ where: { id: payment.id }, data: { providerPaymentId: String(remote.id) } });
  }
  return remote.status;
}
