import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, PageHeader, Select } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPhone, PAYMENT_METHOD } from "@/lib/format";
import { isDateStr, todayStr } from "@/lib/time";
import { registerIncome } from "../actions";

export const metadata: Metadata = { title: "Entrada avulsa" };

export default async function IncomePage({ searchParams }: PageProps<"/painel/financeiro/entrada">) {
  const { shop } = await requireUser();
  const { data } = await searchParams;
  const date = isDateStr(data) ? data : todayStr(shop.timezone);
  const clients = await db.client.findMany({ where: { shopId: shop.id }, orderBy: { name: "asc" }, select: { id: true, name: true, phone: true } });

  return (
    <>
      <PageHeader
        title="Entrada avulsa"
        description="Para dinheiro que entrou sem agendamento: cliente que chegou sem marcar, venda de produto etc."
        back={{ href: "/painel/financeiro", label: "Financeiro" }}
      />
      <Card className="max-w-xl p-5">
        <ActionForm action={registerIncome} className="flex flex-col gap-4">
          <Field label="Descrição">
            <Input name="description" required placeholder="Ex.: Corte sem agendamento" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor (R$)">
              <Input name="amount" inputMode="decimal" required placeholder="40,00" />
            </Field>
            <Field label="Forma de pagamento">
              <Select name="method" defaultValue="PIX">
                {Object.entries(PAYMENT_METHOD).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data">
              <Input name="date" type="date" defaultValue={date} required />
            </Field>
            <Field label="Cliente (opcional)">
              <Select name="clientId" defaultValue="">
                <option value="">Sem cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {formatPhone(c.phone)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div>
            <SubmitButton>Registrar entrada</SubmitButton>
          </div>
        </ActionForm>
      </Card>
    </>
  );
}
