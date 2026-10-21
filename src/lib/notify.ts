import "server-only";
import { after } from "next/server";
import { db } from "./db";
import { serviceNames } from "./queries";
import { formatDateShort, formatTime, toDateStr } from "./time";
import { sendWebPush, type PushTarget, type VapidKeys } from "./web-push";

/** Serviços de push dos navegadores. O servidor só envia para eles (nunca para um endereço qualquer). */
const PUSH_HOSTS = ["fcm.googleapis.com", "android.googleapis.com", "push.services.mozilla.com", "push.apple.com", "notify.windows.com"];

export function isPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
  } catch {
    return false;
  }
}

export function pushPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function vapidKeys(): VapidKeys | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: process.env.APP_URL || "https://localhost" };
}

type Message = { title: string; body: string; url: string; tag?: string };

async function deliver(subscriptions: (PushTarget & { id: string })[], message: Message) {
  const keys = vapidKeys();
  if (!keys) return;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const status = await sendWebPush(subscription, message, keys);
        // 404/410: o aparelho cancelou os avisos ou não existe mais.
        if (status === 404 || status === 410) {
          await db.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
        } else if (status >= 400) {
          console.error("Serviço de push recusou o aviso", status);
        }
      } catch (error) {
        console.error("Falha ao enviar aviso", error);
      }
    }),
  );
}

/** Avisa todos os aparelhos do dono do negócio. */
export async function notifyShop(shopId: string, message: Message) {
  const subscriptions = await db.pushSubscription.findMany({ where: { user: { shopId } } });
  await deliver(subscriptions, message);
}

/** Avisa só os aparelhos de um usuário (usado no teste de aviso). */
export async function notifyUser(userId: string, message: Message) {
  const subscriptions = await db.pushSubscription.findMany({ where: { userId } });
  await deliver(subscriptions, message);
  return subscriptions.length;
}

const TITLES = {
  new: "Novo agendamento",
  paid: "Novo agendamento pago",
  canceled: "Cliente cancelou um horário",
  "paid-no-slot": "Pagamento recebido sem horário",
};

/** Avisa o dono sobre um agendamento, depois de responder ao cliente (não atrasa a tela dele). */
export function notifyAppointmentLater(appointmentId: string, kind: keyof typeof TITLES) {
  after(async () => {
    try {
      const appointment = await db.appointment.findUnique({
        where: { id: appointmentId },
        include: { client: true, professional: true, services: true, shop: { select: { id: true, isDemo: true, timezone: true } } },
      });
      if (!appointment || appointment.shop.isDemo) return;
      const tz = appointment.shop.timezone;
      const when = `${formatDateShort(toDateStr(appointment.startAt, tz))} às ${formatTime(appointment.startAt, tz)}`;
      await notifyShop(appointment.shop.id, {
        title: TITLES[kind],
        body:
          kind === "paid-no-slot"
            ? `${appointment.client.name} pagou, mas o horário de ${when} não está mais livre. Devolva o valor ou remarque.`
            : `${appointment.client.name} · ${serviceNames(appointment)}\n${when} · com ${appointment.professional.name}`,
        url: `/painel/agendamentos/${appointment.id}`,
        tag: appointment.id,
      });
    } catch (error) {
      console.error("Falha ao avisar o negócio", error);
    }
  });
}
