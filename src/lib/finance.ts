import "server-only";
import type { ExpenseCategory, PaymentMethod } from "@prisma/client";
import { db } from "./db";
import { dueDates } from "./expenses";
import { periodRange, type Period } from "./period";
import { appointmentInclude, paidCents, type ShopRow } from "./queries";
import { todayStr, toDateStr, zonedToUtc } from "./time";

/** Dia de uma despesa guardado no banco: meio-dia no fuso do negócio (como as entradas avulsas de outros dias). */
export function expenseDate(date: string, tz: string) {
  return zonedToUtc(date, 12 * 60, tz);
}

/**
 * Lança as despesas fixas cujo dia já chegou. Quem "pega" a regra primeiro (nextDate igual ao lido)
 * é quem lança: duas telas abertas ao mesmo tempo não lançam em dobro.
 */
export async function syncRecurringExpenses(shopId: string, tz: string) {
  const today = todayStr(tz);
  const due = await db.recurringExpense.findMany({ where: { shopId, active: true, nextDate: { lte: today } } });
  for (const rule of due) {
    const { dates, nextDate } = dueDates(rule.dayOfMonth, rule.nextDate, today);
    if (!dates.length) continue;
    await db.$transaction(async (tx) => {
      const claimed = await tx.recurringExpense.updateMany({ where: { id: rule.id, nextDate: rule.nextDate }, data: { nextDate } });
      if (claimed.count !== 1) return;
      await tx.expense.createMany({
        data: dates.map((date) => ({
          shopId,
          recurringId: rule.id,
          description: rule.description,
          category: rule.category,
          amountCents: rule.amountCents,
          date: expenseDate(date, tz),
        })),
        skipDuplicates: true,
      });
    });
  }
}

/** Relatório financeiro do período: o que entrou, o que falta receber e quem pagou. */
export async function getFinanceReport(shop: ShopRow, period: Period, date: string) {
  const tz = shop.timezone;
  const range = periodRange(period, date);
  const from = zonedToUtc(range.start, 0, tz);
  const to = zonedToUtc(range.end, 0, tz);
  const previousFrom = zonedToUtc(periodRange(period, range.prev).start, 0, tz);
  // Com o período ainda em andamento (ex.: dia 10 do mês), compara com o mesmo trecho do anterior (dias 1 a 10).
  const nowMs = Date.now();
  const elapsed = nowMs > from.getTime() && nowMs < to.getTime() ? nowMs - from.getTime() : null;
  const previousTo = elapsed === null ? from : new Date(Math.min(from.getTime(), previousFrom.getTime() + elapsed));

  await syncRecurringExpenses(shop.id, tz);
  const [payments, previous, appointments, expenses, previousExpenses, recurring] = await Promise.all([
    db.payment.findMany({
      where: { shopId: shop.id, status: "APPROVED", paidAt: { gte: from, lt: to } },
      include: { client: true, appointment: { include: { services: true } } },
      orderBy: { paidAt: "desc" },
    }),
    db.payment.aggregate({
      where: { shopId: shop.id, status: "APPROVED", paidAt: { gte: previousFrom, lt: previousTo } },
      _sum: { amountCents: true },
    }),
    db.appointment.findMany({
      where: { shopId: shop.id, startAt: { gte: from, lt: to }, status: { notIn: ["CANCELED", "EXPIRED"] } },
      include: appointmentInclude,
      orderBy: { startAt: "asc" },
    }),
    db.expense.findMany({
      where: { shopId: shop.id, date: { gte: from, lt: to } },
      include: { recurring: { select: { active: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    }),
    db.expense.aggregate({
      where: { shopId: shop.id, date: { gte: previousFrom, lt: previousTo } },
      _sum: { amountCents: true },
    }),
    db.recurringExpense.findMany({ where: { shopId: shop.id, active: true }, orderBy: { dayOfMonth: "asc" } }),
  ]);

  const received = payments.reduce((sum, p) => sum + p.amountCents, 0);
  const online = payments.filter((p) => p.channel === "ONLINE").reduce((sum, p) => sum + p.amountCents, 0);

  const byMethod = new Map<PaymentMethod | "OTHER", number>();
  for (const p of payments) {
    const key = p.method ?? "OTHER";
    byMethod.set(key, (byMethod.get(key) ?? 0) + p.amountCents);
  }

  const totals = new Map<string, number>();
  for (const p of payments) {
    const key = range.bucketKey(toDateStr(p.paidAt!, tz));
    totals.set(key, (totals.get(key) ?? 0) + p.amountCents);
  }
  const chart = range.buckets.map((b) => ({ ...b, value: totals.get(b.key) ?? 0 }));

  const billable = appointments.filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED");
  // "Falta receber" considera só atendimentos que já começaram; os futuros ainda não venceram.
  const now = new Date();
  const unpaid = billable
    .filter((a) => a.startAt <= now)
    .map((a) => ({ appointment: a, remaining: a.totalCents - paidCents(a) }))
    .filter((item) => item.remaining > 0);
  const completed = appointments.filter((a) => a.status === "COMPLETED");

  const spent = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  const previousSpent = previousExpenses._sum.amountCents ?? 0;
  const byCategory = new Map<ExpenseCategory, number>();
  for (const e of expenses) byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountCents);
  const previousReceived = previous._sum.amountCents ?? 0;

  return {
    range,
    received,
    previousReceived,
    /** Despesas do período e o lucro (recebido menos despesas). */
    spent,
    previousSpent,
    profit: received - spent,
    previousProfit: previousReceived - previousSpent,
    expenses,
    byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    recurring,
    /** A comparação usa só o trecho já decorrido do período anterior. */
    partialComparison: elapsed !== null,
    online,
    inPerson: received - online,
    byMethod: [...byMethod.entries()].sort((a, b) => b[1] - a[1]),
    chart,
    payments,
    unpaid,
    toReceive: unpaid.reduce((sum, item) => sum + item.remaining, 0),
    appointmentsCount: billable.length,
    completedCount: completed.length,
    noShows: appointments.filter((a) => a.status === "NO_SHOW").length,
    averageTicket: completed.length ? Math.round(completed.reduce((s, a) => s + a.totalCents, 0) / completed.length) : 0,
  };
}
