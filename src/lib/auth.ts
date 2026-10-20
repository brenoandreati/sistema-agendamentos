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

type Session = { userId: string; shopId: string };

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

export async function createSession(session: Session) {
  await writeToken(OWNER_COOKIE, { ...session, kind: "owner" });
}

export async function destroySession() {
  (await cookies()).delete(OWNER_COOKIE);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const payload = await readToken(OWNER_COOKIE);
  if (payload?.kind !== "owner" || typeof payload.userId !== "string" || typeof payload.shopId !== "string") return null;
  return { userId: payload.userId, shopId: payload.shopId };
});

/** Usuário logado com o negócio dele. Redireciona para o login se não houver sessão. */
export const requireUser = cache(async () => {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { shop: true },
  });
  if (!user || user.shopId !== session.shopId) redirect("/entrar");
  return user;
});

export async function createCustomerSession(customerId: string) {
  await writeToken(CUSTOMER_COOKIE, { customerId, kind: "customer" });
}

export async function destroyCustomerSession() {
  (await cookies()).delete(CUSTOMER_COOKIE);
}

/** Cliente logado (conta opcional de quem agenda), ou null. */
export const getCustomer = cache(async () => {
  const payload = await readToken(CUSTOMER_COOKIE);
  if (payload?.kind !== "customer" || typeof payload.customerId !== "string") return null;
  return db.customer.findUnique({
    where: { id: payload.customerId },
    select: { id: true, name: true, email: true, phone: true },
  });
});
