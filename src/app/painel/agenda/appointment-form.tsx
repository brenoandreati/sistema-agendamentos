"use client";

import { useEffect, useMemo, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Button, Card, Checkbox, cn, Field, Input, Select, Textarea } from "@/components/ui";
import { durationLabel, formatPhone, onlyDigits } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { minutesToHHMM } from "@/lib/time";
import { saveAppointment } from "./actions";

type ClientOption = { id: string; name: string; phone: string };
type ServiceOption = { id: string; name: string; durationMin: number; priceCents: number };
type ProfessionalOption = { id: string; name: string };

export type AppointmentFormValues = {
  id?: string;
  clientId?: string;
  serviceIds: string[];
  professionalId: string;
  date: string;
  time: string;
  notes: string;
};

export function AppointmentForm({
  clients,
  services,
  professionals,
  initial,
}: {
  clients: ClientOption[];
  services: ServiceOption[];
  professionals: ProfessionalOption[];
  initial: AppointmentFormValues;
}) {
  const [clientId, setClientId] = useState(initial.clientId ?? "");
  const [newClient, setNewClient] = useState(false);
  const [search, setSearch] = useState("");
  const [serviceIds, setServiceIds] = useState<string[]>(initial.serviceIds);
  const [professionalId, setProfessionalId] = useState(initial.professionalId);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [slots, setSlots] = useState<number[] | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);
  const chosen = services.filter((s) => serviceIds.includes(s.id));
  const duration = chosen.reduce((sum, s) => sum + s.durationMin, 0);
  const total = chosen.reduce((sum, s) => sum + s.priceCents, 0);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    const digits = onlyDigits(q);
    return clients
      .filter((c) => c.name.toLowerCase().includes(q) || (digits.length >= 3 && c.phone.includes(digits)))
      .slice(0, 8);
  }, [clients, search]);

  useEffect(() => {
    if (!professionalId || !date || !duration) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ data: date, prof: professionalId, duracao: String(duration) });
    if (initial.id) params.set("excluir", initial.id);
    fetch(`/api/painel/horarios?${params}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { slots: number[] }) => setSlots(data.slots))
      .catch(() => {});
    return () => controller.abort();
  }, [professionalId, date, duration, initial.id]);

  function toggleService(id: string) {
    setServiceIds((current) => (current.includes(id) ? current.filter((s) => s !== id) : [...current, id]));
  }

  return (
    <ActionForm action={saveAppointment} className="flex max-w-3xl flex-col gap-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="clientId" value={newClient ? "" : clientId} />
      {serviceIds.map((id) => (
        <input key={id} type="hidden" name="serviceIds" value={id} />
      ))}

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Cliente</h2>
        {newClient ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome">
              <Input name="clientName" required autoFocus />
            </Field>
            <Field label="Telefone (WhatsApp)">
              <Input name="clientPhone" type="tel" inputMode="tel" required placeholder="(11) 98765-4321" />
            </Field>
            <div className="sm:col-span-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setNewClient(false)}>
                ← Escolher cliente cadastrado
              </Button>
            </div>
          </div>
        ) : selectedClient ? (
          <div className="flex items-center justify-between gap-3 rounded-control border border-line bg-surface-2 px-3 py-2.5">
            <div>
              <p className="font-medium">{selectedClient.name}</p>
              <p className="text-sm text-muted">{formatPhone(selectedClient.phone)}</p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setClientId("")}>
              Trocar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nome ou telefone" />
            {matches.length > 0 && (
              <div className="divide-y divide-line rounded-control border border-line">
                {matches.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setClientId(c.id);
                      setSearch("");
                    }}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-2"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted">{formatPhone(c.phone)}</span>
                  </button>
                ))}
              </div>
            )}
            <div>
              <Button type="button" variant="secondary" size="sm" onClick={() => setNewClient(true)}>
                + Cliente novo
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 font-semibold">Serviços</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {services.map((s) => {
            const active = serviceIds.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                aria-pressed={active}
                className={cn(
                  "flex items-center justify-between rounded-control border px-3 py-2.5 text-left text-sm transition",
                  active ? "border-brand bg-brand/8" : "border-line hover:bg-surface-2",
                )}
              >
                <span>
                  <span className="block font-medium">{s.name}</span>
                  <span className="text-muted">{durationLabel(s.durationMin)}</span>
                </span>
                <span className="font-medium tabular-nums">{formatMoney(s.priceCents)}</span>
              </button>
            );
          })}
        </div>
        {chosen.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            Total: <b className="text-fg">{formatMoney(total)}</b> · {durationLabel(duration)}
          </p>
        )}
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-semibold">Quando</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Profissional">
            <Select name="professionalId" value={professionalId} onChange={(e) => setProfessionalId(e.target.value)} required>
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data">
            <Input name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label="Horário">
            <Input name="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} step={300} required />
          </Field>
        </div>
        {duration > 0 && slots && (
          <div>
            <p className="mb-2 text-sm text-muted">{slots.length ? "Horários livres:" : "Nenhum horário livre nesse dia para esse profissional."}</p>
            <div className="flex flex-wrap gap-1.5">
              {slots.map((slot) => {
                const label = minutesToHHMM(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTime(label)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-sm tabular-nums transition",
                      time === label ? "border-brand bg-brand text-brand-fg" : "border-line hover:bg-surface-2",
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <Checkbox name="allowOverlap" label="Encaixe" hint="Permite marcar mesmo se o horário já estiver ocupado ou bloqueado." />
        <Field label="Observações">
          <Textarea name="notes" defaultValue={initial.notes} />
        </Field>
      </Card>

      <div>
        <SubmitButton disabled={!serviceIds.length}>{initial.id ? "Salvar alterações" : "Agendar"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
