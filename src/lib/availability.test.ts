import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSlots, earliestStartOn } from "./availability";

const day = [{ start: 9 * 60, end: 12 * 60 }];

test("oferece a grade inteira quando a agenda está livre", () => {
  const slots = computeSlots({ working: day, busy: [], duration: 30, step: 30 });
  assert.deepEqual(slots, [540, 570, 600, 630, 660, 690]);
});

test("não deixa o atendimento passar do fim do expediente", () => {
  const slots = computeSlots({ working: day, busy: [], duration: 60, step: 30 });
  assert.equal(slots.at(-1), 660);
});

test("pula horários que colidem com agendamentos", () => {
  const slots = computeSlots({
    working: day,
    busy: [{ start: 600, end: 630 }],
    duration: 30,
    step: 30,
  });
  assert.deepEqual(slots, [540, 570, 630, 660, 690]);
});

test("oferece o horário logo depois de um atendimento fora da grade", () => {
  const slots = computeSlots({
    working: day,
    busy: [{ start: 540, end: 585 }],
    duration: 30,
    step: 30,
  });
  assert.ok(slots.includes(585));
  assert.ok(!slots.includes(570));
});

test("respeita a antecedência mínima", () => {
  const slots = computeSlots({ working: day, busy: [], duration: 30, step: 30, earliestStart: 615 });
  assert.deepEqual(slots, [630, 660, 690]);
});

test("considera mais de um período no dia (almoço)", () => {
  const slots = computeSlots({
    working: [
      { start: 540, end: 600 },
      { start: 660, end: 720 },
    ],
    busy: [],
    duration: 30,
    step: 30,
  });
  assert.deepEqual(slots, [540, 570, 660, 690]);
});

test("sem expediente não há horários", () => {
  assert.deepEqual(computeSlots({ working: [], busy: [], duration: 30, step: 30 }), []);
});

test("antecedência mínima vale também para os próximos dias", () => {
  const SP = "America/Sao_Paulo";
  const noite = new Date("2026-10-20T23:00:00.000Z"); // 20h em São Paulo
  // 1 dia de antecedência: amanhã só a partir das 20h, depois de amanhã livre.
  assert.equal(earliestStartOn("2026-10-20", noite, 1440, SP), null);
  assert.equal(earliestStartOn("2026-10-21", noite, 1440, SP), 20 * 60);
  assert.equal(earliestStartOn("2026-10-22", noite, 1440, SP), undefined);
  // 12 horas às 22h: amanhã a partir das 10h.
  assert.equal(earliestStartOn("2026-10-21", new Date("2026-10-21T01:00:00.000Z"), 720, SP), 10 * 60);
  // Sem antecedência: hoje a partir de agora.
  assert.equal(earliestStartOn("2026-10-20", noite, 0, SP), 20 * 60);
});
