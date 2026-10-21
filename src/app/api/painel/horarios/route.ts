import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { agendaScope, getCurrentUser } from "@/lib/auth";
import { getDayAvailability } from "@/lib/scheduling";
import { isDateStr } from "@/lib/time";

/** Horários livres de um profissional para o formulário de agendamento do painel. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const date = params.get("data");
  const professionalId = params.get("prof") ?? "";
  const duration = Number(params.get("duracao"));
  if (!isDateStr(date) || !Number.isInteger(duration) || duration <= 0) {
    return NextResponse.json({ slots: [] });
  }

  const shop = user.shop;
  const scope = agendaScope(user);
  if (scope.professionalId && scope.professionalId !== professionalId) return NextResponse.json({ slots: [] });
  const professional = await db.professional.findFirst({ where: { id: professionalId, shopId: shop.id } });
  if (!professional) return NextResponse.json({ slots: [] });

  const availability = await getDayAvailability({
    shop,
    dateStr: date,
    durationMin: duration,
    professionalIds: [professional.id],
    excludeAppointmentId: params.get("excluir") ?? undefined,
  });
  return NextResponse.json({ slots: availability[professional.id] ?? [] });
}
