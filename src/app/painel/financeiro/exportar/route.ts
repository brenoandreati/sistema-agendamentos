import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, isOwner } from "@/lib/auth";
import { EXPENSE_CATEGORY } from "@/lib/expenses";
import { syncRecurringExpenses } from "@/lib/finance";
import { PAYMENT_METHOD } from "@/lib/format";
import { isPeriod, periodRange } from "@/lib/period";
import { formatDateNumeric, formatTime, isDateStr, todayStr, toDateStr, zonedToUtc } from "@/lib/time";

function csvCell(value: string) {
  // Textos digitados por clientes não podem virar fórmula no Excel. Valor negativo (despesa) continua número.
  const safe = /^[=+\-@\t\r]/.test(value) && !/^-\d+,\d{2}$/.test(value) ? `'${value}` : value;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Planilha (CSV, separada por ponto e vírgula para abrir direto no Excel em português) com as entradas e despesas do período. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !isOwner(user)) return new Response("Não autorizado", { status: 401 });
  const { shop } = user;

  const params = request.nextUrl.searchParams;
  const period = isPeriod(params.get("periodo")) ? (params.get("periodo") as "dia") : "mes";
  const dateParam = params.get("data");
  const date = isDateStr(dateParam) ? dateParam : todayStr(shop.timezone);
  const range = periodRange(period, date);

  const between = { gte: zonedToUtc(range.start, 0, shop.timezone), lt: zonedToUtc(range.end, 0, shop.timezone) };
  await syncRecurringExpenses(shop.id, shop.timezone);
  const [payments, expenses] = await Promise.all([
    db.payment.findMany({
      where: { shopId: shop.id, status: "APPROVED", paidAt: between },
      include: { client: true, appointment: { include: { services: true, professional: true } } },
      orderBy: { paidAt: "asc" },
    }),
    db.expense.findMany({ where: { shopId: shop.id, date: between }, orderBy: { date: "asc" } }),
  ]);

  const money = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
  // Entradas e despesas juntas, em ordem de data. Despesa vai com valor negativo: a soma da coluna é o lucro.
  const lines = [
    ...payments.map((p) => ({
      at: p.paidAt!,
      cells: [
        "Entrada",
        formatDateNumeric(toDateStr(p.paidAt!, shop.timezone)),
        formatTime(p.paidAt!, shop.timezone),
        p.client?.name ?? "",
        p.client?.phone ?? "",
        p.appointment ? p.appointment.services.map((s) => s.name).join(" + ") : (p.description ?? ""),
        p.appointment?.professional.name ?? "",
        p.method ? PAYMENT_METHOD[p.method] : "Online",
        p.channel === "ONLINE" ? "Online" : "Presencial",
        money(p.amountCents),
      ],
    })),
    ...expenses.map((e) => ({
      at: e.date,
      cells: [
        "Despesa",
        formatDateNumeric(toDateStr(e.date, shop.timezone)),
        "",
        "",
        "",
        `${EXPENSE_CATEGORY[e.category]}: ${e.description}`,
        "",
        "",
        "",
        money(-e.amountCents),
      ],
    })),
  ].sort((a, b) => a.at.getTime() - b.at.getTime());

  const rows = [
    ["Tipo", "Data", "Hora", "Cliente", "Telefone", "Descrição", "Profissional", "Forma de pagamento", "Onde", "Valor"],
    ...lines.map((line) => line.cells),
  ];
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(";")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="financeiro-${range.start}.csv"`,
    },
  });
}
