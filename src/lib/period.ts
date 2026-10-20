import { addDays, addMonths, diffDays, formatDateLong, formatDateShort, formatMonth, startOfMonth, startOfWeek } from "./time";

export type Period = "dia" | "semana" | "mes" | "ano";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mês" },
  { value: "ano", label: "Ano" },
];

export function isPeriod(value: unknown): value is Period {
  return value === "dia" || value === "semana" || value === "mes" || value === "ano";
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

export type Bucket = { key: string; label: string; tooltip: string; anchor: string };

/** Intervalo [start, end) do período que contém `date`, com as barras do gráfico. */
export function periodRange(period: Period, date: string) {
  if (period === "dia") {
    return {
      start: date,
      end: addDays(date, 1),
      prev: addDays(date, -1),
      next: addDays(date, 1),
      title: formatDateLong(date),
      previousLabel: "ao dia anterior",
      buckets: [] as Bucket[],
      bucketKey: (day: string) => day,
    };
  }
  if (period === "semana") {
    const start = startOfWeek(date);
    const end = addDays(start, 7);
    return {
      start,
      end,
      prev: addDays(start, -7),
      next: end,
      title: `${shortDate(start)} a ${shortDate(addDays(end, -1))}`,
      previousLabel: "à semana anterior",
      buckets: Array.from({ length: 7 }, (_, i) => {
        const day = addDays(start, i);
        return { key: day, label: `${WEEKDAYS[i]} ${Number(day.slice(8))}`, tooltip: formatDateShort(day), anchor: day };
      }),
      bucketKey: (day: string) => day,
    };
  }
  if (period === "mes") {
    const start = startOfMonth(date);
    const end = addMonths(start, 1);
    return {
      start,
      end,
      prev: addMonths(start, -1),
      next: end,
      title: capitalize(formatMonth(start)),
      previousLabel: "ao mês anterior",
      buckets: Array.from({ length: diffDays(start, end) }, (_, i) => {
        const day = addDays(start, i);
        return { key: day, label: String(i + 1), tooltip: formatDateShort(day), anchor: day };
      }),
      bucketKey: (day: string) => day,
    };
  }
  const start = `${date.slice(0, 4)}-01-01`;
  const end = addMonths(start, 12);
  return {
    start,
    end,
    prev: addMonths(start, -12),
    next: end,
    title: date.slice(0, 4),
    previousLabel: "ao ano anterior",
    buckets: MONTHS.map((label, i) => {
      const month = addMonths(start, i);
      return { key: month.slice(0, 7), label, tooltip: capitalize(formatMonth(month)), anchor: month };
    }),
    bucketKey: (day: string) => day.slice(0, 7),
  };
}

function shortDate(date: string) {
  return `${Number(date.slice(8))} de ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
