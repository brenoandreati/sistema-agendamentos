"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma, type PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth";
import { fail, text, type ActionState } from "@/lib/action";
import { isExpenseCategory, nextMonthlyDate } from "@/lib/expenses";
import { expenseDate } from "@/lib/finance";
import { PAYMENT_METHOD } from "@/lib/format";
import { parseMoney } from "@/lib/money";
import { isDateStr, todayStr, toDateStr, zonedToUtc } from "@/lib/time";

/** Entrada sem agendamento (cliente que chegou sem marcar, venda no balcão etc.). */
export async function registerIncome(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireOwner();
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
  const { shop } = await requireOwner();
  const payment = await db.payment.findFirst({
    where: { id: text(form, "paymentId"), shopId: shop.id, channel: "IN_PERSON", appointmentId: null },
  });
  if (!payment) return fail("Entrada não encontrada.");
  await db.payment.update({ where: { id: payment.id }, data: { status: "CANCELED" } });
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Entrada removida." };
}

/** Registra ou edita uma despesa. "Repetir todo mês" cria (ou atualiza) a despesa fixa ligada a ela. */
export async function saveExpense(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireOwner();
  const tz = shop.timezone;
  const id = text(form, "id");
  const description = text(form, "description", 100);
  const category = text(form, "category");
  const amountCents = parseMoney(text(form, "amount"));
  const date = text(form, "date");
  const repeat = form.get("repeat") === "on";

  if (!description) return fail("Descreva a despesa. Ex.: Aluguel do salão.");
  if (!isExpenseCategory(category)) return fail("Escolha a categoria.");
  if (!amountCents || amountCents <= 0) return fail("Informe o valor da despesa.");
  if (!isDateStr(date)) return fail("Escolha a data.");
  if (date > todayStr(tz)) return fail("A despesa não pode ter data no futuro. Registre no dia em que pagar.");

  const existing = id
    ? await db.expense.findFirst({ where: { id, shopId: shop.id }, include: { recurring: true } })
    : null;
  if (id && !existing) return fail("Despesa não encontrada.");

  const data = { description, category, amountCents, date: expenseDate(date, tz) };
  const day = Number(date.slice(8));
  const rule = existing?.recurring?.active ? existing.recurring : null;
  try {
    await db.$transaction(async (tx) => {
      let recurringId = existing?.recurringId ?? null;
      if (rule && repeat) {
        // Muda o valor e a descrição dos próximos meses também.
        await tx.recurringExpense.update({ where: { id: rule.id }, data: { description, category, amountCents } });
      } else if (rule && !repeat) {
        await tx.recurringExpense.update({ where: { id: rule.id }, data: { active: false } });
      } else if (repeat) {
        const created = await tx.recurringExpense.create({
          data: { shopId: shop.id, description, category, amountCents, dayOfMonth: day, nextDate: nextMonthlyDate(day, date) },
        });
        recurringId = created.id;
      }
      if (existing) await tx.expense.update({ where: { id: existing.id }, data: { ...data, recurringId } });
      else await tx.expense.create({ data: { ...data, shopId: shop.id, recurringId } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return fail("Essa despesa fixa já tem um lançamento nesse dia. Escolha outra data.");
    }
    throw error;
  }
  revalidatePath("/painel/financeiro", "layout");
  redirect(`/painel/financeiro?periodo=mes&data=${date}`);
}

export async function deleteExpense(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireOwner();
  const expense = await db.expense.findFirst({ where: { id: text(form, "id"), shopId: shop.id } });
  if (!expense) return fail("Despesa não encontrada.");
  await db.expense.delete({ where: { id: expense.id } });
  revalidatePath("/painel/financeiro", "layout");
  redirect(`/painel/financeiro?periodo=mes&data=${toDateStr(expense.date, shop.timezone)}`);
}

/** Para de lançar a despesa fixa nos próximos meses. As que já foram lançadas continuam. */
export async function stopRecurringExpense(_: ActionState, form: FormData): Promise<ActionState> {
  const { shop } = await requireOwner();
  const updated = await db.recurringExpense.updateMany({
    where: { id: text(form, "id"), shopId: shop.id, active: true },
    data: { active: false },
  });
  if (!updated.count) return fail("Despesa fixa não encontrada.");
  revalidatePath("/painel/financeiro", "layout");
  return { ok: true, message: "Não repete mais. As despesas já lançadas continuam no financeiro." };
}
