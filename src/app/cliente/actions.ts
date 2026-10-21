"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createCustomerSession, destroyCustomerSession, getCustomer } from "@/lib/auth";
import { EMAIL_RE, isReservedEmail, MIN_PASSWORD, text } from "@/lib/action";
import { onlyDigits } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";
import { allWithinLimits, clientIp, TOO_MANY } from "@/lib/rate-limit";

export type CustomerProfile = { name: string; email: string; phone: string };
export type CustomerResult = { error?: string; customer?: CustomerProfile };

const profile = (c: CustomerProfile): CustomerProfile => ({ name: c.name, email: c.email, phone: c.phone });

export async function customerSignUp(form: FormData): Promise<CustomerResult> {
  const name = text(form, "name", 80);
  const email = text(form, "email", 254).toLowerCase();
  const phone = onlyDigits(text(form, "phone", 30));
  const password = text(form, "password", 200);

  if (name.length < 2) return { error: "Informe seu nome." };
  if (!EMAIL_RE.test(email) || isReservedEmail(email)) return { error: "Informe um e-mail válido." };
  if (phone.length < 10 || phone.length > 13) return { error: "Informe seu WhatsApp com DDD." };
  if (password.length < MIN_PASSWORD) return { error: `A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.` };
  if (form.get("aceite") !== "on") return { error: "Para criar a conta, aceite os termos de uso e a política de privacidade." };
  if (!(await allWithinLimits([[`customer-signup:ip:${await clientIp()}`, 10, 3600]]))) return { error: TOO_MANY };
  if (await db.customer.findUnique({ where: { email }, select: { id: true } })) {
    return { error: "Já existe uma conta com esse e-mail. Use a opção Entrar." };
  }

  const customer = await db.customer.create({
    data: { name, email, phone, passwordHash: await hashPassword(password) },
  });
  await createCustomerSession(customer);
  return { customer: profile(customer) };
}

export async function customerSignIn(form: FormData): Promise<CustomerResult> {
  const email = text(form, "email", 254).toLowerCase();
  const password = text(form, "password", 200);
  const allowed = await allWithinLimits([
    [`customer-login:ip:${await clientIp()}`, 30, 900],
    [`customer-login:email:${email}`, 10, 900],
  ]);
  if (!allowed) return { error: TOO_MANY };
  const customer = await db.customer.findUnique({ where: { email } });
  if (!customer || !(await verifyPassword(password, customer.passwordHash))) {
    return { error: "E-mail ou senha incorretos." };
  }
  await createCustomerSession(customer);
  return { customer: profile(customer) };
}

export async function customerSignOut() {
  await destroyCustomerSession();
}

/**
 * Apaga a conta de cliente. Os horários continuam com os negócios onde foram marcados
 * (eles precisam do histórico), mas deixam de ficar ligados à conta.
 */
export async function customerDeleteAccount(form: FormData) {
  const customer = await getCustomer();
  if (!customer) redirect("/cliente");
  if (form.get("confirmar") !== "on") redirect("/cliente?excluir=confirme");
  await db.customer.delete({ where: { id: customer.id } });
  await destroyCustomerSession();
  redirect("/cliente?excluida=1");
}
