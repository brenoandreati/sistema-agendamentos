import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getDayAvailability } from "@/lib/scheduling";
import { isDateStr } from "@/lib/time";

/** Horários livres de um profissional para o formulário de agendamento do painel. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const date = params.get("data");
  const professionalId = params.get("prof") ?? "";
  const duration = Number(params.get("duracao"));
  if (!isDateStr(date) || !Number.isInteger(duration) || duration <= 0) {
    return NextResponse.json({ slots: [] });
  }

  const [shop, professional] = await Promise.all([
    db.shop.findUnique({ where: { id: session.shopId } }),
    db.professional.findFirst({ where: { id: professionalId, shopId: session.shopId } }),
  ]);
  if (!shop || !professional) return NextResponse.json({ slots: [] });

  const availability = await getDayAvailability({
    shop,
    dateStr: date,
    durationMin: duration,
    professionalIds: [professional.id],
    excludeAppointmentId: params.get("excluir") ?? undefined,
  });
  return NextResponse.json({ slots: availability[professional.id] ?? [] });
}
