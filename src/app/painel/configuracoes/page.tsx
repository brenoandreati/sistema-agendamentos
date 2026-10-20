import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/copy-button";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, Checkbox, Field, Input, Select } from "@/components/ui";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { formatPhone } from "@/lib/format";
import { mercadoPagoToken } from "@/lib/payments";
import { changePassword, saveAppearance, savePaymentSettings, saveScheduleRules, saveShopInfo } from "./actions";

export const metadata: Metadata = { title: "Configurações" };

const INTERVALS = [10, 15, 20, 30, 40, 45, 60];
const NOTICES = [
  { value: 0, label: "Sem antecedência" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 240, label: "4 horas" },
  { value: 720, label: "12 horas" },
  { value: 1440, label: "1 dia" },
];
const HOLDS = [10, 15, 20, 30, 60];

export default async function SettingsPage() {
  const user = await requireUser();
  const { shop } = user;
  const bookingPath = `/agendar/${shop.slug}`;
  const hasOwnToken = Boolean(shop.mpAccessToken);
  const paymentsLive = Boolean(mercadoPagoToken(shop));

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="flex max-w-3xl flex-col gap-6">
        <Section title="Barbearia" description="Esses dados aparecem para o cliente na página de agendamento.">
          <ActionForm action={saveShopInfo} className="flex flex-col gap-4">
            <Field label="Nome">
              <Input name="name" defaultValue={shop.name} required />
            </Field>
            <Field
              label="Endereço do link de agendamento"
              hint={
                <span className="flex flex-wrap items-center gap-2">
                  Seu link: <code className="text-fg">{bookingPath}</code> <CopyButton value={bookingPath} />
                </span>
              }
            >
              <div className="flex items-center">
                <span className="flex h-10 items-center rounded-l-lg border border-r-0 border-line bg-surface-2 px-3 text-sm text-muted">/agendar/</span>
                <Input name="slug" defaultValue={shop.slug} className="rounded-l-none" required />
              </div>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp">
                <Input name="phone" type="tel" defaultValue={shop.phone ? formatPhone(shop.phone) : ""} />
              </Field>
              <Field label="Instagram">
                <Input name="instagram" defaultValue={shop.instagram ?? ""} placeholder="@suabarbearia" />
              </Field>
            </div>
            <Field label="Endereço">
              <Input name="address" defaultValue={shop.address ?? ""} placeholder="Rua, número, bairro, cidade" />
            </Field>
            <div>
              <SubmitButton>Salvar</SubmitButton>
            </div>
          </ActionForm>
        </Section>

        <Section title="Aparência" description="A cor e o logo são usados no painel e na página de agendamento.">
          <ActionForm action={saveAppearance} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-6">
              <Field label="Cor principal">
                <Input name="primaryColor" type="color" defaultValue={shop.primaryColor} className="w-20 cursor-pointer p-1" />
              </Field>
              <div className="flex items-center gap-3">
                {shop.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shop.logoUrl} alt="Logo atual" className="size-14 rounded-xl border border-line object-cover" />
                ) : (
                  <span className="grid size-14 place-items-center rounded-xl bg-brand text-xl text-brand-fg">✂</span>
                )}
                <Field label="Logo" hint="PNG, JPG ou WebP, até 300 KB. De preferência quadrado.">
                  <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="py-1.5" />
                </Field>
              </div>
            </div>
            {shop.logoUrl && <Checkbox name="removeLogo" label="Remover logo" />}
            <div>
              <SubmitButton>Salvar</SubmitButton>
            </div>
          </ActionForm>
        </Section>

        <Section title="Regras da agenda">
          <ActionForm action={saveScheduleRules} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Horários de quanto em quanto" hint="Ex.: 30 min = 9:00, 9:30, 10:00...">
                <Select name="slotIntervalMin" defaultValue={shop.slotIntervalMin}>
                  {INTERVALS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutos
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Antecedência mínima" hint="Para agendamentos online.">
                <Select name="minNoticeMin" defaultValue={shop.minNoticeMin}>
                  {NOTICES.map((n) => (
                    <option key={n.value} value={n.value}>
                      {n.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Agendar com até (dias)" hint="Quantos dias à frente o cliente vê.">
                <Input name="maxAdvanceDays" type="number" min={1} max={365} defaultValue={shop.maxAdvanceDays} />
              </Field>
            </div>
            <div>
              <SubmitButton>Salvar</SubmitButton>
            </div>
          </ActionForm>
        </Section>

        <Section
          title="Pagamento online"
          description="O cliente paga por Pix ou cartão pelo Mercado Pago na hora de agendar. O dinheiro cai direto na sua conta do Mercado Pago."
          badge={paymentsLive ? <Badge tone="success">Mercado Pago conectado</Badge> : <Badge tone="warning">Modo demonstração</Badge>}
        >
          <ActionForm action={savePaymentSettings} className="flex flex-col gap-5">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Quanto o cliente paga ao agendar</legend>
              <Radio name="paymentMode" value="FULL" defaultChecked={shop.paymentMode === "FULL"} label="Valor total" hint="O horário só é confirmado depois do pagamento." />
              <Radio name="paymentMode" value="DEPOSIT" defaultChecked={shop.paymentMode === "DEPOSIT"} label="Um sinal (parte do valor)" hint="O restante é pago na barbearia." />
              <Radio name="paymentMode" value="NONE" defaultChecked={shop.paymentMode === "NONE"} label="Nada online" hint="O agendamento é confirmado na hora e o cliente paga na barbearia." />
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Valor do sinal (%)" hint="Usado só quando a opção for sinal.">
                <Input name="depositPercent" type="number" min={5} max={100} defaultValue={shop.depositPercent} />
              </Field>
              <Field label="Tempo para pagar" hint="Depois disso o horário volta a ficar livre.">
                <Select name="paymentHoldMin" defaultValue={shop.paymentHoldMin}>
                  {HOLDS.map((m) => (
                    <option key={m} value={m}>
                      {m} minutos
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field
              label="Access Token do Mercado Pago"
              hint={
                <>
                  No Mercado Pago, vá em <b>Seu negócio → Configurações → Credenciais</b> (ou em mercadopago.com.br/developers →
                  Suas integrações) e copie o <b>Access Token de produção</b>. Sem token, o sistema funciona em modo demonstração,
                  sem cobrança de verdade.
                </>
              }
            >
              <Input
                name="mpAccessToken"
                type="password"
                autoComplete="off"
                placeholder={hasOwnToken ? "•••••••• (já configurado, cole outro para trocar)" : "APP_USR-..."}
              />
            </Field>
            {hasOwnToken && <Checkbox name="removeToken" label="Desconectar o Mercado Pago" />}
            <div>
              <SubmitButton>Salvar</SubmitButton>
            </div>
          </ActionForm>
        </Section>

        <Section title="Sua senha">
          <ActionForm action={changePassword} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Senha atual">
              <Input name="current" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="Nova senha">
              <Input name="next" type="password" autoComplete="new-password" minLength={6} required />
            </Field>
            <SubmitButton>Alterar senha</SubmitButton>
          </ActionForm>
        </Section>
      </div>
    </>
  );
}

function Section({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold">
          {title} {badge}
        </h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </Card>
  );
}

function Radio({ label, hint, ...props }: { label: string; hint: string; name: string; value: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-start gap-2.5 rounded-lg border border-line p-3 text-sm has-checked:border-brand has-checked:bg-brand/5">
      <input type="radio" className="mt-0.5 size-4 accent-brand" {...props} />
      <span>
        <span className="font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}
