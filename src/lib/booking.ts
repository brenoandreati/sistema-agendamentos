import "server-only";
import { db } from "./db";
import { addDays, weekdayOf } from "./time";

/** Negócio, serviços e profissionais disponíveis no agendamento online. */
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

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Dias que o cliente pode escolher na página de agendamento: de hoje até o limite do negócio. */
export function bookingDays(today: string, maxAdvanceDays: number) {
  return Array.from({ length: Math.min(maxAdvanceDays, 90) + 1 }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      weekday: weekdayOf(date),
      label: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : WEEKDAY_SHORT[weekdayOf(date)],
      day: date.slice(8),
      month: MONTH_SHORT[Number(date.slice(5, 7)) - 1],
    };
  });
}
