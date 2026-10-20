import { NextResponse, type NextRequest } from "next/server";
import { eligibleProfessionals, getBookingCatalog } from "@/lib/booking";
import { getDayAvailability } from "@/lib/scheduling";
import { isDateStr } from "@/lib/time";

/** Horários livres para a página pública de agendamento. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/agendar/[slug]/horarios">) {
  const { slug } = await params;
  const query = request.nextUrl.searchParams;
  const date = query.get("data");
  const serviceIds = (query.get("servicos") ?? "").split(",").filter(Boolean);
  const professionalId = query.get("prof") ?? "any";

  const catalog = await getBookingCatalog(slug);
  if (!catalog || !isDateStr(date) || !serviceIds.length) return NextResponse.json({ slots: [] });

  const services = catalog.services.filter((s) => serviceIds.includes(s.id));
  if (services.length !== serviceIds.length) return NextResponse.json({ slots: [] });

  const candidates = eligibleProfessionals(catalog.professionals, serviceIds).filter(
    (p) => professionalId === "any" || p.id === professionalId,
  );
  const availability = await getDayAvailability({
    shop: catalog.shop,
    dateStr: date,
    durationMin: services.reduce((sum, s) => sum + s.durationMin, 0),
    professionalIds: candidates.map((p) => p.id),
    publicBooking: true,
  });

  const times = new Set(Object.values(availability).flat());
  return NextResponse.json({ slots: [...times].sort((a, b) => a - b) });
}
