import { test } from "node:test";
import assert from "node:assert/strict";
import { dateInMonth, dueDates, nextMonthlyDate } from "./expenses";

test("dia da despesa fixa em meses curtos cai no último dia", () => {
  assert.equal(dateInMonth("2026-10-05", 10), "2026-10-10");
  assert.equal(dateInMonth("2027-02-01", 31), "2027-02-28");
  assert.equal(dateInMonth("2028-02-01", 30), "2028-02-29");
  assert.equal(dateInMonth("2026-04-15", 31), "2026-04-30");
});

test("próxima data mensal sempre depois da data informada", () => {
  assert.equal(nextMonthlyDate(10, "2026-10-05"), "2026-10-10");
  assert.equal(nextMonthlyDate(10, "2026-10-10"), "2026-11-10");
  assert.equal(nextMonthlyDate(31, "2027-01-31"), "2027-02-28");
  // Depois de fevereiro, volta para o dia 31.
  assert.equal(nextMonthlyDate(31, "2027-02-28"), "2027-03-31");
  assert.equal(nextMonthlyDate(5, "2026-12-20"), "2027-01-05");
});

test("despesa fixa lança só os meses que já chegaram", () => {
  assert.deepEqual(dueDates(10, "2026-11-10", "2026-10-21"), { dates: [], nextDate: "2026-11-10" });
  assert.deepEqual(dueDates(10, "2026-10-10", "2026-10-10"), { dates: ["2026-10-10"], nextDate: "2026-11-10" });
  // Ficou meses sem abrir o financeiro: lança todos de uma vez.
  assert.deepEqual(dueDates(31, "2026-12-31", "2027-03-01"), { dates: ["2026-12-31", "2027-01-31", "2027-02-28"], nextDate: "2027-03-31" });
});
