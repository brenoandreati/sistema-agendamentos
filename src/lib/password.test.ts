import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password";
import { decryptSecret, encryptSecret } from "./crypto";

test("confere a senha certa e recusa a errada", async () => {
  const stored = await hashPassword("minha-senha");
  assert.ok(stored.startsWith("pbkdf2$100000$"));
  assert.equal(await verifyPassword("minha-senha", stored), true);
  assert.equal(await verifyPassword("outra-senha", stored), false);
  assert.equal(await verifyPassword("minha-senha", "lixo"), false);
});

test("criptografa e descriptografa segredos", async () => {
  process.env.AUTH_SECRET = "segredo-de-teste-0123456789";
  const encrypted = await encryptSecret("APP_USR-123");
  assert.notEqual(encrypted, "APP_USR-123");
  assert.equal(await decryptSecret(encrypted), "APP_USR-123");
  assert.equal(await decryptSecret("invalido"), null);
});
