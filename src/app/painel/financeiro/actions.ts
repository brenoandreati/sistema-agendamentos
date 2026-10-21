"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, text, type ActionState } from "@/lib/action";
import { PAYMENT_METHOD } from "@/lib/format";
import { parseMoney } from "@/lib/money";
import { isDateStr, todayStr, zonedToUtc } from "@/lib/time";

/** Entrada sem agendamento (cliente que chegou sem marcar, venda no balcão etc.). */
export async function registerIncome(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireUser();
  const description = text(form, "description");
  const amountCents = parseMoney(text(form, "amount"));
  const method = text(form, "method") as PaymentMethod;
  const date = text(form, "date");
  const clientId = text(form, "clientId");

  if (!description) return fail("Descreva a entrada. Ex.: Corte sem agendamento.");
  if (!amountCents || amountCents <= 0) return fail("Informe o valor recebido.");
  if (!(method in PAYMENT_METHOD)) return fail("Escolha a forma de pagamento.");
  if (!isDateStr(date)) return fail("Escolha a data.");
  if (date > todayStr(shop.timezone)) return fail("A entrada não pode ter data no futuro.");

  const client = clientId ? await db.client.findFirst({ where: { id: clientId, shopId: shop.id } }) : null;
  // Entradas de outros dias ficam registradas ao meio-dia daquele dia.
  const paidAt = date === todayStr(shop.timezone) ? new Date() : zonedToUtc(date, 12 * 60, shop.timezone);

  await db.payment.create({
    data: {
      shopId: shop.id,
      clientId: client?.id ?? null,
      description,
      amountCents,
      method,
      channel: "IN_PERSON",
      status: "APPROVED",
      paidAt,
    },
  });
  revalidatePath("/painel", "layout");
  redirect(`/painel/financeiro?periodo=dia&data=${date}`);
}

export async function removeIncome(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireUser();
  const payment = await db.payment.findFirst({
    where: { id: text(form, "paymentId"), shopId: shop.id, channel: "IN_PERSON", appointmentId: null },
  });
  if (!payment) return fail("Entrada não encontrada.");
  await db.payment.update({ where: { id: payment.id }, data: { status: "CANCELED" } });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Entrada removida." };
}
