import { test } from "node:test";
import assert from "node:assert/strict";
import { periodRange } from "./period";

test("semana vai de segunda a domingo", () => {
  const range = periodRange("semana", "2026-10-22");
  assert.equal(range.start, "2026-10-19");
  assert.equal(range.end, "2026-10-26");
  assert.equal(range.buckets.length, 7);
  assert.equal(range.buckets[0].label, "Seg 19");
  assert.equal(range.prev, "2026-10-12");
});

test("mês tem uma barra por dia", () => {
  const range = periodRange("mes", "2026-02-10");
  assert.equal(range.start, "2026-02-01");
  assert.equal(range.end, "2026-03-01");
  assert.equal(range.buckets.length, 28);
  assert.equal(range.title, "Fevereiro de 2026");
});

test("ano agrupa por mês", () => {
  const range = periodRange("ano", "2026-10-20");
  assert.equal(range.start, "2026-01-01");
  assert.equal(range.end, "2027-01-01");
  assert.equal(range.buckets.length, 12);
  assert.equal(range.bucketKey("2026-10-20"), "2026-10");
});
