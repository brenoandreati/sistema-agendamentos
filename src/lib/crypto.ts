import { fromBase64Url, toBase64Url } from "./encoding";

// Criptografa segredos guardados no banco (ex.: token do Mercado Pago) com AES-256-GCM pela Web Crypto.

async function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("Defina AUTH_SECRET nas variáveis de ambiente.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`secrets:${secret}`));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(), new TextEncoder().encode(plain));
  return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(data))}`;
}

export async function decryptSecret(value: string): Promise<string | null> {
  try {
    const [iv, data] = value.split(".").map(fromBase64Url);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await key(), data);
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
