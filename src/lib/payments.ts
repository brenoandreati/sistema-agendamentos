import "server-only";
import { headers } from "next/headers";
import type { PaymentMethod, Shop } from "@prisma/client";
import { db } from "./db";
import { decryptSecret } from "./crypto";
import { createPreference, getPayment, toPaymentMethod } from "./mercadopago";

export { onlineAmountCents } from "./pricing";

/** Token do Mercado Pago da barbearia (ou o padrão do servidor). Sem token, o sistema usa o modo demonstração. */
export function mercadoPagoToken(shop: Pick<Shop, "mpAccessToken">): string | null {
  if (shop.mpAccessToken) {
    const token = decryptSecret(shop.mpAccessToken);
    if (token) return token;
  }
  return process.env.MP_ACCESS_TOKEN || null;
}

export async function appBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type CheckoutInput = {
  shop: Shop;
  appointment: { id: string; publicToken: string; holdExpiresAt: Date | null; clientId: string };
  clientName: string;
  title: string;
  amountCents: number;
};

/** Cria a cobrança online e devolve o link para o cliente pagar. */
export async function startCheckout({ shop, appointment, clientName, title, amountCents }: CheckoutInput) {
  const token = mercadoPagoToken(shop);
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

/** Marca o pagamento como pago e confirma o agendamento. Pode ser chamado mais de uma vez. */
export async function approvePayment(
  paymentId: string,
  data: { method: PaymentMethod; providerPaymentId?: string; paidAt?: Date },
) {
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { appointment: true } });
    if (!payment || payment.status === "APPROVED") return;
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
    if (appointment && (appointment.status === "PENDING_PAYMENT" || appointment.status === "EXPIRED")) {
      await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CONFIRMED",
          holdExpiresAt: null,
          notes:
            appointment.status === "EXPIRED"
              ? [appointment.notes, "Pagamento aprovado depois que a reserva expirou: confira se o horário continua livre."]
                  .filter(Boolean)
                  .join("\n")
              : appointment.notes,
        },
      });
    }
  });
}

/** Consulta um pagamento no Mercado Pago e atualiza o sistema. */
export async function syncMercadoPagoPayment(shop: Shop, providerPaymentId: string) {
  const token = mercadoPagoToken(shop);
  if (!token) return null;
  const remote = await getPayment(token, providerPaymentId);
  if (!remote.external_reference) return null;

  const payment = await db.payment.findFirst({
    where: { id: remote.external_reference, shopId: shop.id },
  });
  if (!payment) return null;

  if (remote.status === "approved") {
    await approvePayment(payment.id, {
      method: toPaymentMethod(remote),
      providerPaymentId: String(remote.id),
      paidAt: remote.date_approved ? new Date(remote.date_approved) : new Date(),
    });
  } else if (remote.status === "refunded" || remote.status === "charged_back") {
    await db.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
  } else if (payment.status === "PENDING") {
    await db.payment.update({ where: { id: payment.id }, data: { providerPaymentId: String(remote.id) } });
  }
  return remote.status;
}
