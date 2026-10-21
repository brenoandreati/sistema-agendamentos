import { test } from "node:test";
import assert from "node:assert/strict";
import { fromBase64Url, toBase64Url } from "./encoding";
import { encryptPayload, generateVapidKeys, vapidAuthorization } from "./web-push";

const encoder = new TextEncoder();

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: string | Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const infoBytes = typeof info === "string" ? encoder.encode(info) : info;
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: infoBytes }, key, length * 8));
}

/** O que o navegador faz ao receber: abre o conteúdo com a chave privada do aparelho (RFC 8291). */
async function decryptAsBrowser(body: Uint8Array<ArrayBuffer>, ua: CryptoKeyPair, uaPublic: Uint8Array<ArrayBuffer>, auth: Uint8Array<ArrayBuffer>) {
  const salt = body.slice(0, 16);
  const rs = new DataView(body.buffer).getUint32(16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const ciphertext = body.slice(21 + idlen);
  assert.equal(rs, 4096);
  assert.equal(idlen, 65);

  const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, ua.privateKey, 256));
  const info = new Uint8Array([...encoder.encode("WebPush: info\0"), ...uaPublic, ...asPublic]);
  const ikm = await hkdf(auth, ecdh, info, 32);
  const cek = await hkdf(salt, ikm, "Content-Encoding: aes128gcm\0", 16);
  const nonce = await hkdf(salt, ikm, "Content-Encoding: nonce\0", 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ciphertext));
  assert.equal(plain.at(-1), 2); // delimitador do último registro
  return new TextDecoder().decode(plain.slice(0, -1));
}

test("notificação criptografada só abre no aparelho de destino", async () => {
  const ua = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", ua.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const message = JSON.stringify({ title: "Novo agendamento", body: "Maria · Corte · amanhã às 14:00" });

  const body = await encryptPayload({ p256dh: toBase64Url(uaPublic), auth: toBase64Url(auth) }, encoder.encode(message));
  assert.equal(await decryptAsBrowser(body, ua, uaPublic, auth), message);

  // Com outro segredo de autenticação, não abre.
  await assert.rejects(decryptAsBrowser(body, ua, uaPublic, crypto.getRandomValues(new Uint8Array(16))));
});

test("cabeçalho VAPID é um JWT ES256 válido para o serviço de push", async () => {
  const keys = { ...(await generateVapidKeys()), subject: "https://arvan.example" };
  const header = await vapidAuthorization("https://fcm.googleapis.com/fcm/send/abc", keys, Date.UTC(2026, 9, 21));
  const [, token, k] = /^vapid t=([^,]+), k=(.+)$/.exec(header)!;
  assert.equal(k, keys.publicKey);

  const [head, payload, signature] = token.split(".");
  const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
  assert.equal(claims.aud, "https://fcm.googleapis.com");
  assert.equal(claims.sub, "https://arvan.example");
  assert.equal(claims.exp, Date.UTC(2026, 9, 21) / 1000 + 12 * 3600);

  const publicKey = await crypto.subtle.importKey("raw", fromBase64Url(keys.publicKey), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    fromBase64Url(signature),
    encoder.encode(`${head}.${payload}`),
  );
  assert.ok(valid);
});
