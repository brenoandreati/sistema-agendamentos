import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Checkbox, EmptyState, Field, Input, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateShort, formatTime, isDateStr, todayStr, toDateStr } from "@/lib/time";
import { createBlock, deleteBlock } from "../actions";

export const metadata: Metadata = { title: "Bloquear horário" };

export default async function BlockPage({ searchParams }: PageProps<"/painel/agenda/bloquear">) {
  const { shop } = await requireUser();
  const query = await searchParams;
  const date = isDateStr(query.data) ? query.data : todayStr(shop.timezone);

  const [professionals, upcoming] = await Promise.all([
    db.professional.findMany({ where: { shopId: shop.id, active: true }, orderBy: { sortOrder: "asc" } }),
    db.timeBlock.findMany({
      where: { shopId: shop.id, endAt: { gt: new Date() } },
      include: { professional: true },
      orderBy: { startAt: "asc" },
      take: 50,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Bloquear horário"
        description="Folga, compromisso ou feriado: ninguém consegue agendar no horário bloqueado."
        back={{ href: `/painel/agenda?data=${date}`, label: "Agenda" }}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Card className="p-5">
          <ActionForm action={createBlock} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium">Profissionais</legend>
              {professionals.map((p) => (
                <Checkbox key={p.id} name="professionalIds" value={p.id} label={p.name} defaultChecked={professionals.length === 1} />
              ))}
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Data">
                <Input name="date" type="date" defaultValue={date} required />
              </Field>
              <Field label="Das">
                <Input name="start" type="time" defaultValue="12:00" step={300} />
              </Field>
              <Field label="Até">
                <Input name="end" type="time" defaultValue="13:00" step={300} />
              </Field>
            </div>
            <Checkbox name="allDay" label="Dia inteiro" />
            <Field label="Motivo" hint="Opcional. Só você vê.">
              <Input name="reason" placeholder="Ex.: consulta médica" />
            </Field>
            <div>
              <SubmitButton>Bloquear</SubmitButton>
            </div>
          </ActionForm>
        </Card>

        <section>
          <h2 className="mb-3 font-semibold">Próximos bloqueios</h2>
          {upcoming.length === 0 ? (
            <EmptyState title="Nenhum bloqueio" />
          ) : (
            <Card className="divide-y divide-line">
              {upcoming.map((b) => (
                <div key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {formatDateShort(toDateStr(b.startAt, shop.timezone))} · {formatTime(b.startAt, shop.timezone)}–
                      {formatTime(b.endAt, shop.timezone)}
                    </p>
                    <p className="truncate text-muted">
                      {b.professional.name}
                      {b.reason ? ` · ${b.reason}` : ""}
                    </p>
                  </div>
                  <ActionForm action={deleteBlock}>
                    <input type="hidden" name="id" value={b.id} />
                    <SubmitButton variant="ghost" size="sm" pendingText="...">
                      Remover
                    </SubmitButton>
                  </ActionForm>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </>
  );
}
