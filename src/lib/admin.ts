import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { getCurrentUser } from "./auth";
import { db } from "./db";
import { toBase64Url } from "./encoding";

/** Donos da plataforma: e-mails em ADMIN_EMAILS (separados por vírgula). */
export function isAdminEmail(email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** Só o administrador vê; para os outros a página nem existe. */
export const requireAdmin = cache(async () => {
  const user = await getCurrentUser();
  if (!user || !isAdminEmail(user.email)) notFound();
  return user;
});

export async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

const RESET_HOURS = 24;

/** Cria um link de uso único para a pessoa escolher uma senha nova. Guarda só o hash do código. */
export async function createPasswordReset(target: { userId: string } | { customerId: string }) {
  const code = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  await db.passwordReset.create({
    data: { ...target, tokenHash: await sha256(code), expiresAt: new Date(Date.now() + RESET_HOURS * 3_600_000) },
  });
  return { code, hours: RESET_HOURS };
}

/** Pedido de senha nova válido (não usado e dentro do prazo), com a conta. */
export async function findPasswordReset(code: string) {
  if (!/^[\w-]{40,50}$/.test(code)) return null;
  const reset = await db.passwordReset.findUnique({
    where: { tokenHash: await sha256(code) },
    include: { user: true, customer: true },
  });
  if (!reset || reset.usedAt || reset.expiresAt < new Date() || (!reset.user && !reset.customer)) return null;
  return reset;
}

/** WhatsApp do suporte da plataforma (SUPPORT_WHATSAPP), se configurado. */
export function supportWhatsapp() {
  const digits = (process.env.SUPPORT_WHATSAPP ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}
