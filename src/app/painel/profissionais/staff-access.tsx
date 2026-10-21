"use client";

import { useState, useTransition } from "react";
import { KeyRound, MessageCircle } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { ActionForm, Alert, SubmitButton } from "@/components/forms";
import { Button, buttonClass, Card, Field, Input } from "@/components/ui";
import { whatsappLink } from "@/lib/format";
import { removeStaffAccess, staffAccessLink, type StaffAccessResult } from "./actions";

/** Cartão "Acesso ao painel" do profissional: cria o login e gera o link para ele criar a senha. */
export function StaffAccess({
  professional,
  shopName,
  email,
  locked,
}: {
  professional: { id: string; name: string; phone: string | null; active: boolean };
  shopName: string;
  /** E-mail do login, se já existe. */
  email: string | null;
  /** Demonstração: não cria logins. */
  locked?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<StaffAccessResult | null>(null);
  const [pending, startTransition] = useTransition();
  const firstName = professional.name.split(" ")[0];

  function generate() {
    startTransition(async () => setResult(await staffAccessLink(professional.id, typed)));
  }

  const message = result?.url
    ? `Olá, ${firstName}! Criei seu acesso à agenda de ${shopName} no Arvan Agendamentos. ` +
      `Abra este link para criar sua senha (vale por ${result.hours} horas): ${result.url}\n` +
      `Depois é só entrar com o e-mail ${result.email}.`
    : "";

  return (
    <Card className="flex max-w-3xl flex-col gap-3 p-5">
      <div>
        <h2 className="font-semibold">Acesso ao painel</h2>
        <p className="mt-1 text-sm text-muted">
          Com um login, {firstName} vê e mexe só na própria agenda pelo celular: agenda, remarca, conclui e registra pagamento. Não vê o
          financeiro, os clientes nem as configurações do negócio.
        </p>
      </div>

      {locked ? (
        <p className="text-sm text-muted">Na demonstração não dá para criar logins.</p>
      ) : !professional.active ? (
        <p className="text-sm text-muted">Ative o profissional para poder criar o acesso.</p>
      ) : result?.url ? (
        <div className="flex flex-col gap-2 rounded-control border border-brand/30 bg-brand/5 p-3 text-sm">
          <p>
            Pronto! Mande o link para {firstName} criar a senha. Ele vale por {result.hours} horas e só pode ser usado uma vez. Depois,{" "}
            {firstName} entra com o e-mail <b>{result.email}</b>.
          </p>
          <div className="flex flex-wrap gap-2">
            {professional.phone && (
              <a href={whatsappLink(professional.phone, message)} target="_blank" rel="noreferrer" className={buttonClass("primary", "sm")}>
                <MessageCircle className="size-4" aria-hidden /> Mandar no WhatsApp
              </a>
            )}
            <CopyButton value={message} label="Copiar mensagem" />
          </div>
        </div>
      ) : email ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Entra com o e-mail <b>{email}</b>.
          </p>
          {result?.error && <Alert tone="error">{result.error}</Alert>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={generate}>
              <KeyRound className="size-4" aria-hidden /> {pending ? "Gerando..." : "Link de senha nova"}
            </Button>
            <ActionForm action={removeStaffAccess} confirm={`Remover o acesso de ${firstName}? A agenda continua igual.`}>
              <input type="hidden" name="professionalId" value={professional.id} />
              <SubmitButton variant="danger" size="sm" pendingText="Removendo...">
                Remover acesso
              </SubmitButton>
            </ActionForm>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            generate();
          }}
        >
          {result?.error && <Alert tone="error">{result.error}</Alert>}
          <div className="flex flex-wrap items-end gap-2">
            <Field label={`E-mail de ${firstName}`} className="min-w-60 flex-1">
              <Input type="email" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" required maxLength={254} />
            </Field>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando..." : "Criar acesso"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
