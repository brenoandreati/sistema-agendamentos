"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Niche } from "@prisma/client";
import { NICHE_ORDER } from "@/config/niches";
import { createSession, requireUser } from "@/lib/auth";
import { demoNicheOf, ensureDemoShop } from "@/lib/demo";

function nicheFrom(form: FormData): Niche | null {
  const value = form.get("niche");
  return NICHE_ORDER.find((niche) => niche === value) ?? null;
}

/** Entra no painel do negócio de demonstração da área, sem login. */
export async function enterDemoPanel(form: FormData) {
  const niche = nicheFrom(form);
  if (!niche) redirect("/demonstracao");
  const { shopId, userId } = await ensureDemoShop(niche);
  await createSession({ userId, shopId });
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
  await ensureDemoShop(niche, { reset: true });
  revalidatePath("/painel", "layout");
}
