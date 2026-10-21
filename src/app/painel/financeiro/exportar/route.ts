import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { PAYMENT_METHOD } from "@/lib/format";
import { isPeriod, periodRange } from "@/lib/period";
import { formatDateNumeric, formatTime, isDateStr, todayStr, toDateStr, zonedToUtc } from "@/lib/time";

function csvCell(value: string) {
  // Textos digitados por clientes não podem virar fórmula no Excel.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Planilha (CSV, separada por ponto e vírgula para abrir direto no Excel em português) com os pagamentos do período. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autorizado", { status: 401 });
  const { shop } = user;

  const params = request.nextUrl.searchParams;
  const period = isPeriod(params.get("periodo")) ? (params.get("periodo") as "dia") : "mes";
  const dateParam = params.get("data");
  const date = isDateStr(dateParam) ? dateParam : todayStr(shop.timezone);
  const range = periodRange(period, date);

  const payments = await db.payment.findMany({
    where: {
      shopId: shop.id,
      status: "APPROVED",
      paidAt: { gte: zonedToUtc(range.start, 0, shop.timezone), lt: zonedToUtc(range.end, 0, shop.timezone) },
    },
    include: { client: true, appointment: { include: { services: true, professional: true } } },
    orderBy: { paidAt: "asc" },
  });

  const rows = [
    ["Data", "Hora", "Cliente", "Telefone", "Descrição", "Profissional", "Forma de pagamento", "Onde", "Valor"],
    ...payments.map((p) => [
      formatDateNumeric(toDateStr(p.paidAt!, shop.timezone)),
      formatTime(p.paidAt!, shop.timezone),
      p.client?.name ?? "",
      p.client?.phone ?? "",
      p.appointment ? p.appointment.services.map((s) => s.name).join(" + ") : (p.description ?? ""),
      p.appointment?.professional.name ?? "",
      p.method ? PAYMENT_METHOD[p.method] : "Online",
      p.channel === "ONLINE" ? "Online" : "Presencial",
      (p.amountCents / 100).toFixed(2).replace(".", ","),
    ]),
  ];
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${range.start}.csv"`,
    },
  });
}
