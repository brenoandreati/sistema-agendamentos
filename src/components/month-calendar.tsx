import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonths, formatMonth, monthGrid } from "@/lib/time";
import { buttonClass, cn } from "./ui";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

/**
 * Calendário do mês com pontinhos nos dias que têm agendamento.
 * Cada dia é um link que abre o painel de horas daquele dia.
 */
export function MonthCalendar({
  month,
  selected,
  today,
  counts,
  closedWeekdays,
  dayHref,
  monthHref,
}: {
  /** Qualquer dia do mês exibido (YYYY-MM-DD). */
  month: string;
  selected: string;
  today: string;
  counts: Record<string, number>;
  /** Dias da semana (0 = domingo) em que ninguém trabalha. */
  closedWeekdays: number[];
  dayHref: (date: string) => string;
  monthHref: (month: string) => string;
}) {
  const monthKey = month.slice(0, 7);
  const weeks = monthGrid(month);
  const label = formatMonth(month);
  const title = label.charAt(0).toUpperCase() + label.slice(1);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Link href={monthHref(addMonths(month, -1))} className={buttonClass("ghost", "icon")} aria-label="Mês anterior">
          <ChevronLeft className="size-5" />
        </Link>
        <p className="font-display font-semibold lining-nums">{title}</p>
        <Link href={monthHref(addMonths(month, 1))} className={buttonClass("ghost", "icon")} aria-label="Próximo mês">
          <ChevronRight className="size-5" />
        </Link>
      </div>
      <div className="grid grid-cols-7 text-center text-[11px] font-medium text-muted" aria-hidden>
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5" role="grid" aria-label={`Calendário de ${title}`}>
        {weeks.flat().map((date) => {
          const inMonth = date.slice(0, 7) === monthKey;
          const isSelected = date === selected;
          const isToday = date === today;
          const count = counts[date] ?? 0;
          const closed = closedWeekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
          return (
            <Link
              key={date}
              href={dayHref(date)}
              prefetch={false}
              aria-current={isSelected ? "date" : undefined}
              aria-label={`${Number(date.slice(8))} de ${label}: ${count ? `${count} agendamento(s)` : "sem agendamentos"}`}
              title={count ? `${count} agendamento(s)` : undefined}
              className={cn(
                "mx-auto flex h-10 w-10 flex-col items-center justify-center rounded-control text-sm tabular-nums transition",
                isSelected
                  ? "bg-brand font-semibold text-brand-fg"
                  : isToday
                    ? "font-semibold text-brand ring-1 ring-brand/40 hover:bg-surface-2"
                    : "hover:bg-surface-2",
                !inMonth && !isSelected && "text-muted/50",
                inMonth && closed && !isSelected && !count && "text-muted/60",
              )}
            >
              {Number(date.slice(8))}
              <span
                className={cn("mt-0.5 size-1.5 rounded-full", !count && "invisible", isSelected ? "bg-brand-fg" : "bg-brand")}
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
        <span className="size-1.5 rounded-full bg-brand" aria-hidden /> dias com agendamento
      </p>
    </div>
  );
}
