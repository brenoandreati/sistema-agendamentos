import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDemoAgenda, buildDemoExpenses } from "./demo-data";
import { defaultWorkingHours } from "./defaults";
import { minutesOfDay, weekdayOf, toDateStr } from "./time";

const SP = "America/Sao_Paulo";
const services = [
  { id: "corte", name: "Corte", durationMin: 30, priceCents: 4500 },
  { id: "coloracao", name: "Coloração", durationMin: 120, priceCents: 18000 },
  { id: "mechas", name: "Mechas", durationMin: 180, priceCents: 32000 },
];
const professionals = [
  { id: "ana", serviceIds: ["corte"], hours: defaultWorkingHours() },
  { id: "ju", serviceIds: ["coloracao", "mechas"], hours: defaultWorkingHours() },
];

function build(paymentMode: "FULL" | "DEPOSIT" | "NONE") {
  let n = 0;
  return buildDemoAgenda({
    shopId: "shop",
    today: "2026-10-21",
    timezone: SP,
    now: new Date("2026-10-21T15:00:00.000Z"),
    paymentMode,
    depositPercent: 30,
    professionals,
    services,
    clientIds: ["c1", "c2", "c3"],
    newId: () => `a${n++}`,
  });
}

test("demonstração respeita o horário de trabalho e não sobrepõe atendimentos", () => {
  const { appointments, appointmentServices } = build("FULL");
  assert.ok(appointments.length > 100);
  for (const p of professionals) {
    const mine = appointments
      .filter((a) => a.professionalId === p.id)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    for (let i = 1; i < mine.length; i++) assert.ok(new Date(mine[i].startAt) >= new Date(mine[i - 1].endAt));
    for (const a of mine) {
      const start = new Date(a.startAt);
      const end = new Date(a.endAt);
      const day = weekdayOf(toDateStr(start, SP));
      const inside = p.hours.some(
        (h) => h.weekday === day && minutesOfDay(start, SP) >= h.startMin && minutesOfDay(end, SP) <= h.endMin,
      );
      assert.ok(inside, `fora do horário: ${start.toISOString()}`);
      const service = appointmentServices.find((s) => s.appointmentId === a.id)!;
      assert.ok(p.serviceIds.includes(service.serviceId!));
    }
  }
});

test("pagamentos da demonstração seguem a forma de cobrança", () => {
  const full = build("FULL");
  const deposit = build("DEPOSIT");
  const none = build("NONE");
  assert.ok(full.payments.some((p) => p.channel === "ONLINE"));
  assert.ok(none.payments.every((p) => p.channel === "IN_PERSON"));
  assert.ok(deposit.payments.some((p) => p.channel === "ONLINE" && p.amountCents < 4500));

  for (const { appointments, payments } of [full, deposit, none]) {
    for (const a of appointments) {
      const paid = payments.filter((p) => p.appointmentId === a.id).reduce((sum, p) => sum + p.amountCents, 0);
      assert.ok(paid <= a.totalCents);
      if (a.status === "CANCELED") assert.equal(paid, 0);
    }
    assert.ok(payments.every((p) => new Date(p.paidAt!) <= new Date("2026-10-21T15:00:00.000Z") || p.channel === "IN_PERSON"));
  }
});

test("despesas da demonstração deixam lucro e repetem aluguel e internet", () => {
  let n = 0;
  const { recurring, expenses } = buildDemoExpenses({
    shopId: "shop",
    today: "2026-10-21",
    timezone: SP,
    revenueCents: 2_000_000,
    newId: () => `r${n++}`,
  });
  const total = expenses.reduce((sum, e) => sum + e.amountCents, 0);
  assert.ok(total > 0 && total < 2_000_000 * 0.5, "despesas abaixo da metade do que entrou");
  assert.deepEqual(
    recurring.map((r) => [r.description, r.dayOfMonth, r.nextDate]),
    [
      ["Aluguel do espaço", 5, "2026-11-05"],
      ["Internet", 10, "2026-11-10"],
    ],
  );
  // Todas no passado (até hoje) e as fixas ligadas à regra.
  for (const e of expenses) assert.ok(toDateStr(new Date(e.date), SP) <= "2026-10-21");
  assert.equal(expenses.filter((e) => e.recurringId).length, 2);
});
