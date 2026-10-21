import Link from "next/link";
import type { Metadata } from "next";
import { Download, Minus, Plus, Repeat } from "lucide-react";
import { DateNav } from "@/components/date-nav";
import { ActionForm, SubmitButton } from "@/components/forms";
import { RevenueChart } from "@/components/revenue-chart";
import { Badge, buttonClass, Card, cn, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { EXPENSE_CATEGORY } from "@/lib/expenses";
import { getFinanceReport } from "@/lib/finance";
import { PAYMENT_METHOD } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { isPeriod, PERIODS, type Period } from "@/lib/period";
import { serviceNames } from "@/lib/queries";
import { formatDateShort, formatTime, isDateStr, todayStr, toDateStr } from "@/lib/time";
import { removeIncome, stopRecurringExpense } from "./actions";

export const metadata: Metadata = { title: "Financeiro" };

function delta(current: number, previous: number) {
  if (!previous) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? "+" : ""}${change}%`;
}

export default async function FinancePage({ searchParams }: PageProps<"/painel/financeiro">) {
  const { shop } = await requireOwner();
  const tz = shop.timezone;
  const query = await searchParams;
  const today = todayStr(tz);
  const period: Period = isPeriod(query.periodo) ? query.periodo : "mes";
  const date = isDateStr(query.data) ? query.data : today;

  const report = await getFinanceReport(shop, period, date);
  const { range } = report;
  const change = delta(report.received, report.previousReceived);
  const comparison = `em relação ${range.previousLabel}${report.partialComparison ? " até este ponto" : ""}`;
  const spentChange = delta(report.spent, report.previousSpent);
  const profitChange = report.previousProfit > 0 ? delta(report.profit, report.previousProfit) : null;
  const showDate = period !== "dia";
  const showAll = query.lista === "todos";
  const LIMIT = 20;
  const visiblePayments = showAll ? report.payments : report.payments.slice(0, LIMIT);
  const visibleUnpaid = showAll ? report.unpaid : report.unpaid.slice(0, LIMIT);
  const visibleExpenses = showAll ? report.expenses : report.expenses.slice(0, LIMIT);
  const expenseDay = period === "dia" ? date : today;

  return (
    <>
      <PageHeader
        title="Financeiro"
        description="Quanto entrou, quanto saiu, o lucro e o que ainda falta receber."
        actions={
          <>
            <a href={`/painel/financeiro/exportar?periodo=${period}&data=${date}`} className={buttonClass("secondary")}>
              <Download className="size-4" aria-hidden /> Exportar planilha
            </a>
            <LinkButton href={`/painel/financeiro/despesas/nova?data=${expenseDay}`} variant="secondary">
              <Minus className="size-4" aria-hidden /> Despesa
            </LinkButton>
            <LinkButton href={`/painel/financeiro/entrada?data=${period === "dia" ? date : today}`}>
              <Plus className="size-4" aria-hidden /> Entrada avulsa
            </LinkButton>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="flex rounded-control border border-line bg-surface p-0.5" role="tablist" aria-label="Período">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/painel/financeiro?periodo=${p.value}&data=${date}`}
              role="tab"
              aria-selected={p.value === period}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                p.value === period ? "bg-brand text-brand-fg" : "text-muted hover:text-fg",
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <DateNav
          basePath="/painel/financeiro"
          date={date}
          prev={range.prev}
          next={range.next}
          today={today}
          extraParams={{ periodo: period }}
          todayLabel={{ dia: "Hoje", semana: "Esta semana", mes: "Este mês", ano: "Este ano" }[period]}
        />
      </div>

      <h2 className="mb-3 text-lg font-semibold">{range.title}</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Recebido" value={formatMoney(report.received)} hint={change ? `${change} ${comparison}` : `Online ${formatMoney(report.online)}`} />
        <Stat
          label="Despesas"
          value={formatMoney(report.spent)}
          hint={spentChange ? `${spentChange} ${comparison}` : `${report.expenses.length} despesa(s) registrada(s)`}
        />
        <Stat
          label="Lucro"
          value={<span className={report.profit < 0 ? "text-red-600 dark:text-red-400" : undefined}>{formatMoney(report.profit)}</span>}
          hint={profitChange ? `${profitChange} ${comparison}` : "Recebido menos despesas"}
        />
        <Stat label="A receber" value={formatMoney(report.toReceive)} hint={`${report.unpaid.length} atendimento(s) já realizado(s) sem pagamento completo`} />
        <Stat
          label="Atendimentos"
          value={report.appointmentsCount}
          hint={`${report.completedCount} concluído(s)${report.noShows ? ` · ${report.noShows} falta(s)` : ""}`}
        />
        <Stat label="Ticket médio" value={formatMoney(report.averageTicket)} hint="Valor médio por atendimento concluído" />
      </div>

      {report.chart.length > 0 && (
        <Card className="mb-6 p-5">
          <h3 className="font-semibold">Recebido por {period === "ano" ? "mês" : "dia"}</h3>
          <RevenueChart data={report.chart} title={`Recebido por ${period === "ano" ? "mês" : "dia"}: ${range.title}`} />
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section>
          <h3 className="mb-3 font-semibold">Quem pagou</h3>
          {report.payments.length === 0 ? (
            <EmptyState title="Nenhum pagamento nesse período" />
          ) : (
            <Card className="divide-y divide-line">
              {visiblePayments.map((p) => {
                const paidDate = toDateStr(p.paidAt!, tz);
                const label = p.appointment ? serviceNames(p.appointment) : (p.description ?? "Entrada avulsa");
                const content = (
                  <>
                    <div className="w-16 shrink-0 text-sm">
                      <p className="font-medium tabular-nums">{formatTime(p.paidAt!, tz)}</p>
                      {showDate && <p className="text-xs text-muted">{formatDateShort(paidDate)}</p>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{p.client?.name ?? "Sem cliente"}</p>
                      <p className="truncate text-sm text-muted">
                        {label} · {p.method ? PAYMENT_METHOD[p.method] : "Online"} · {p.channel === "ONLINE" ? "online" : "presencial"}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums">{formatMoney(p.amountCents)}</p>
                  </>
                );
                return p.appointmentId ? (
                  <Link key={p.id} href={`/painel/agendamentos/${p.appointmentId}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                    {content}
                  </Link>
                ) : (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                    {content}
                    <ActionForm action={removeIncome} confirm="Remover esta entrada avulsa?">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <SubmitButton variant="ghost" size="sm" pendingText="...">
                        Remover
                      </SubmitButton>
                    </ActionForm>
                  </div>
                );
              })}
            </Card>
          )}

          {report.payments.length > visiblePayments.length && (
            <ShowAllLink href={`/painel/financeiro?periodo=${period}&data=${date}&lista=todos`} total={report.payments.length} />
          )}

          <h3 className="mt-6 mb-3 font-semibold">Falta receber</h3>
          {report.unpaid.length === 0 ? (
            <EmptyState title="Tudo pago nesse período" />
          ) : (
            <Card className="divide-y divide-line">
              {visibleUnpaid.map(({ appointment: a, remaining }) => (
                <Link key={a.id} href={`/painel/agendamentos/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <div className="w-16 shrink-0 text-sm">
                    <p className="font-medium tabular-nums">{formatTime(a.startAt, tz)}</p>
                    {showDate && <p className="text-xs text-muted">{formatDateShort(toDateStr(a.startAt, tz))}</p>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{a.client.name}</p>
                    <p className="truncate text-sm text-muted">
                      {serviceNames(a)} · {a.professional.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatMoney(remaining)}</p>
                    {remaining < a.totalCents && <p className="text-xs text-muted">de {formatMoney(a.totalCents)}</p>}
                  </div>
                </Link>
              ))}
            </Card>
          )}
          {report.unpaid.length > visibleUnpaid.length && (
            <ShowAllLink href={`/painel/financeiro?periodo=${period}&data=${date}&lista=todos`} total={report.unpaid.length} />
          )}

          <div className="mt-6 mb-3 flex items-center justify-between gap-3">
            <h3 className="font-semibold">Despesas</h3>
            <Link href={`/painel/financeiro/despesas/nova?data=${expenseDay}`} className="text-sm text-brand hover:underline">
              + Registrar despesa
            </Link>
          </div>
          {report.expenses.length === 0 ? (
            <EmptyState title="Nenhuma despesa nesse período">
              Registre aluguel, produtos e contas para ver o lucro de verdade.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {visibleExpenses.map((e) => (
                <Link key={e.id} href={`/painel/financeiro/despesas/${e.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
                  <div className="w-16 shrink-0 text-sm">
                    <p className="font-medium">{formatDateShort(toDateStr(e.date, tz))}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      <span className="truncate">{e.description}</span>
                      {e.recurring?.active && (
                        <Badge>
                          <Repeat className="mr-1 size-3" aria-hidden /> todo mês
                        </Badge>
                      )}
                    </p>
                    <p className="truncate text-sm text-muted">{EXPENSE_CATEGORY[e.category]}</p>
                  </div>
                  <p className="font-semibold text-red-600 tabular-nums dark:text-red-400">−{formatMoney(e.amountCents)}</p>
                </Link>
              ))}
            </Card>
          )}
          {report.expenses.length > visibleExpenses.length && (
            <ShowAllLink href={`/painel/financeiro?periodo=${period}&data=${date}&lista=todos`} total={report.expenses.length} />
          )}
          {showAll && (report.payments.length > LIMIT || report.unpaid.length > LIMIT || report.expenses.length > LIMIT) && (
            <Link href={`/painel/financeiro?periodo=${period}&data=${date}`} className="mt-3 inline-block text-sm text-brand hover:underline">
              Mostrar menos
            </Link>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <Card className="p-5">
            <h3 className="mb-4 font-semibold">Por forma de pagamento</h3>
            {report.byMethod.length === 0 ? (
              <p className="text-sm text-muted">Sem pagamentos.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {report.byMethod.map(([method, value]) => (
                  <li key={method}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span>{PAYMENT_METHOD[method]}</span>
                      <span className="font-medium tabular-nums">{formatMoney(value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2">
                      <div className="h-2 rounded-full bg-brand" style={{ width: `${(value / report.received) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {report.byCategory.length > 0 && (
            <Card className="p-5">
              <h3 className="mb-4 font-semibold">Despesas por categoria</h3>
              <ul className="flex flex-col gap-3">
                {report.byCategory.map(([category, value]) => (
                  <li key={category}>
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span>{EXPENSE_CATEGORY[category]}</span>
                      <span className="font-medium tabular-nums">{formatMoney(value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-2">
                      <div className="h-2 rounded-full bg-red-500/70" style={{ width: `${(value / report.spent) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {report.recurring.length > 0 && (
            <Card className="p-5 text-sm">
              <h3 className="mb-1 font-semibold">Despesas fixas</h3>
              <p className="mb-3 text-xs text-muted">Lançadas sozinhas todo mês, quando chega o dia.</p>
              <ul className="flex flex-col divide-y divide-line">
                {report.recurring.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.description}</p>
                      <p className="text-xs text-muted">
                        {formatMoney(r.amountCents)} · todo dia {r.dayOfMonth}
                      </p>
                    </div>
                    <ActionForm action={stopRecurringExpense} confirm={`Parar de lançar "${r.description}" todo mês?`}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton variant="ghost" size="sm" pendingText="...">
                        Parar
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card className="p-5 text-sm">
            <h3 className="mb-3 font-semibold">Onde foi pago</h3>
            <div className="flex justify-between py-1">
              <span className="text-muted">Online (Mercado Pago)</span>
              <span className="font-medium tabular-nums">{formatMoney(report.online)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-muted">Presencial</span>
              <span className="font-medium tabular-nums">{formatMoney(report.inPerson)}</span>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

function ShowAllLink({ href, total }: { href: string; total: number }) {
  return (
    <Link href={href} className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
      Ver todos os {total}
    </Link>
  );
}
