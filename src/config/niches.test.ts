import { test } from "node:test";
import assert from "node:assert/strict";
import { NICHE_ORDER, NICHES, nicheFromSlug } from "./niches";

test("cada área tem endereço próprio e serviços padrão", () => {
  assert.equal(nicheFromSlug("cabeleireira"), "HAIR");
  assert.equal(nicheFromSlug("nail-designer"), "NAILS");
  assert.equal(nicheFromSlug("qualquer-coisa"), null);
  assert.equal(new Set(NICHE_ORDER.map((n) => NICHES[n].slug)).size, NICHE_ORDER.length);
  for (const niche of NICHE_ORDER) assert.ok(NICHES[niche].services.length > 0);
});
