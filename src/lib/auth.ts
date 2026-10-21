import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { db } from "./db";

// Dois logins separados: o do dono do negócio (painel) e o do cliente que agenda (opcional).
const OWNER_COOKIE = "session";
const CUSTOMER_COOKIE = "cliente";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type Session = { userId: string; shopId: string; version: number };

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("Defina AUTH_SECRET (mínimo de 16 caracteres) no arquivo .env");
  }
  return new TextEncoder().encode(secret);
}

async function writeToken(cookie: string, payload: JWTPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  (await cookies()).set(cookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

async function readToken(cookie: string): Promise<JWTPayload | null> {
  const token = (await cookies()).get(cookie)?.value;
  if (!token) return null;
  try {
    return (await jwtVerify(token, secretKey())).payload;
  } catch {
    return null;
  }
}

export async function createSession(user: { id: string; shopId: string; sessionVersion: number }) {
  await writeToken(OWNER_COOKIE, { userId: user.id, shopId: user.shopId, v: user.sessionVersion, kind: "owner" });
}

export async function destroySession() {
  (await cookies()).delete(OWNER_COOKIE);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const payload = await readToken(OWNER_COOKIE);
  if (payload?.kind !== "owner" || typeof payload.userId !== "string" || typeof payload.shopId !== "string") return null;
  return { userId: payload.userId, shopId: payload.shopId, version: typeof payload.v === "number" ? payload.v : 0 };
});

/**
 * Usuário logado com o negócio dele, ou null. Confere no banco: se a senha mudou depois
 * do login (sessionVersion), o login antigo não vale mais. Login de profissional só vale
 * enquanto o profissional estiver ativo.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { shop: true, professional: { select: { id: true, name: true, active: true } } },
  });
  if (!user || user.shopId !== session.shopId || user.sessionVersion !== session.version) return null;
  if (user.role === "STAFF" && !user.professional?.active) return null;
  return user;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** Usuário logado com o negócio dele. Redireciona para o login se não houver sessão. */
export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  return user;
});

export function isOwner(user: { role: string }) {
  return user.role === "OWNER";
}

/** Só o dono do negócio. O profissional da equipe vai para a agenda dele. */
export const requireOwner = cache(async () => {
  const user = await requireUser();
  if (!isOwner(user)) redirect("/painel/agenda");
  return user;
});

/**
 * Filtro dos agendamentos e bloqueios que o usuário pode ver e mexer:
 * o dono vê o negócio inteiro; o profissional, só a própria agenda.
 */
export function agendaScope(user: { role: string; professionalId: string | null }): { professionalId?: string } {
  if (isOwner(user)) return {};
  // Sem profissional ligado, não vê nada (não deveria acontecer: getCurrentUser já barra).
  return { professionalId: user.professionalId ?? "-" };
}

export async function createCustomerSession(customer: { id: string; sessionVersion: number }) {
  await writeToken(CUSTOMER_COOKIE, { customerId: customer.id, v: customer.sessionVersion, kind: "customer" });
}

export async function destroyCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

/** Cliente logado (conta opcional de quem agenda), ou null. */
export const getCustomer = cache(async () => {
  const payload = await readToken(CUSTOMER_COOKIE);
  if (payload?.kind !== "customer" || typeof payload.customerId !== "string") return null;
  const customer = await db.customer.findUnique({
    where: { id: payload.customerId },
    select: { id: true, name: true, email: true, phone: true, sessionVersion: true },
  });
  const version = typeof payload.v === "number" ? payload.v : 0;
  if (!customer || customer.sessionVersion !== version) return null;
  return { id: customer.id, name: customer.name, email: customer.email, phone: customer.phone };
});
