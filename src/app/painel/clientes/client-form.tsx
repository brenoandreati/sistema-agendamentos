import type { Client } from "@prisma/client";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Textarea } from "@/components/ui";
import { formatPhone } from "@/lib/format";
import { saveClient } from "./actions";

export function ClientForm({ client }: { client?: Client }) {
  return (
    <ActionForm action={saveClient} className="flex flex-col gap-4">
      {client && <input type="hidden" name="id" value={client.id} />}
      <Field label="Nome">
        <Input name="name" defaultValue={client?.name} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Telefone (WhatsApp)">
          <Input name="phone" type="tel" inputMode="tel" defaultValue={client ? formatPhone(client.phone) : ""} required placeholder="(11) 98765-4321" />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" defaultValue={client?.email ?? ""} />
        </Field>
      </div>
      <Field label="Observações" hint="Preferências, tipo de corte, alergias...">
        <Textarea name="notes" defaultValue={client?.notes ?? ""} />
      </Field>
      <div>
        <SubmitButton>{client ? "Salvar" : "Cadastrar cliente"}</SubmitButton>
      </div>
    </ActionForm>
  );
}
