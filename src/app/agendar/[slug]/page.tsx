import { notFound } from "next/navigation";
import { getCustomer } from "@/lib/auth";
import { bookingDays, getBookingCatalog } from "@/lib/booking";
import { chargesOnline } from "@/lib/payments";
import { todayStr } from "@/lib/time";
import { BookingFlow } from "./booking-flow";

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

  const days = bookingDays(todayStr(shop.timezone), shop.maxAdvanceDays);

  return (
    <BookingFlow
      slug={shop.slug}
      customer={customer ? { name: customer.name, email: customer.email, phone: customer.phone } : null}
      payment={{
        // Sem Mercado Pago conectado, o cliente paga no local.
        paymentMode: (await chargesOnline(shop)) ? shop.paymentMode : "NONE",
        depositPercent: shop.depositPercent,
        holdMin: shop.paymentHoldMin,
      }}
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
