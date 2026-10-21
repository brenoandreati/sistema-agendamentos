import Link from "next/link";
import type { Metadata } from "next";
import { Ban, Plus } from "lucide-react";
import { AppointmentRow } from "@/components/appointment-row";
import { DateNav } from "@/components/date-nav";
import { MonthCalendar } from "@/components/month-calendar";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { appointmentInclude, paidCents, serviceNames } from "@/lib/queries";
import { expireStaleHolds } from "@/lib/scheduling";
import {
  addDays,
  dayRange,
  formatDateLong,
  formatTime,
  isDateStr,
  minutesOfDay,
  minutesToHHMM,
  monthGrid,
  startOfMonth,
  toDateStr,
  todayStr,
  weekdayOf,
} from "@/lib/time";

export const metadata: Metadata = { title: "Agenda" };

const PX_PER_MIN = 1.6;

export default async function AgendaPage({ searchParams }: PageProps<"/painel/agenda">) {
  const { shop } = await requireUser();
  const tz = shop.timezone;
  const query = await searchParams;
  const today = todayStr(tz);
  const date = isDateStr(query.data) ? query.data : today;
  const { start, end } = dayRange(date, tz);
  // O calendário pode mostrar outro mês sem trocar o dia aberto (?mes=AAAA-MM).
  const month = typeof query.mes === "string" && isDateStr(`${query.mes}-01`) ? `${query.mes}-01` : startOfMonth(date);
  const weeks = monthGrid(month);
  const calendarStart = dayRange(weeks[0][0], tz).start;
  const calendarEnd = dayRange(weeks.at(-1)!.at(-1)!, tz).end;

  await expireStaleHolds(shop.id);

  const [professionals, appointments, blocks, monthAppointments, workdays] = await Promise.all([
    db.professional.findMany({
      where: { shopId: shop.id, active: true },
      orderBy: { sortOrder: "asc" },
      include: { workingHours: { where: { weekday: weekdayOf(date) } } },
    }),
    db.appointment.findMany({
      where: { shopId: shop.id, startAt: { lt: end }, endAt: { gt: start } },
      include: appointmentInclude,
      orderBy: { startAt: "asc" },
    }),
    db.timeBlock.findMany({
      where: { shopId: shop.id, startAt: { lt: end }, endAt: { gt: start } },
      orderBy: { startAt: "asc" },
    }),
    db.appointment.findMany({
      where: {
        shopId: shop.id,
        startAt: { gte: calendarStart, lt: calendarEnd },
        status: { notIn: ["CANCELED", "EXPIRED"] },
      },
      select: { startAt: true },
    }),
    db.workingHour.findMany({
      where: { professional: { shopId: shop.id, active: true } },
      select: { weekday: true },
      distinct: ["weekday"],
    }),
  ]);

  const counts: Record<string, number> = {};
  for (const a of monthAppointments) {
    const day = toDateStr(a.startAt, tz);
    counts[day] = (counts[day] ?? 0) + 1;
  }
  const openWeekdays = new Set(workdays.map((w) => w.weekday));
  const closedWeekdays = [0, 1, 2, 3, 4, 5, 6].filter((d) => !openWeekdays.has(d));

  const active = appointments.filter((a) => a.status !== "CANCELED" && a.status !== "EXPIRED");
  const inactive = appointments.filter((a) => a.status === "CANCELED" || a.status === "EXPIRED");
  const expected = active.reduce((sum, a) => sum + a.totalCents, 0);
  const received = active.reduce((sum, a) => sum + paidCents(a), 0);

  const toMin = (d: Date) => (d <= start ? 0 : d >= end ? 24 * 60 : minutesOfDay(d, tz));
  const hours = professionals.flatMap((p) => p.workingHours);
  const points = [
    ...hours.flatMap((h) => [h.startMin, h.endMin]),
    ...active.flatMap((a) => [toMin(a.startAt), toMin(a.endAt)]),
  ];
  const gridStart = Math.floor(Math.min(8 * 60, ...points) / 60) * 60;
  const gridEnd = Math.ceil(Math.max(20 * 60, ...points) / 60) * 60;
  const gridHeight = (gridEnd - gridStart) * PX_PER_MIN;
  const step = shop.slotIntervalMin;
  const nowLine = date === today ? minutesOfDay(new Date(), tz) : null;

  return (
    <>
      <PageHeader
        title={formatDateLong(date)}
        description={
          <>
            {active.length} agendamento(s) · previsto {formatMoney(expected)} · recebido {formatMoney(received)}
          </>
        }
        actions={
          <>
            <LinkButton href={`/painel/agenda/bloquear?data=${date}`} variant="secondary">
              <Ban className="size-4" aria-hidden /> Bloquear horário
            </LinkButton>
            <LinkButton href={`/painel/agenda/novo?data=${date}`}>
              <Plus className="size-4" aria-hidden /> Agendar
            </LinkButton>
          </>
        }
      />
      <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="p-4 lg:sticky lg:top-6">
          <MonthCalendar
            month={month}
            selected={date}
            today={today}
            counts={counts}
            closedWeekdays={closedWeekdays}
            dayHref={(d) => `/painel/agenda?data=${d}`}
            monthHref={(m) => `/painel/agenda?data=${date}&mes=${m.slice(0, 7)}`}
          />
        </Card>

        <div className="min-w-0">
          <div className="mb-4">
            <DateNav basePath="/painel/agenda" date={date} prev={addDays(date, -1)} next={addDays(date, 1)} today={today} />
          </div>

          {professionals.length === 0 ? (
            <EmptyState title="Nenhum profissional ativo">
              <Link href="/painel/profissionais/novo" className="text-brand underline">
                Cadastre um profissional
              </Link>{" "}
              para usar a agenda.
            </EmptyState>
          ) : (
            <Card className="overflow-x-auto">
              <div className="flex min-w-fit">
                <div className="sticky left-0 z-20 w-14 shrink-0 border-r border-line bg-surface">
                  <div className="h-11 border-b border-line" />
                  <div className="relative" style={{ height: gridHeight }}>
                    {Array.from({ length: (gridEnd - gridStart) / 60 }, (_, i) => (
                      <span
                        key={i}
                        className="absolute right-2 -translate-y-1/2 text-xs text-muted tabular-nums"
                        style={{ top: i * 60 * PX_PER_MIN }}
                      >
                        {i === 0 ? "" : minutesToHHMM(gridStart + i * 60)}
                      </span>
                    ))}
                  </div>
                </div>

                {professionals.map((p) => {
                  const working = p.workingHours.sort((a, b) => a.startMin - b.startMin);
                  const gaps: { start: number; end: number }[] = [];
                  let cursor = gridStart;
                  for (const h of working) {
                    if (h.startMin > cursor) gaps.push({ start: cursor, end: h.startMin });
                    cursor = Math.max(cursor, h.endMin);
                  }
                  if (cursor < gridEnd) gaps.push({ start: cursor, end: gridEnd });
                  const mine = active.filter((a) => a.professionalId === p.id);
                  const myBlocks = blocks.filter((b) => b.professionalId === p.id);

                  return (
                    <div key={p.id} className="min-w-44 flex-1 border-r border-line last:border-r-0">
                      <div className="sticky top-0 flex h-11 items-center gap-2 border-b border-line px-3">
                        <span className="size-2.5 rounded-full" style={{ background: p.color }} aria-hidden />
                        <span className="truncate text-sm font-medium">{p.name}</span>
                      </div>
                      <div className="relative" style={{ height: gridHeight }}>
                        {Array.from({ length: (gridEnd - gridStart) / step }, (_, i) => {
                          const slot = gridStart + i * step;
                          return (
                            <Link
                              key={slot}
                              href={`/painel/agenda/novo?data=${date}&hora=${minutesToHHMM(slot)}&prof=${p.id}`}
                              prefetch={false}
                              className={`absolute inset-x-0 block hover:bg-brand/8 ${slot % 60 === 0 ? "border-t border-line" : "border-t border-dashed border-line/60"}`}
                              style={{ top: (slot - gridStart) * PX_PER_MIN, height: step * PX_PER_MIN }}
                              aria-label={`Agendar ${minutesToHHMM(slot)} com ${p.name}`}
                            />
                          );
                        })}
                        {gaps.map((g) => (
                          <div
                            key={g.start}
                            className="pointer-events-none absolute inset-x-0 bg-[repeating-linear-gradient(135deg,transparent_0_6px,var(--line)_6px_7px)] opacity-60"
                            style={{ top: (g.start - gridStart) * PX_PER_MIN, height: (g.end - g.start) * PX_PER_MIN }}
                          />
                        ))}
                        {myBlocks.map((b) => {
                          const s = toMin(b.startAt);
                          const e = toMin(b.endAt);
                          return (
                            <Link
                              key={b.id}
                              href={`/painel/agenda/bloquear?data=${date}`}
                              prefetch={false}
                              className="absolute inset-x-1 z-10 overflow-hidden rounded-md border border-line bg-surface-2 px-2 py-1 text-xs text-muted"
                              style={{ top: (s - gridStart) * PX_PER_MIN, height: Math.max(18, (e - s) * PX_PER_MIN) }}
                            >
                              <b className="font-medium">Bloqueado</b>
                              {b.reason ? ` · ${b.reason}` : ""}
                            </Link>
                          );
                        })}
                        {mine.map((a) => {
                          const s = toMin(a.startAt);
                          const e = toMin(a.endAt);
                          const paid = paidCents(a) >= a.totalCents;
                          const minutes = e - s;
                          return (
                            <Link
                              key={a.id}
                              href={`/painel/agendamentos/${a.id}`}
                              prefetch={false}
                              className={`absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 px-2 text-xs shadow-sm transition hover:brightness-95 ${
                                minutes < 25 ? "py-0.5" : "py-1"
                              } ${
                                a.status === "PENDING_PAYMENT" ? "border border-dashed" : ""
                              } ${a.status === "NO_SHOW" ? "opacity-60" : ""}`}
                              style={{
                                top: (s - gridStart) * PX_PER_MIN,
                                height: Math.max(20, (e - s) * PX_PER_MIN - 2),
                                background: `color-mix(in srgb, ${a.professional.color} 16%, var(--surface))`,
                                borderLeftColor: a.professional.color,
                                borderColor: a.status === "PENDING_PAYMENT" ? a.professional.color : undefined,
                              }}
                            >
                              <p className="truncate font-semibold">
                                {formatTime(a.startAt, tz)} {a.client.name}
                              </p>
                              {minutes >= 25 && <p className="truncate text-muted">{serviceNames(a)}</p>}
                              {minutes >= 40 && (
                              <p className="truncate text-muted">
                                {a.status === "PENDING_PAYMENT"
                                  ? "Aguardando pagamento"
                                  : a.status === "COMPLETED"
                                    ? "✓ Concluído"
                                    : a.status === "NO_SHOW"
                                      ? "Faltou"
                                      : paid
                                        ? "Pago"
                                        : "Não pago"}
                              </p>
                              )}
                            </Link>
                          );
                        })}
                        {nowLine !== null && nowLine >= gridStart && nowLine <= gridEnd && (
                          <div className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-red-500" style={{ top: (nowLine - gridStart) * PX_PER_MIN }} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {inactive.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-sm font-semibold text-muted">Cancelados e reservas expiradas</h2>
              <Card className="divide-y divide-line">
                {inactive.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} timezone={tz} />
                ))}
              </Card>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
