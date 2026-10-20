"use server";

import { db } from "@/lib/db";
import { createCustomerSession, destroyCustomerSession } from "@/lib/auth";
import { text } from "@/lib/action";
import { onlyDigits } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";

export type CustomerProfile = { name: string; email: string; phone: string };
export type CustomerResult = { error?: string; customer?: CustomerProfile };

const profile = (c: CustomerProfile): CustomerProfile => ({ name: c.name, email: c.email, phone: c.phone });

export async function customerSignUp(form: FormData): Promise<CustomerResult> {
  const name = text(form, "name");
  const email = text(form, "email").toLowerCase();
  const phone = onlyDigits(text(form, "phone"));
  const password = text(form, "password");

  if (name.length < 2) return { error: "Informe seu nome." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Informe um e-mail válido." };
  if (phone.length < 10 || phone.length > 13) return { error: "Informe seu WhatsApp com DDD." };
  if (password.length < 6) return { error: "A senha precisa ter pelo menos 6 caracteres." };
  if (await db.customer.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "Já existe uma conta com esse e-mail. Use a opção Entrar." };
  }

  const customer = await db.customer.create({
    data: { name, email, phone, passwordHash: await hashPassword(password) },
  });
  await createCustomerSession(customer.id);
  return { customer: profile(customer) };
}

export async function customerSignIn(form: FormData): Promise<CustomerResult> {
  const email = text(form, "email").toLowerCase();
  const password = text(form, "password");
  const customer = await db.customer.findUnique({ where: { email } });
  if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }
  await createCustomerSession(customer.id);
  return { customer: profile(customer) };
}

export async function customerSignOut() {
  await destroyCustomerSession();
}
