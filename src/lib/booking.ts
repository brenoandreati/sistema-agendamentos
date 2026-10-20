import "server-only";
import { db } from "./db";

/** Barbearia, serviços e profissionais disponíveis no agendamento online. */
export async function getBookingCatalog(slug: string) {
  const shop = await db.shop.findUnique({ where: { slug } });
  if (!shop) return null;
  const [services, professionals] = await Promise.all([
    db.service.findMany({
      where: { shopId: shop.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.professional.findMany({
      where: { shopId: shop.id, active: true, bookableOnline: true },
      orderBy: { sortOrder: "asc" },
      include: { services: { select: { id: true } }, workingHours: { select: { weekday: true } } },
    }),
  ]);
  return { shop, services, professionals };
}

/** Profissionais que fazem todos os serviços escolhidos. */
export function eligibleProfessionals<T extends { services: { id: string }[] }>(professionals: T[], serviceIds: string[]) {
  return professionals.filter((p) => serviceIds.every((id) => p.services.some((s) => s.id === id)));
}
