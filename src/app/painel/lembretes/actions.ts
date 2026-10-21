"use server";

import { revalidatePath } from "next/cache";
import { agendaScope, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** Marca que o lembrete foi enviado (o WhatsApp abre no aparelho de quem tocou no botão). */
export async function markReminderSent(appointmentId: string) {
  const user = await requireUser();
  await db.appointment.updateMany({
    where: { id: String(appointmentId), shopId: user.shopId, ...agendaScope(user) },
    data: { reminderSentAt: new Date() },
  });
  revalidatePath("/painel", "layout");
}
