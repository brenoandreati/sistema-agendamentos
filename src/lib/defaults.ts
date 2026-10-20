/** Horário padrão de um profissional novo: segunda a sábado, 9h–12h e 13h–19h. */
export function defaultWorkingHours() {
  const hours: { weekday: number; startMin: number; endMin: number }[] = [];
  for (let weekday = 1; weekday <= 6; weekday++) {
    hours.push({ weekday, startMin: 9 * 60, endMin: 12 * 60 });
    hours.push({ weekday, startMin: 13 * 60, endMin: 19 * 60 });
  }
  return hours;
}

export const PROFESSIONAL_COLORS = ["#b45309", "#0f766e", "#7c3aed", "#be123c", "#1d4ed8", "#4d7c0f", "#a21caf", "#334155"];
