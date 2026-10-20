import type { Professional, Service } from "@prisma/client";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Checkbox, Field, Input, Textarea } from "@/components/ui";
import { centsToInput } from "@/lib/money";
import { deleteService, saveService } from "./actions";

export function ServiceForm({
  service,
  professionals,
}: {
  service?: Service & { professionals: { id: string }[] };
  professionals: Professional[];
}) {
  const assigned = new Set(service ? service.professionals.map((p) => p.id) : professionals.map((p) => p.id));
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Card className="p-5">
        <ActionForm action={saveService} className="flex flex-col gap-4">
          {service && <input type="hidden" name="id" value={service.id} />}
          <Field label="Nome do serviço">
            <Input name="name" defaultValue={service?.name} required placeholder="Ex.: Corte degradê" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duração (minutos)">
              <Input name="durationMin" type="number" min={5} max={600} step={5} defaultValue={service?.durationMin ?? 30} required />
            </Field>
            <Field label="Preço (R$)">
              <Input
                name="price"
                inputMode="decimal"
                defaultValue={service ? centsToInput(service.priceCents) : ""}
                placeholder="40,00"
                required
              />
            </Field>
          </div>
          <Field label="Descrição" hint="Opcional. Aparece para o cliente na página de agendamento.">
            <Textarea name="description" defaultValue={service?.description ?? ""} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">Quem faz esse serviço</legend>
            {professionals.map((p) => (
              <Checkbox key={p.id} name="professionalIds" value={p.id} label={p.name} defaultChecked={assigned.has(p.id)} />
            ))}
          </fieldset>
          <Checkbox name="active" label="Ativo" hint="Serviços inativos não aparecem para agendar." defaultChecked={service?.active ?? true} />
          <div>
            <SubmitButton>{service ? "Salvar alterações" : "Criar serviço"}</SubmitButton>
          </div>
        </ActionForm>
      </Card>
      {service && (
        <ActionForm action={deleteService} confirm="Excluir este serviço? Se ele já foi usado em agendamentos, será apenas desativado.">
          <input type="hidden" name="id" value={service.id} />
          <SubmitButton variant="danger" size="sm" pendingText="Excluindo...">
            Excluir serviço
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
