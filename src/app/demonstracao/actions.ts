"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Niche } from "@prisma/client";
import { NICHE_ORDER } from "@/config/niches";
import { createSession, requireUser } from "@/lib/auth";
import { demoNicheOf, ensureDemoShop } from "@/lib/demo";
import { allWithinLimits, clientIp } from "@/lib/rate-limit";

function nicheFrom(form: FormData): Niche | null {
  const value = form.get("niche");
  return NICHE_ORDER.find((niche) => niche === value) ?? null;
}

/** Entra no painel do negócio de demonstração da área, sem login. */
export async function enterDemoPanel(form: FormData) {
  const niche = nicheFrom(form);
  if (!niche) redirect("/demonstracao");
  const { shopId, userId } = await ensureDemoShop(niche);
  await createSession({ id: userId, shopId, sessionVersion: 0 });
  redirect("/painel");
}

/** Abre a página de agendamento que o cliente vê. */
export async function openDemoBooking(form: FormData) {
  const niche = nicheFrom(form);
  if (!niche) redirect("/demonstracao");
  const { slug } = await ensureDemoShop(niche);
  redirect(`/agendar/${slug}`);
}

/** Desfaz tudo o que foi mexido na demonstração. */
export async function resetDemo() {
  const { shop } = await requireUser();
  const niche = demoNicheOf(shop);
  if (!niche) return;
  // Restaurar refaz centenas de registros: limita para ninguém sobrecarregar o banco.
  const allowed = await allWithinLimits([
    [`demo-reset:ip:${await clientIp()}`, 10, 3600],
    [`demo-reset:shop:${shop.id}`, 30, 3600],
  ]);
  if (!allowed) return;
  await ensureDemoShop(niche, { reset: true });
  revalidatePath("/painel", "layout");
}
