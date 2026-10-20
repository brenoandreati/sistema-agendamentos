// Cálculo puro de horários livres. Tudo em minutos desde 00:00 do dia local.

export type Interval = { start: number; end: number };

type SlotOptions = {
  /** Intervalos em que o profissional trabalha nesse dia. */
  working: Interval[];
  /** Agendamentos e bloqueios que ocupam a agenda. */
  busy: Interval[];
  /** Duração total do atendimento. */
  duration: number;
  /** De quanto em quanto tempo oferecer horários (ex.: 30). */
  step: number;
  /** Nenhum horário antes disso (usado para "hoje" + antecedência mínima). */
  earliestStart?: number;
};

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Horários de início possíveis. Além da grade (ex.: 9:00, 9:30...), oferece
 * também o horário logo após cada atendimento, para não sobrar buraco na agenda.
 */
export function computeSlots({ working, busy, duration, step, earliestStart }: SlotOptions): number[] {
  if (duration <= 0 || step <= 0) return [];
  const earliest = earliestStart ?? Number.NEGATIVE_INFINITY;
  const slots = new Set<number>();

  for (const period of working) {
    const candidates: number[] = [];
    for (let start = period.start; start < period.end; start += step) candidates.push(start);
    for (const b of busy) {
      if (b.end > period.start && b.end < period.end) candidates.push(b.end);
    }

    for (const start of candidates) {
      const slot = { start, end: start + duration };
      if (start < earliest || slot.end > period.end) continue;
      if (busy.some((b) => overlaps(slot, b))) continue;
      slots.add(start);
    }
  }

  return [...slots].sort((a, b) => a - b);
}
