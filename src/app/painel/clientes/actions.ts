"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, optionalText, text, type ActionState } from "@/lib/action";
import { onlyDigits } from "@/lib/format";

export async function saveClient(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId } = await requireUser();
  const id = text(form, "id");
  const name = text(form, "name");
  const phone = onlyDigits(text(form, "phone"));
  if (!name) return fail("Informe o nome do cliente.");
  if (phone.length < 10) return fail("Informe o telefone com DDD.");

  const duplicate = await db.client.findUnique({ where: { shopId_phone: { shopId, phone } } });
  if (duplicate && duplicate.id !== id) return fail(`Esse telefone já está cadastrado para ${duplicate.name}.`);

  const data = { name, phone, email: optionalText(form, "email"), notes: optionalText(form, "notes") };
  let clientId = id;
  if (id) {
    const existing = await db.client.findFirst({ where: { id, shopId } });
    if (!existing) return fail("Cliente não encontrado.");
    await db.client.update({ where: { id }, data });
  } else {
    clientId = (await db.client.create({ data: { ...data, shopId } })).id;
  }
  revalidatePath("/painel/clientes");
  if (id) return { ok: true, message: "Dados do cliente salvos." };
  redirect(`/painel/clientes/${clientId}`);
}

export async function deleteClient(_: ActionState, form: FormData): Promise<ActionState> {
  const { shopId } = await requireUser();
  const id = text(form, "id");
  const client = await db.client.findFirst({ where: { id, shopId }, include: { _count: { select: { appointments: true } } } });
  if (!client) return fail("Cliente não encontrado.");
  if (client._count.appointments > 0) {
    // Com histórico, os atendimentos e pagamentos ficam, mas sem nome, telefone, e-mail e observações.
    await db.client.update({
      where: { id },
      data: { name: "Cliente removido", phone: `removido-${client.id}`, email: null, notes: null },
    });
  } else {
    await db.client.delete({ where: { id } });
  }
  revalidatePath("/painel/clientes");
  redirect("/painel/clientes");
}
