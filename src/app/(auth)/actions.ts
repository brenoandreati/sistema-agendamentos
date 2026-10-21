"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { findPasswordReset } from "@/lib/admin";
import { createCustomerSession, createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { EMAIL_RE, fail, isReservedEmail, MIN_PASSWORD, text, type ActionState } from "@/lib/action";
import { onlyDigits, slugify } from "@/lib/format";
import { defaultWorkingHours } from "@/lib/defaults";
import { allWithinLimits, clientIp, TOO_MANY } from "@/lib/rate-limit";
import { isReservedSlug } from "@/config/demo";
import { NICHES, nicheFromSlug } from "@/config/niches";

async function uniqueSlug(base: string) {
  const root = slugify(base) || "meu-negocio";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? root : `${root}-${i}`;
    if (isReservedSlug(slug)) continue;
    const taken = await db.shop.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
  }
}

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  const shopName = text(form, "shopName", 80);
  const name = text(form, "name", 80);
  const email = text(form, "email", 254).toLowerCase();
  const password = text(form, "password", 200);
  const phone = onlyDigits(text(form, "phone", 30));
  const niche = nicheFromSlug(text(form, "tipo"));

  if (!niche) return fail("Escolha a sua área de atuação.");
  if (!shopName || !name) return fail("Preencha o nome do seu negócio e o seu nome.");
  if (phone.length < 10 || phone.length > 13) return fail("Informe o WhatsApp do negócio com DDD. Os clientes usam para falar com você.");
  if (!EMAIL_RE.test(email) || isReservedEmail(email)) return fail("Informe um e-mail válido.");
  if (password.length < MIN_PASSWORD) return fail(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
  if (form.get("aceite") !== "on") return fail("Para criar a conta, aceite os termos de uso e a política de privacidade.");
  if (!(await allWithinLimits([[`signup:ip:${await clientIp()}`, 10, 3600]]))) return fail(TOO_MANY);
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return fail("Já existe uma conta com esse e-mail. Faça login.");
  }

  const passwordHash = await hashPassword(password);
  const shop = await db.shop.create({
    data: {
      niche,
      name: shopName,
      slug: await uniqueSlug(shopName),
      primaryColor: NICHES[niche].color,
      phone,
      users: { create: { name, email, passwordHash, role: "OWNER" } },
      professionals: {
        create: { name, color: NICHES[niche].color, workingHours: { create: defaultWorkingHours() } },
      },
    },
    include: { users: true, professionals: true },
  });

  await db.$transaction(
    NICHES[niche].services.map((service, sortOrder) =>
      db.service.create({
        data: {
          ...service,
          sortOrder,
          shopId: shop.id,
          professionals: { connect: shop.professionals.map((p) => ({ id: p.id })) },
        },
      }),
    ),
  );

  await createSession(shop.users[0]);
  redirect("/painel");
}

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const email = text(form, "email", 254).toLowerCase();
  const password = text(form, "password", 200);
  // Freia quem tenta adivinhar senhas: por aparelho/rede e por conta.
  const allowed = await allWithinLimits([
    [`login:ip:${await clientIp()}`, 30, 900],
    [`login:email:${email}`, 10, 900],
  ]);
  if (!allowed) return fail(TOO_MANY);
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return fail("E-mail ou senha incorretos.");
  }
  await createSession(user);
  redirect("/painel");
}

export async function signOut() {
  await destroySession();
  redirect("/entrar");
}

/** Senha nova pelo link de uso único (gerado no painel de administração). */
export async function resetPassword(_: ActionState, form: FormData): Promise<ActionState> {
  const code = text(form, "codigo", 100);
  const password = text(form, "password", 200);
  if (!(await allWithinLimits([[`reset:ip:${await clientIp()}`, 10, 3600]]))) return fail(TOO_MANY);
  if (password.length < MIN_PASSWORD) return fail(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
  if (password !== text(form, "confirm", 200)) return fail("As duas senhas não são iguais.");
  const reset = await findPasswordReset(code);
  if (!reset) return fail("Este link não vale mais. Peça um novo ao suporte.");

  const passwordHash = await hashPassword(password);
  // Marca como usado só se ninguém usou antes (dois envios ao mesmo tempo não valem duas vezes).
  const used = await db.passwordReset.updateMany({ where: { id: reset.id, usedAt: null }, data: { usedAt: new Date() } });
  if (used.count !== 1) return fail("Este link não vale mais. Peça um novo ao suporte.");
  // A senha nova desconecta todos os aparelhos que estavam logados.
  if (reset.user) {
    const user = await db.user.update({
      where: { id: reset.user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    });
    await createSession(user);
    redirect("/painel");
  }
  const customer = await db.customer.update({
    where: { id: reset.customer!.id },
    data: { passwordHash, sessionVersion: { increment: 1 } },
  });
  await createCustomerSession(customer);
  redirect("/cliente");
}
