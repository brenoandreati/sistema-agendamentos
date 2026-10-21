import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { getBookingCatalog } from "@/lib/booking";
import { addDays, todayStr, weekdayOf } from "@/lib/time";
import { BookingFlow } from "./booking-flow";

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default async function BookingPage({ params }: PageProps<"/agendar/[slug]">) {
  const { slug } = await params;
  const [catalog, customer] = await Promise.all([getBookingCatalog(slug), getCustomer()]);
  if (!catalog) notFound();
  const { shop, services } = catalog;
  // Só aparece quem tem algum serviço ativo e horário de trabalho.
  const activeIds = new Set(services.map((s) => s.id));
  const professionals = catalog.professionals.filter(
    (p) => p.services.some((s) => activeIds.has(s.id)) && p.workingHours.length > 0,
  );

  const today = todayStr(shop.timezone);
  const days = Array.from({ length: Math.min(shop.maxAdvanceDays, 60) + 1 }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      weekday: weekdayOf(date),
      label: i === 0 ? "Hoje" : i === 1 ? "Amanhã" : WEEKDAY_SHORT[weekdayOf(date)],
      day: date.slice(8),
      month: MONTH_SHORT[Number(date.slice(5, 7)) - 1],
    };
  });

  return (
    <BookingFlow
      slug={shop.slug}
      customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null}
      payment={{ paymentMode: shop.paymentMode, depositPercent: shop.depositPercent, holdMin: shop.paymentHoldMin }}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
      }))}
      professionals={professionals.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        serviceIds: p.services.map((s) => s.id).filter((id) => activeIds.has(id)),
        weekdays: [...new Set(p.workingHours.map((h) => h.weekday))],
      }))}
      days={days}
    />
  );
}
