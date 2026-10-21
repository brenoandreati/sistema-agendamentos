"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/forms";
import { Button, cn, LinkButton } from "@/components/ui";
import { formatDateLong, minutesToHHMM } from "@/lib/time";
import { getRescheduleSlots, rescheduleByCustomer } from "../../../actions";

type Day = { date: string; weekday: number; label: string; day: string; month: string };

/** O cliente escolhe outro dia e horário com o mesmo profissional. */
export function RescheduleFlow({
  token,
  statusPage,
  days,
  workingWeekdays,
}: {
  token: string;
  statusPage: string;
  days: Day[];
  workingWeekdays: number[];
}) {
  const router = useRouter();
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [slots, setSlots] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const working = new Set(workingWeekdays);

  function loadSlots(value: string) {
    startLoading(async () => {
      const result = await getRescheduleSlots(token, value);
      if ("error" in result) setError(result.error);
      else setSlots(result.slots);
    });
  }

  function chooseDate(value: string) {
    setDate(value);
    setTime(null);
    setSlots(null);
    setError(null);
    loadSlots(value);
  }

  function confirm() {
    if (date === null || time === null) return;
    setError(null);
    startSaving(async () => {
      const result = await rescheduleByCustomer({ token, date, time });
      if ("error" in result) {
        setError(result.error);
        // O horário pode ter sido ocupado: atualiza a lista.
        setTime(null);
        loadSlots(date);
        return;
      }
      router.push(result.redirectTo);
    });
  }

  const periods = [
    { label: "Manhã", items: (slots ?? []).filter((s) => s < 12 * 60) },
    { label: "Tarde", items: (slots ?? []).filter((s) => s >= 12 * 60 && s < 18 * 60) },
    { label: "Noite", items: (slots ?? []).filter((s) => s >= 18 * 60) },
  ].filter((p) => p.items.length);

  return (
    <section className="pb-28">
      <h3 className="mb-3 font-semibold">Escolha o novo dia</h3>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2">
        {days.map((d) => {
          const active = date === d.date;
          return (
            <button
              key={d.date}
              type="button"
              disabled={!working.has(d.weekday)}
              onClick={() => chooseDate(d.date)}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center rounded-card border py-2 transition disabled:opacity-35",
                active ? "border-brand bg-brand text-brand-fg" : "border-line bg-surface hover:border-muted/50",
              )}
            >
              <span className="text-xs">{d.label}</span>
              <span className="text-lg font-semibold tabular-nums">{d.day}</span>
              <span className="text-xs">{d.month}</span>
            </button>
          );
        })}
      </div>

      {error && <Alert tone="error">{error}</Alert>}
      {!date && <p className="text-sm text-muted">Escolha um dia para ver os horários livres.</p>}
      {date && (loading || slots === null) && !error && <p className="text-sm text-muted">Buscando horários...</p>}
      {date && !loading && slots?.length === 0 && <p className="text-sm text-muted">Não há horários livres nesse dia. Tente outro dia.</p>}
      {!loading &&
        periods.map((period) => (
          <div key={period.label} className="mb-4">
            <h4 className="mb-2 text-sm font-medium text-muted">{period.label}</h4>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {period.items.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setTime(slot)}
                  aria-pressed={time === slot}
                  className={cn(
                    "rounded-control border py-2 text-sm font-medium tabular-nums transition",
                    time === slot ? "border-brand bg-brand text-brand-fg" : "border-line bg-surface hover:border-brand",
                  )}
                >
                  {minutesToHHMM(slot)}
                </button>
              ))}
            </div>
          </div>
        ))}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-sm">
            {date && time !== null ? (
              <>
                <p className="text-xs text-muted">Novo horário</p>
                <p className="truncate font-semibold">
                  {formatDateLong(date)} às {minutesToHHMM(time)}
                </p>
              </>
            ) : (
              <p className="text-muted">Escolha o dia e o horário</p>
            )}
          </div>
          <LinkButton href={statusPage} variant="secondary">
            Voltar
          </LinkButton>
          <Button type="button" onClick={confirm} disabled={saving || date === null || time === null}>
            {saving ? "Remarcando..." : "Remarcar"}
          </Button>
        </div>
      </div>
    </section>
  );
}
