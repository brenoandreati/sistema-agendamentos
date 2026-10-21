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

/** Fusos do Brasil (sem horário de verão desde 2019). */
export const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Horário de Brasília (maioria dos estados)" },
  { value: "America/Manaus", label: "1 hora a menos (AM, MT, MS, RO, RR)" },
  { value: "America/Rio_Branco", label: "2 horas a menos (AC)" },
  { value: "America/Noronha", label: "1 hora a mais (Fernando de Noronha)" },
];

/** Até quando o cliente pode cancelar pelo site. `null` = só falando com o negócio. */
export const CANCEL_NOTICES = [
  { value: 60, label: "Até 1 hora antes" },
  { value: 120, label: "Até 2 horas antes" },
  { value: 360, label: "Até 6 horas antes" },
  { value: 720, label: "Até 12 horas antes" },
  { value: 1440, label: "Até 1 dia antes" },
  { value: 2880, label: "Até 2 dias antes" },
  { value: null, label: "Não pode cancelar pelo site" },
];
