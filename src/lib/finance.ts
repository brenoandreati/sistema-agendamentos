import "server-only";
import type { PaymentMethod, Shop } from "@prisma/client";
import { db } from "./db";
import { periodRange, type Period } from "./period";
import { appointmentInclude, paidCents } from "./queries";
import { toDateStr, zonedToUtc } from "./time";

/** Relatório financeiro do período: o que entrou, o que falta receber e quem pagou. */
export async function getFinanceReport(shop: Shop, period: Period, date: string) {
  const tz = shop.timezone;
  const range = periodRange(period, date);
  const from = zonedToUtc(range.start, 0, tz);
  const to = zonedToUtc(range.end, 0, tz);
  const previousFrom = zonedToUtc(periodRange(period, range.prev).start, 0, tz);
  // Com o período ainda em andamento (ex.: dia 10 do mês), compara com o mesmo trecho do anterior (dias 1 a 10).
  const nowMs = Date.now();
  const elapsed = nowMs > from.getTime() && nowMs < to.getTime() ? nowMs - from.getTime() : null;
  const previousTo = elapsed === null ? from : new Date(Math.min(from.getTime(), previousFrom.getTime() + elapsed));

  const [payments, previous, appointments] = await Promise.all([
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

  return {
    range,
    received,
    previousReceived: previous._sum.amountCents ?? 0,
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
