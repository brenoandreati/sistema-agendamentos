import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE = "session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type Session = { userId: string; shopId: string };

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("Defina AUTH_SECRET (mínimo de 16 caracteres) no arquivo .env");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(session: Session) {
  const token = await new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (typeof payload.userId !== "string" || typeof payload.shopId !== "string") return null;
    return { userId: payload.userId, shopId: payload.shopId };
  } catch {
    return null;
  }
});

/** Usuário logado com a barbearia. Redireciona para o login se não houver sessão. */
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
