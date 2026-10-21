"use server";

import { db } from "@/lib/db";
import { createPasswordReset, requireAdmin } from "@/lib/admin";
import { appBaseUrl } from "@/lib/payments";

export type ResetLinkResult = { url?: string; hours?: number; error?: string };

/** Gera o link de senha nova para o dono de um negócio ou para uma conta de cliente. */
export async function adminCreateResetLink(target: { userId?: string; customerId?: string }): Promise<ResetLinkResult> {
  await requireAdmin();
  let reset;
  if (target.userId) {
    const user = await db.user.findUnique({ where: { id: String(target.userId) }, select: { id: true } });
    if (!user) return { error: "Conta não encontrada." };
    reset = await createPasswordReset({ userId: user.id });
  } else if (target.customerId) {
    const customer = await db.customer.findUnique({ where: { id: String(target.customerId) }, select: { id: true } });
    if (!customer) return { error: "Conta não encontrada." };
    reset = await createPasswordReset({ customerId: customer.id });
  } else {
    return { error: "Escolha a conta." };
  }
  return { url: `${await appBaseUrl()}/redefinir-senha?codigo=${reset.code}`, hours: reset.hours };
}
