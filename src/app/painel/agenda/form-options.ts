import "server-only";
import { db } from "@/lib/db";

export async function appointmentFormOptions(shopId: string) {
  const [clients, services, professionals] = await Promise.all([
    db.client.findMany({ where: { shopId }, select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    db.service.findMany({
      where: { shopId, active: true },
      select: { id: true, name: true, durationMin: true, priceCents: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.professional.findMany({ where: { shopId, active: true }, select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return { clients, services, professionals };
}
