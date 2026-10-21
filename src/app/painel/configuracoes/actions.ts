"use server";

import { revalidatePath } from "next/cache";
import type { Niche } from "@prisma/client";
import { db } from "@/lib/db";
import { isReservedSlug } from "@/config/demo";
import { NICHE_ORDER } from "@/config/niches";
import { requireUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { hashPassword, verifyPassword } from "@/lib/password";
import { fail, int, optionalText, text, type ActionState } from "@/lib/action";
import { isHexColor, onlyDigits, slugify } from "@/lib/format";
import { getAccount, MercadoPagoError } from "@/lib/mercadopago";

const saved: ActionState = { ok: true, message: "Alterações salvas." };
const DEMO_LOCKED = "Na demonstração essa configuração não pode ser alterada.";

export async function saveShopInfo(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId, shop } = await requireUser();
  if (shop.isDemo) return fail(DEMO_LOCKED);
  const name = text(form, "name");
  const slug = slugify(text(form, "slug"));
  const phone = optionalText(form, "phone");
  if (!name) return fail("Informe o nome do seu negócio.");
  if (slug.length < 3) return fail("O endereço do link precisa ter pelo menos 3 letras ou números.");
  if (isReservedSlug(slug)) return fail("Esse endereço de link já está em uso. Escolha outro.");
  const taken = await db.shop.findUnique({ where: { slug }, select: { id: true } });
  if (taken && taken.id !== shopId) return fail("Esse endereço de link já está em uso. Escolha outro.");

  await db.shop.update({
    where: { id: shopId },
    data: {
      name,
      slug,
      phone: phone ? onlyDigits(phone) : null,
      address: optionalText(form, "address"),
      instagram: optionalText(form, "instagram")?.replace(/^@/, "") ?? null,
    },
  });
  revalidatePath("/", "layout");
  return saved;
}

const MAX_LOGO_BYTES = 300 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function saveAppearance(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId, shop } = await requireUser();
  if (shop.isDemo) return fail(DEMO_LOCKED);
  const color = text(form, "primaryColor");
  const niche = text(form, "niche") as Niche;
  if (!isHexColor(color)) return fail("Escolha uma cor válida.");
  if (!NICHE_ORDER.includes(niche)) return fail("Escolha a área de atuação.");

  let logoUrl: string | null | undefined;
  const file = form.get("logo");
  if (form.get("removeLogo") === "on") {
    logoUrl = null;
  } else if (file instanceof File && file.size > 0) {
    if (!LOGO_TYPES.includes(file.type)) return fail("O logo precisa ser uma imagem PNG, JPG ou WebP.");
    if (file.size > MAX_LOGO_BYTES) return fail("O logo precisa ter no máximo 300 KB.");
    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    logoUrl = `data:${file.type};base64,${base64}`;
  }

  await db.shop.update({ where: { id: shopId }, data: { niche, primaryColor: color, ...(logoUrl !== undefined ? { logoUrl } : {}) } });
  revalidatePath("/", "layout");
  return saved;
}

export async function saveScheduleRules(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId, shop } = await requireUser();
  if (shop.isDemo) return fail(DEMO_LOCKED);
  const slotIntervalMin = int(form, "slotIntervalMin");
  const minNoticeMin = int(form, "minNoticeMin");
  const maxAdvanceDays = int(form, "maxAdvanceDays");
  if (!slotIntervalMin || slotIntervalMin < 5 || slotIntervalMin > 120) return fail("Intervalo da agenda inválido.");
  if (minNoticeMin === null || minNoticeMin < 0) return fail("Antecedência mínima inválida.");
  if (!maxAdvanceDays || maxAdvanceDays < 1 || maxAdvanceDays > 365) return fail("O limite de dias deve ficar entre 1 e 365.");
  await db.shop.update({ where: { id: shopId }, data: { slotIntervalMin, minNoticeMin, maxAdvanceDays } });
  revalidatePath("/painel/configuracoes");
  return saved;
}

export async function savePaymentSettings(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId, shop } = await requireUser();
  if (shop.isDemo) return fail(DEMO_LOCKED);
  const mode = text(form, "paymentMode");
  const depositPercent = int(form, "depositPercent");
  const paymentHoldMin = int(form, "paymentHoldMin");
  if (mode !== "FULL" && mode !== "DEPOSIT" && mode !== "NONE") return fail("Escolha como o cliente paga.");
  if (mode === "DEPOSIT" && (!depositPercent || depositPercent < 5 || depositPercent > 100)) {
    return fail("O sinal deve ficar entre 5% e 100%.");
  }
  if (!paymentHoldMin || paymentHoldMin < 5 || paymentHoldMin > 120) return fail("Tempo de reserva inválido.");

  let mpAccessToken: string | null | undefined;
  const token = text(form, "mpAccessToken");
  if (form.get("removeToken") === "on") {
    mpAccessToken = null;
  } else if (token) {
    try {
      await getAccount(token);
    } catch (error) {
      return fail(
        error instanceof MercadoPagoError
          ? "O Mercado Pago recusou esse token. Confira se copiou o Access Token de produção completo."
          : "Não foi possível falar com o Mercado Pago agora. Tente de novo em instantes.",
      );
    }
    mpAccessToken = await encryptSecret(token);
  }

  await db.shop.update({
    where: { id: shopId },
    data: {
      paymentMode: mode,
      depositPercent: depositPercent ?? 30,
      paymentHoldMin,
      ...(mpAccessToken !== undefined ? { mpAccessToken } : {}),
    },
  });
  revalidatePath("/painel/configuracoes");
  return saved;
}

export async function changePassword(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (user.shop.isDemo) return fail(DEMO_LOCKED);
  const current = text(form, "current");
  const next = text(form, "next");
  if (!(await verifyPassword(current, user.passwordHash))) return fail("A senha atual está incorreta.");
  if (next.length < 6) return fail("A nova senha precisa ter pelo menos 6 caracteres.");
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: true, message: "Senha alterada." };
}
