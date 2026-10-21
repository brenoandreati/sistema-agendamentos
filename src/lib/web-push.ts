// Notificações do navegador (Web Push) só com Web Crypto, para rodar no Cloudflare Workers.
// Criptografia do conteúdo: RFC 8291 (aes128gcm). Identificação do servidor: VAPID (RFC 8292).
import { fromBase64Url, toBase64Url } from "./encoding";

export type PushTarget = { endpoint: string; p256dh: string; auth: string };
export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

const encoder = new TextEncoder();

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

/** Chaves novas para o servidor (rode uma vez e guarde nos segredos). */
export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", pair.publicKey));
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { publicKey: toBase64Url(publicKey), privateKey: jwk.d! };
}

/** Criptografa o conteúdo para o aparelho (só ele consegue abrir). */
export async function encryptPayload(
  target: Pick<PushTarget, "p256dh" | "auth">,
  payload: Uint8Array<ArrayBuffer>,
  options: { salt?: Uint8Array<ArrayBuffer>; localKeys?: CryptoKeyPair } = {},
) {
  const uaPublic = fromBase64Url(target.p256dh);
  const authSecret = fromBase64Url(target.auth);
  const local =
    options.localKeys ??
    ((await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", local.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, local.privateKey, 256));

  const ikm = await hkdf(authSecret, ecdhSecret, concat(encoder.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, encoder.encode("Content-Encoding: nonce\0"), 12);

  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  // Um registro só: conteúdo + delimitador 0x02.
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, concat(payload, new Uint8Array([2]))));

  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  return concat(header, asPublic, ciphertext);
}

/** Cabeçalho Authorization do VAPID, assinado com a chave privada do servidor. */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, now = Date.now()) {
  const publicBytes = fromBase64Url(keys.publicKey);
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: keys.privateKey,
      x: toBase64Url(publicBytes.slice(1, 33)),
      y: toBase64Url(publicBytes.slice(33, 65)),
      ext: true,
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const json = (value: object) => toBase64Url(encoder.encode(JSON.stringify(value)));
  const unsigned = `${json({ typ: "JWT", alg: "ES256" })}.${json({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 60 * 60,
    sub: keys.subject,
  })}`;
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, privateKey, encoder.encode(unsigned)),
  );
  return `vapid t=${unsigned}.${toBase64Url(signature)}, k=${keys.publicKey}`;
}

/** Envia uma notificação. Devolve o status HTTP do serviço de push (404/410 = aparelho não existe mais). */
export async function sendWebPush(target: PushTarget, data: object, keys: VapidKeys, ttlSeconds = 24 * 60 * 60) {
  const body = await encryptPayload(target, encoder.encode(JSON.stringify(data)));
  const response = await fetch(target.endpoint, {
    method: "POST",
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, keys),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: String(ttlSeconds),
      Urgency: "high",
    },
    body,
  });
  return response.status;
}
