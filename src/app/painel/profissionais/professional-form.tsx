import Link from "next/link";
import type { Professional, Service, WorkingHour } from "@prisma/client";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Checkbox, Field, Input } from "@/components/ui";
import { defaultWorkingHours, PROFESSIONAL_COLORS } from "@/lib/defaults";
import { durationLabel, formatPhone } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { minutesToHHMM, WEEKDAYS } from "@/lib/time";
import { deleteProfessional, saveProfessional } from "./actions";

type Hour = Pick<WorkingHour, "weekday" | "startMin" | "endMin">;

/** Agrupa os intervalos de cada dia em expediente + intervalo (almoço). */
function scheduleByDay(hours: Hour[]) {
  return WEEKDAYS.map((_, weekday) => {
    const periods = hours.filter((h) => h.weekday === weekday).sort((a, b) => a.startMin - b.startMin);
    if (!periods.length) return { on: false, start: "09:00", end: "19:00", breakStart: "", breakEnd: "" };
    return {
      on: true,
      start: minutesToHHMM(periods[0].startMin),
      end: minutesToHHMM(periods[periods.length - 1].endMin),
      breakStart: periods.length > 1 ? minutesToHHMM(periods[0].endMin) : "",
      breakEnd: periods.length > 1 ? minutesToHHMM(periods[1].startMin) : "",
    };
  });
}

export function ProfessionalForm({
  professional,
  services,
  colorIndex = 0,
}: {
  professional?: Professional & { workingHours: WorkingHour[]; services: { id: string }[] };
  services: Service[];
  colorIndex?: number;
}) {
  const schedule = scheduleByDay(professional?.workingHours ?? defaultWorkingHours());
  const assigned = new Set(professional ? professional.services.map((s) => s.id) : services.map((s) => s.id));

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <ActionForm action={saveProfessional} className="flex flex-col gap-4">
        {professional && <input type="hidden" name="id" value={professional.id} />}
        <Card className="flex flex-col gap-4 p-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Nome">
              <Input name="name" defaultValue={professional?.name} required />
            </Field>
            <Field label="Telefone">
              <Input name="phone" type="tel" defaultValue={professional?.phone ? formatPhone(professional.phone) : ""} />
            </Field>
            <Field label="Cor na agenda">
              <Input
                name="color"
                type="color"
                className="w-16 cursor-pointer p-1"
                defaultValue={professional?.color ?? PROFESSIONAL_COLORS[colorIndex % PROFESSIONAL_COLORS.length]}
              />
            </Field>
          </div>
          <div className="flex flex-col gap-2">
            <Checkbox name="active" label="Ativo" defaultChecked={professional?.active ?? true} />
            <Checkbox
              name="bookableOnline"
              label="Aparece no agendamento online"
              hint="Desmarque para agendar este profissional só pelo painel."
              defaultChecked={professional?.bookableOnline ?? true}
            />
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Serviços que faz</h2>
          <p className="mb-4 text-sm text-muted">
            No agendamento online, quem escolher este profissional só vê os serviços marcados aqui.
          </p>
          {services.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => (
                <Checkbox
                  key={s.id}
                  name="serviceIds"
                  value={s.id}
                  label={s.name}
                  hint={`${durationLabel(s.durationMin)} · ${formatMoney(s.priceCents)}`}
                  defaultChecked={assigned.has(s.id)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Nenhum serviço cadastrado ainda.{" "}
              <Link href="/painel/servicos/novo" className="text-brand underline">
                Cadastrar serviço
              </Link>
            </p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Horário de trabalho</h2>
          <p className="mb-4 text-sm text-muted">O intervalo (almoço) é opcional. Fora desses horários ninguém consegue agendar.</p>
          <div className="flex flex-col divide-y divide-line">
            {schedule.map((day, weekday) => (
              <div key={weekday} className="grid grid-cols-2 items-center gap-x-3 gap-y-2 py-3 sm:grid-cols-[8rem_1fr_1fr_1fr_1fr]">
                <label className="col-span-2 flex items-center gap-2 text-sm font-medium sm:col-span-1">
                  <input type="checkbox" name={`day${weekday}_on`} defaultChecked={day.on} className="size-4 accent-brand" />
                  {WEEKDAYS[weekday]}
                </label>
                <TimeInput label="Início" name={`day${weekday}_start`} value={day.start} />
                <TimeInput label="Fim" name={`day${weekday}_end`} value={day.end} />
                <TimeInput label="Intervalo de" name={`day${weekday}_breakStart`} value={day.breakStart} />
                <TimeInput label="até" name={`day${weekday}_breakEnd`} value={day.breakEnd} />
              </div>
            ))}
          </div>
        </Card>

        <div>
          <SubmitButton>{professional ? "Salvar alterações" : "Cadastrar profissional"}</SubmitButton>
        </div>
      </ActionForm>

      {professional && (
        <ActionForm action={deleteProfessional} confirm="Remover este profissional? Se ele já tiver agendamentos, será apenas desativado.">
          <input type="hidden" name="id" value={professional.id} />
          <SubmitButton variant="danger" size="sm" pendingText="Removendo...">
            Remover profissional
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}

function TimeInput({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <Input type="time" name={name} defaultValue={value} step={300} className="h-9" />
    </label>
  );
}
