import "server-only";
import { headers } from "next/headers";
import { db } from "./db";

export const TOO_MANY = "Muitas tentativas seguidas. Espere alguns minutos e tente de novo.";

/** IP de quem fez o pedido. No Cloudflare vem em cf-connecting-ip. */
export async function clientIp() {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}

/**
 * Conta uma tentativa e diz se ainda está dentro do limite: no máximo `limit` tentativas
 * a cada `windowSec` segundos para a mesma chave (ex.: "login:email:ana@x.com").
 */
export async function withinLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  const windowMs = windowSec * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" = EXCLUDED."windowStart" THEN "RateLimit"."count" + 1 ELSE 1 END,
      "windowStart" = EXCLUDED."windowStart"
    RETURNING "count"`;
  // De vez em quando, apaga contadores antigos.
  if (Math.random() < 0.02) await db.$executeRaw`DELETE FROM "RateLimit" WHERE "windowStart" < now() - interval '1 day'`;
  return Number(rows[0]?.count ?? 0) <= limit;
}

/** Vários limites de uma vez (ex.: por IP e por e-mail). Conta todos. */
export async function allWithinLimits(checks: [key: string, limit: number, windowSec: number][]) {
  const results = await Promise.all(checks.map(([key, limit, windowSec]) => withinLimit(key, limit, windowSec)));
  return results.every(Boolean);
}
