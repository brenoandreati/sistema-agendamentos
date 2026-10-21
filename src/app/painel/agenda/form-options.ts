import "server-only";
import { db } from "@/lib/db";

/**
 * Opções do formulário de agendamento. Para o profissional da equipe (`professionalId`),
 * só ele aparece na lista e só os clientes que ele já atendeu.
 */
export async function appointmentFormOptions(shopId: string, scope: { professionalId?: string } = {}) {
  const [clients, services, professionals] = await Promise.all([
    db.client.findMany({
      where: { shopId, ...(scope.professionalId ? { appointments: { some: { professionalId: scope.professionalId } } } : {}) },
      select: { id: true, name: true, phone: true },
      orderBy: { name: "asc" },
    }),
    db.service.findMany({
      where: { shopId, active: true },
      select: { id: true, name: true, durationMin: true, priceCents: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.professional.findMany({
      where: { shopId, active: true, ...(scope.professionalId ? { id: scope.professionalId } : {}) },
      select: { id: true, name: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  return { clients, services, professionals };
}
