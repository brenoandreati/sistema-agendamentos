import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input } from "@/components/ui";
import { findPasswordReset } from "@/lib/admin";
import { resetPassword } from "../actions";

export const metadata: Metadata = { title: "Criar senha nova", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/redefinir-senha">) {
  const { codigo } = await searchParams;
  const code = typeof codigo === "string" ? codigo : "";
  const reset = await findPasswordReset(code);

  if (!reset) {
    return (
      <Card className="p-6 text-center">
        <h1 className="text-lg font-semibold">Este link não vale mais</h1>
        <p className="mt-2 text-sm text-muted">Ele já foi usado ou passou do prazo. Peça um link novo ao suporte.</p>
        <Link href="/esqueci-senha" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
          Falar com o suporte
        </Link>
      </Card>
    );
  }

  const name = (reset.user?.name ?? reset.customer?.name ?? "").split(" ")[0];
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">Criar senha nova</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        Olá, {name}! Escolha uma senha nova para {reset.user ? "o painel do seu negócio" : "a sua conta"}. Os aparelhos que
        estavam conectados vão precisar entrar de novo.
      </p>
      <ActionForm action={resetPassword} className="flex flex-col gap-4">
        <input type="hidden" name="codigo" value={code} />
        <Field label="Senha nova" hint="Mínimo de 8 caracteres.">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={200} required />
        </Field>
        <Field label="Repita a senha nova">
          <Input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={200} required />
        </Field>
        <SubmitButton pendingText="Salvando...">Salvar senha e entrar</SubmitButton>
      </ActionForm>
    </Card>
  );
}
