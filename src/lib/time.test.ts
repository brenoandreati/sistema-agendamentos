import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, isDateStr, minutesOfDay, startOfWeek, toDateStr, weekdayOf, zonedToUtc } from "./time";
import { parseMoney } from "./money";

const SP = "America/Sao_Paulo";

test("converte horário de São Paulo para UTC", () => {
  assert.equal(zonedToUtc("2026-10-20", 9 * 60, SP).toISOString(), "2026-10-20T12:00:00.000Z");
});

test("volta de UTC para data e minutos locais", () => {
  const date = new Date("2026-10-21T02:30:00.000Z");
  assert.equal(toDateStr(date, SP), "2026-10-20");
  assert.equal(minutesOfDay(date, SP), 23 * 60 + 30);
});

test("aritmética de datas", () => {
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(weekdayOf("2026-10-20"), 2);
  assert.equal(startOfWeek("2026-10-25"), "2026-10-19");
  assert.equal(startOfWeek("2026-10-19"), "2026-10-19");
  assert.ok(isDateStr("2026-02-28"));
  assert.ok(!isDateStr("2026-02-30"));
});

test("lê valores em reais", () => {
  assert.equal(parseMoney("40"), 4000);
  assert.equal(parseMoney("40,5"), 4050);
  assert.equal(parseMoney("R$ 1.234,56"), 123456);
  assert.equal(parseMoney("40.50"), 4050);
  assert.equal(parseMoney("abc"), null);
  assert.equal(parseMoney(""), null);
});

test("calendário do mês começa no domingo e fecha a última semana", async () => {
  const { monthGrid } = await import("./time");
  const weeks = monthGrid("2026-10-01");
  assert.equal(weeks[0][0], "2026-09-27");
  assert.equal(weeks.at(-1)!.at(-1), "2026-10-31");
  assert.ok(weeks.every((w) => w.length === 7));
  assert.equal(monthGrid("2026-02-01").length, 4);
});
