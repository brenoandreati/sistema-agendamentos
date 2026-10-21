// Despesas: categorias e datas das despesas fixas (que repetem todo mês). Puro, para dar para testar.
import type { ExpenseCategory } from "@prisma/client";
import { addDays, addMonths } from "./time";

export const EXPENSE_CATEGORY: Record<ExpenseCategory, string> = {
  RENT: "Aluguel",
  PRODUCTS: "Produtos e materiais",
  BILLS: "Contas (luz, água, internet)",
  TEAM: "Equipe (salários, comissões)",
  TAXES: "Impostos e taxas",
  MARKETING: "Divulgação",
  EQUIPMENT: "Equipamentos e manutenção",
  OTHER: "Outros",
};

export function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return typeof value === "string" && value in EXPENSE_CATEGORY;
}

/** Dia `dayOfMonth` no mês de `monthDate`. Em meses mais curtos, cai no último dia (ex.: 31 → 28/02). */
export function dateInMonth(monthDate: string, dayOfMonth: number): string {
  const first = `${monthDate.slice(0, 7)}-01`;
  const last = Number(addDays(addMonths(first, 1), -1).slice(8));
  return `${first.slice(0, 8)}${String(Math.min(dayOfMonth, last)).padStart(2, "0")}`;
}

/** Primeira data com o dia do mês `dayOfMonth` depois de `after`. */
export function nextMonthlyDate(dayOfMonth: number, after: string): string {
  const sameMonth = dateInMonth(after, dayOfMonth);
  return sameMonth > after ? sameMonth : dateInMonth(addMonths(after, 1), dayOfMonth);
}

/** Datas que já chegaram (até `today`) a partir de `nextDate`, e a próxima que fica para depois. */
export function dueDates(dayOfMonth: number, nextDate: string, today: string): { dates: string[]; nextDate: string } {
  const dates: string[] = [];
  let next = nextDate;
  // Limite de segurança: no máximo 2 anos de atraso de uma vez.
  while (next <= today && dates.length < 24) {
    dates.push(next);
    next = nextMonthlyDate(dayOfMonth, next);
  }
  return { dates, nextDate: next };
}
