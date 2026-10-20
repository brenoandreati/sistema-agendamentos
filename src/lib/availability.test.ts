import { test } from "node:test";
import assert from "node:assert/strict";
import { computeSlots } from "./availability";

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
