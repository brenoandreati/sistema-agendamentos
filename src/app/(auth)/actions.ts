"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { fail, optionalText, text, type ActionState } from "@/lib/action";
import { onlyDigits, slugify } from "@/lib/format";
import { DEFAULT_SERVICES, defaultWorkingHours } from "@/lib/defaults";

async function uniqueSlug(base: string) {
  const root = slugify(base) || "barbearia";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? root : `${root}-${i}`;
    const taken = await db.shop.findUnique({ where: { slug }, select: { id: true } });
    if (!taken) return slug;
  }
}

export async function signUp(_: ActionState, form: FormData): Promise<ActionState> {
  const shopName = text(form, "shopName");
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");
  const phone = optionalText(form, "phone");

  if (!shopName || !name) return fail("Preencha o nome da barbearia e o seu nome.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Informe um e-mail válido.");
  if (password.length < 6) return fail("A senha precisa ter pelo menos 6 caracteres.");
  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return fail("Já existe uma conta com esse e-mail. Faça login.");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const shop = await db.shop.create({
    data: {
      name: shopName,
      slug: await uniqueSlug(shopName),
      phone: phone ? onlyDigits(phone) : null,
      users: { create: { name, email, passwordHash, role: "OWNER" } },
      professionals: {
        create: { name, workingHours: { create: defaultWorkingHours() } },
      },
    },
    include: { users: true, professionals: true },
  });

  await db.$transaction(
    DEFAULT_SERVICES.map((service) =>
      db.service.create({
        data: {
          ...service,
          shopId: shop.id,
          professionals: { connect: shop.professionals.map((p) => ({ id: p.id })) },
        },
      }),
    ),
  );

  await createSession({ userId: shop.users[0].id, shopId: shop.id });
  redirect("/painel");
}

export async function signIn(_: ActionState, form: FormData): Promise<ActionState> {
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return fail("E-mail ou senha incorretos.");
  }
  await createSession({ userId: user.id, shopId: user.shopId });
  redirect("/painel");
}

export async function signOut() {
  await destroySession();
  redirect("/entrar");
}
