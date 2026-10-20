"use client";

import { useState, useTransition } from "react";
import { customerSignIn, customerSignUp, type CustomerProfile } from "@/app/cliente/actions";
import { Alert } from "./forms";
import { Button, cn, Field, Input } from "./ui";

/** Entrar ou criar a conta de cliente. Chama `onDone` com os dados da conta quando dá certo. */
export function CustomerAuthForms({ onDone }: { onDone: (customer: CustomerProfile) => void }) {
  const [tab, setTab] = useState<"entrar" | "criar">("entrar");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await (tab === "entrar" ? customerSignIn(data) : customerSignUp(data));
      if (result.customer) onDone(result.customer);
      else setError(result.error ?? "Não foi possível continuar. Tente de novo.");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 rounded-lg border border-line bg-surface p-0.5" role="tablist">
        {(["entrar", "criar"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value);
              setError(null);
            }}
            className={cn(
              "rounded-md py-1.5 text-sm font-medium transition",
              tab === value ? "bg-brand text-brand-fg" : "text-muted hover:text-fg",
            )}
          >
            {value === "entrar" ? "Já tenho conta" : "Criar conta"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="flex flex-col gap-4">
        {error && <Alert tone="error">{error}</Alert>}
        {tab === "criar" && (
          <>
            <Field label="Seu nome">
              <Input name="name" autoComplete="name" required />
            </Field>
            <Field label="WhatsApp">
              <Input name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 98765-4321" required />
            </Field>
          </>
        )}
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha" hint={tab === "criar" ? "Mínimo de 6 caracteres." : undefined}>
          <Input
            name="password"
            type="password"
            autoComplete={tab === "criar" ? "new-password" : "current-password"}
            minLength={tab === "criar" ? 6 : undefined}
            required
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Aguarde..." : tab === "entrar" ? "Entrar" : "Criar minha conta"}
        </Button>
      </form>
    </div>
  );
}
