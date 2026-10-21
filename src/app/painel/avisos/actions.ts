"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isPushEndpoint, notifyUser } from "@/lib/notify";

type Result = { ok?: boolean; error?: string };

/** Guarda o aparelho que vai receber os avisos de agendamento. */
export async function savePushSubscription(subscription: { endpoint?: string; keys?: { p256dh?: string; auth?: string } }): Promise<Result> {
  const user = await requireUser();
  if (user.shop.isDemo) return { error: "Na demonstração os avisos ficam desligados." };
  const endpoint = String(subscription.endpoint ?? "");
  const p256dh = String(subscription.keys?.p256dh ?? "");
  const auth = String(subscription.keys?.auth ?? "");
  if (endpoint.length > 1000 || !isPushEndpoint(endpoint) || !/^[\w-]{80,100}$/.test(p256dh) || !/^[\w-]{16,30}$/.test(auth)) {
    return { error: "Este navegador não funcionou para os avisos. Tente pelo Chrome ou pelo app instalado." };
  }
  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { userId: user.id, p256dh, auth },
    create: { userId: user.id, endpoint, p256dh, auth },
  });
  return { ok: true };
}

export async function removePushSubscription(endpoint: string): Promise<Result> {
  const user = await requireUser();
  await db.pushSubscription.deleteMany({ where: { endpoint: String(endpoint), userId: user.id } });
  return { ok: true };
}

export async function sendTestPush(): Promise<Result> {
  const user = await requireUser();
  const sent = await notifyUser(user.id, {
    title: "Avisos ligados",
    body: "Tudo certo! Você vai receber um aviso a cada agendamento novo.",
    url: "/painel",
  });
  return sent ? { ok: true } : { error: "Nenhum aparelho com avisos ligados." };
}
