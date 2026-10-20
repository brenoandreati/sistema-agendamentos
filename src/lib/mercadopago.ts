import "server-only";
import type { PaymentMethod } from "@prisma/client";

// Integração com o Checkout Pro do Mercado Pago (Pix e cartão).
// Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro

const API = "https://api.mercadopago.com";

export class MercadoPagoError extends Error {}

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new MercadoPagoError(`Mercado Pago respondeu ${response.status}: ${body.slice(0, 300)}`);
  }
  return response.json() as Promise<T>;
}

type PreferenceInput = {
  title: string;
  amountCents: number;
  externalReference: string;
  payerName?: string;
  payerEmail?: string;
  backUrl: string;
  notificationUrl?: string;
  expiresAt: Date;
};

export async function createPreference(token: string, input: PreferenceInput) {
  const isPublicUrl = input.backUrl.startsWith("https://");
  const body = {
    items: [
      {
        title: input.title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: input.amountCents / 100,
      },
    ],
    payer: input.payerName ? { name: input.payerName, email: input.payerEmail } : undefined,
    external_reference: input.externalReference,
    back_urls: { success: input.backUrl, pending: input.backUrl, failure: input.backUrl },
    // O Mercado Pago só aceita retorno automático para endereços https.
    auto_return: isPublicUrl ? "approved" : undefined,
    notification_url: input.notificationUrl?.startsWith("https://") ? input.notificationUrl : undefined,
    payment_methods: { installments: 1 },
    expires: true,
    expiration_date_to: input.expiresAt.toISOString(),
    date_of_expiration: input.expiresAt.toISOString(),
  };
  return request<{ id: string; init_point: string }>(token, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type MercadoPagoPayment = {
  id: number;
  status: "pending" | "approved" | "authorized" | "in_process" | "in_mediation" | "rejected" | "cancelled" | "refunded" | "charged_back";
  external_reference: string | null;
  payment_type_id: string;
  payment_method_id: string;
  transaction_amount: number;
  date_approved: string | null;
};

export function getPayment(token: string, id: string) {
  return request<MercadoPagoPayment>(token, `/v1/payments/${encodeURIComponent(id)}`);
}

/** Valida o token consultando a conta dona dele. */
export function getAccount(token: string) {
  return request<{ id: number; nickname?: string; email?: string }>(token, "/users/me");
}

export function toPaymentMethod(payment: Pick<MercadoPagoPayment, "payment_type_id" | "payment_method_id">): PaymentMethod {
  if (payment.payment_method_id === "pix" || payment.payment_type_id === "bank_transfer") return "PIX";
  if (payment.payment_type_id === "credit_card") return "CREDIT_CARD";
  if (payment.payment_type_id === "debit_card" || payment.payment_type_id === "prepaid_card") return "DEBIT_CARD";
  return "OTHER";
}
