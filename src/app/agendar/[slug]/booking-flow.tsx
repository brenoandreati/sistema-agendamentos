"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PaymentMode } from "@prisma/client";
import { Check, CircleUserRound, Users } from "lucide-react";
import { CustomerAuthForms } from "@/components/customer-auth";
import { Alert } from "@/components/forms";
import { Button, Card, cn, Field, Input, Textarea } from "@/components/ui";
import { durationLabel, formatPhone } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { onlineAmountCents } from "@/lib/pricing";
import { formatDateLong, minutesToHHMM } from "@/lib/time";
import { customerSignOut, type CustomerProfile } from "@/app/cliente/actions";
import { createBooking } from "./actions";

type Service = { id: string; name: string; description: string | null; durationMin: number; priceCents: number };
type Professional = { id: string; name: string; color: string; serviceIds: string[]; weekdays: number[] };
type Day = { date: string; weekday: number; label: string; day: string; month: string };

const STEPS = ["Serviço", "Profissional", "Horário", "Seus dados"];
const SAVED_CONTACT = "agendamento:contato";

export function BookingFlow({
  slug,
  services,
  professionals,
  days,
  payment,
  customer: initialCustomer,
}: {
  slug: string;
  customer: CustomerProfile | null;
  services: Service[];
  professionals: Professional[];
  days: Day[];
  payment: { paymentMode: PaymentMode; depositPercent: number; holdMin: number };
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [professionalId, setProfessionalId] = useState("any");
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [slots, setSlots] = useState<number[] | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [customer, setCustomer] = useState(initialCustomer);
  const [mode, setMode] = useState<"guest" | "account">("guest");
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const chosen = services.filter((s) => serviceIds.includes(s.id));
  const total = chosen.reduce((sum, s) => sum + s.priceCents, 0);
  const duration = chosen.reduce((sum, s) => sum + s.durationMin, 0);
  const payNow = onlineAmountCents(payment, total);

  const eligible = useMemo(
    () => professionals.filter((p) => serviceIds.every((id) => p.serviceIds.includes(id))),
    [professionals, serviceIds],
  );
  const candidates = professionalId === "any" ? eligible : eligible.filter((p) => p.id === professionalId);
  const workingDays = new Set(candidates.flatMap((p) => p.weekdays));
  const professional = professionals.find((p) => p.id === professionalId);

  useEffect(() => {
    if (!date || !serviceIds.length) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ data: date, servicos: serviceIds.join(","), prof: professionalId });
    fetch(`/api/agendar/${slug}/horarios?${params}`, { signal: controller.signal, cache: "no-store" })
      .then((res) => res.json())
      .then((data: { slots: number[] }) => setSlots(data.slots))
      .catch(() => {});
    return () => controller.abort();
  }, [slug, date, serviceIds, professionalId]);

  function toggleService(id: string) {
    setServiceIds((current) => (current.includes(id) ? current.filter((s) => s !== id) : [...current, id]));
    setTime(null);
    setSlots(null);
  }

  function chooseProfessional(id: string) {
    setProfessionalId(id);
    setTime(null);
    setSlots(null);
    setStep(2);
  }

  function chooseDate(value: string) {
    setDate(value);
    setTime(null);
    setSlots(null);
  }

  function chooseTime(slot: number) {
    setTime(slot);
    setStep(3);
    // Sem conta, preenche os dados de quem já agendou neste aparelho.
    if (customer || name || phone) return;
    try {
      const saved = JSON.parse(localStorage.getItem(SAVED_CONTACT) ?? "null");
      if (saved?.name) setName(saved.name);
      if (saved?.phone) setPhone(saved.phone);
      if (saved?.email) setEmail(saved.email);
    } catch {}
  }

  function submit() {
    if (date === null || time === null) return;
    setError(null);
    startSubmit(async () => {
      const result = await createBooking({ slug, serviceIds, professionalId, date, time, name, phone, email, notes });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      try {
        if (!customer) localStorage.setItem(SAVED_CONTACT, JSON.stringify({ name, phone, email }));
      } catch {}
      if (/^https?:\/\//.test(result.redirectTo)) window.location.assign(result.redirectTo);
      else router.push(result.redirectTo);
    });
  }

  const canSubmit = customer ? true : mode === "guest" && name.trim().length >= 2 && phone.replace(/\D/g, "").length >= 10;

  const periods = [
    { label: "Manhã", items: (slots ?? []).filter((s) => s < 12 * 60) },
    { label: "Tarde", items: (slots ?? []).filter((s) => s >= 12 * 60 && s < 18 * 60) },
    { label: "Noite", items: (slots ?? []).filter((s) => s >= 18 * 60) },
  ].filter((p) => p.items.length);

  return (
    <div className="pb-28">
      <ol className="mb-6 grid grid-cols-4 gap-2" aria-label="Etapas">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              className="flex w-full flex-col gap-1.5 text-left disabled:cursor-default"
              aria-current={i === step ? "step" : undefined}
            >
              <span className={cn("h-1 rounded-full", i <= step ? "bg-brand" : "bg-line")} />
              <span className={cn("text-xs font-medium", i === step ? "text-fg" : "text-muted")}>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <section>
          <h2 className="mb-1 font-display text-2xl font-semibold">O que você vai fazer?</h2>
          <p className="mb-4 text-sm text-muted">Pode escolher mais de um.</p>
          {services.length === 0 && <p className="text-sm text-muted">Nenhum serviço disponível para agendar no momento.</p>}
          <div className="flex flex-col gap-2">
            {services.map((s) => {
              const active = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleService(s.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex items-center gap-3 rounded-card border bg-surface p-4 text-left transition",
                    active ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-muted/50",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-md border",
                      active ? "border-brand bg-brand text-brand-fg" : "border-line",
                    )}
                  >
                    {active && <Check className="size-3.5" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{s.name}</span>
                    {s.description && <span className="block text-sm text-muted">{s.description}</span>}
                    <span className="block text-sm text-muted">{durationLabel(s.durationMin)}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatMoney(s.priceCents)}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">Com quem?</h2>
          {eligible.length === 0 ? (
            <p className="text-sm text-muted">Nenhum profissional faz todos esses serviços juntos. Volte e mude a escolha.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {eligible.length > 1 && (
                <ChoiceButton active={professionalId === "any"} onClick={() => chooseProfessional("any")}>
                  <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted" aria-hidden>
                    <Users className="size-5" />
                  </span>
                  <span>
                    <span className="block font-medium">Sem preferência</span>
                    <span className="block text-sm text-muted">Mostra os horários de todos</span>
                  </span>
                </ChoiceButton>
              )}
              {eligible.map((p) => (
                <ChoiceButton key={p.id} active={professionalId === p.id} onClick={() => chooseProfessional(p.id)}>
                  <span
                    className="grid size-10 place-items-center rounded-full font-semibold text-white"
                    style={{ background: p.color }}
                    aria-hidden
                  >
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">{p.name}</span>
                </ChoiceButton>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="mb-4 font-display text-2xl font-semibold">Quando?</h2>
          <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-2">
            {days.map((d) => {
              const disabled = !workingDays.has(d.weekday);
              const active = date === d.date;
              return (
                <button
                  key={d.date}
                  type="button"
                  disabled={disabled}
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

          {!date && <p className="text-sm text-muted">Escolha um dia para ver os horários livres.</p>}
          {date && slots === null && <p className="text-sm text-muted">Buscando horários...</p>}
          {date && slots?.length === 0 && <p className="text-sm text-muted">Não há horários livres nesse dia. Tente outro dia.</p>}
          {periods.map((period) => (
            <div key={period.label} className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-muted">{period.label}</h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {period.items.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => chooseTime(slot)}
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
        </section>
      )}

      {step === 3 && date && time !== null && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-2xl font-semibold">Seus dados</h2>
          <Card className="p-4 text-sm">
            <p className="font-medium">
              {formatDateLong(date)} às {minutesToHHMM(time)}
            </p>
            <p className="text-muted">
              {chosen.map((s) => s.name).join(" + ")} · {durationLabel(duration)}
              {professional ? ` · com ${professional.name}` : ""}
            </p>
          </Card>
          {customer ? (
            <Card className="flex items-center gap-3 p-4">
              <CircleUserRound className="size-8 shrink-0 text-brand" aria-hidden />
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">Agendando como {customer.name}</p>
                <p className="truncate text-muted">
                  {customer.email} · {formatPhone(customer.phone)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await customerSignOut();
                  setCustomer(null);
                  setMode("guest");
                  router.refresh();
                }}
              >
                Sair
              </Button>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Como quer continuar">
                <ChoiceButton active={mode === "guest"} onClick={() => setMode("guest")}>
                  <span className="text-sm">
                    <span className="block font-medium">Sem cadastro</span>
                    <span className="block text-muted">Só nome e WhatsApp</span>
                  </span>
                </ChoiceButton>
                <ChoiceButton active={mode === "account"} onClick={() => setMode("account")}>
                  <span className="text-sm">
                    <span className="block font-medium">Com minha conta</span>
                    <span className="block text-muted">Dados salvos para as próximas vezes</span>
                  </span>
                </ChoiceButton>
              </div>
              {mode === "account" ? (
                <CustomerAuthForms
                  onDone={(profile) => {
                    setCustomer(profile);
                    setError(null);
                    router.refresh();
                  }}
                />
              ) : (
                <>
                  <Field label="Seu nome">
                    <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
                  </Field>
                  <Field label="WhatsApp" hint="Para falarmos com você sobre o horário.">
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="(11) 98765-4321"
                      required
                    />
                  </Field>
                  <Field label="E-mail (opcional)">
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
                  </Field>
                </>
              )}
            </>
          )}
          <Field label="Observação (opcional)">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
          </Field>
          <PaymentNote mode={payment.paymentMode} payNow={payNow} total={total} holdMin={payment.holdMin} />
          {error && <Alert tone="error">{error}</Alert>}
        </section>
      )}

      {chosen.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold tabular-nums">{formatMoney(total)}</p>
              <p className="truncate text-xs text-muted">
                {chosen.length} serviço(s) · {durationLabel(duration)}
              </p>
            </div>
            {step > 0 && (
              <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>
                Voltar
              </Button>
            )}
            {step === 0 && (
              <Button type="button" onClick={() => setStep(eligible.length === 1 ? 2 : 1)} disabled={!eligible.length}>
                Continuar
              </Button>
            )}
            {step === 3 && (
              <Button type="button" onClick={submit} disabled={submitting || !canSubmit}>
                {submitting ? "Aguarde..." : payNow > 0 ? `Pagar ${formatMoney(payNow)}` : "Confirmar agendamento"}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChoiceButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-3 rounded-card border bg-surface p-3 text-left transition",
        active ? "border-brand ring-2 ring-brand/20" : "border-line hover:border-muted/50",
      )}
    >
      {children}
    </button>
  );
}

function PaymentNote({ mode, payNow, total, holdMin }: { mode: PaymentMode; payNow: number; total: number; holdMin: number }) {
  if (payNow <= 0) {
    return <p className="rounded-control bg-surface-2 p-3 text-sm">O pagamento é feito no local, no dia do atendimento.</p>;
  }
  return (
    <div className="rounded-control border border-brand/30 bg-brand/5 p-3 text-sm">
      {mode === "DEPOSIT" ? (
        <p>
          Para garantir o horário, você paga um sinal de <b>{formatMoney(payNow)}</b> agora, por Pix ou cartão. Os{" "}
          <b>{formatMoney(total - payNow)}</b> restantes você paga no local.
        </p>
      ) : (
        <p>
          Para garantir o horário, você paga <b>{formatMoney(payNow)}</b> agora, por Pix ou cartão.
        </p>
      )}
      <p className="mt-1 text-muted">O horário fica reservado por {holdMin} minutos enquanto você paga.</p>
    </div>
  );
}
