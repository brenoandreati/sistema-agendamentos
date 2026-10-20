"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, int, optionalText, text, type ActionState } from "@/lib/action";
import { parseMoney } from "@/lib/money";

export async function saveService(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId } = await requireUser();
  const id = text(form, "id");
  const name = text(form, "name");
  const durationMin = int(form, "durationMin");
  const priceCents = parseMoney(text(form, "price"));
  const requested = form.getAll("professionalIds").map(String);

  if (!name) return fail("Informe o nome do serviço.");
  if (!durationMin || durationMin < 5 || durationMin > 600) return fail("A duração deve ficar entre 5 e 600 minutos.");
  if (priceCents === null) return fail("Informe um preço válido. Ex.: 40,00");

  const professionals = await db.professional.findMany({
    where: { shopId, id: { in: requested } },
    select: { id: true },
  });
  const data = {
    name,
    description: optionalText(form, "description"),
    durationMin,
    priceCents,
    active: form.get("active") === "on",
  };

  if (id) {
    const existing = await db.service.findFirst({ where: { id, shopId } });
    if (!existing) return fail("Serviço não encontrado.");
    await db.service.update({ where: { id }, data: { ...data, professionals: { set: professionals } } });
  } else {
    const count = await db.service.count({ where: { shopId } });
    await db.service.create({
      data: { ...data, shopId, sortOrder: count, professionals: { connect: professionals } },
    });
  }
  revalidatePath("/painel/servicos");
  redirect("/painel/servicos");
}

export async function deleteService(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId } = await requireUser();
  const id = text(form, "id");
  const service = await db.service.findFirst({ where: { id, shopId }, include: { _count: { select: { appointments: true } } } });
  if (!service) return fail("Serviço não encontrado.");
  if (service._count.appointments > 0) {
    // Mantém o histórico dos agendamentos: só desativa.
    await db.service.update({ where: { id }, data: { active: false } });
  } else {
    await db.service.delete({ where: { id } });
  }
  revalidatePath("/painel/servicos");
  redirect("/painel/servicos");
}
