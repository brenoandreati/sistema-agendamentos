// Datas de calendário circulam como "YYYY-MM-DD" no fuso da barbearia.
// Horários do dia circulam como minutos desde 00:00 (ex.: 9h30 = 570).

const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(tz: string) {
  let formatter = partsFormatters.get(tz);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(tz, formatter);
  }
  return formatter;
}

export function zonedParts(date: Date, tz: string) {
  const parts = partsFormatter(tz).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

function offsetMs(date: Date, tz: string) {
  const p = zonedParts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instante UTC correspondente a uma data local + minutos do dia no fuso `tz`. */
export function zonedToUtc(dateStr: string, minutes: number, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const wallClock = Date.UTC(y, m - 1, d, 0, minutes);
  let ts = wallClock - offsetMs(new Date(wallClock), tz);
  // Segunda passada corrige dias com mudança de horário de verão.
  ts = wallClock - offsetMs(new Date(ts), tz);
  return new Date(ts);
}

export function toDateStr(date: Date, tz: string): string {
  const p = zonedParts(date, tz);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function minutesOfDay(date: Date, tz: string): number {
  const p = zonedParts(date, tz);
  return p.hour * 60 + p.minute;
}

export function todayStr(tz: string, now = new Date()): string {
  return toDateStr(now, tz);
}

export function isDateStr(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function diffDays(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** 0 = domingo ... 6 = sábado */
export function weekdayOf(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Segunda-feira da semana da data. */
export function startOfWeek(dateStr: string): string {
  const weekday = weekdayOf(dateStr);
  return addDays(dateStr, weekday === 0 ? -6 : 1 - weekday);
}

export function startOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export function addMonths(dateStr: string, months: number): string {
  const [y, m] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, 1)).toISOString().slice(0, 10);
}

export function dayRange(dateStr: string, tz: string) {
  return { start: zonedToUtc(dateStr, 0, tz), end: zonedToUtc(addDays(dateStr, 1), 0, tz) };
}

export function minutesToHHMM(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function hhmmToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}

export function formatTime(date: Date, tz: string): string {
  return minutesToHHMM(minutesOfDay(date, tz));
}

function calendarDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** "segunda-feira, 20 de outubro" */
export function formatDateLong(dateStr: string): string {
  const text = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(calendarDate(dateStr));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "seg., 20/10" */
export function formatDateShort(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(calendarDate(dateStr));
}

/** "20/10/2026" */
export function formatDateNumeric(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

/** "outubro de 2026" */
export function formatMonth(dateStr: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(calendarDate(dateStr));
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}
