import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { signIn } from "../actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function SignInPage() {
  if (await getSession()) redirect("/painel");
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">Entrar</h1>
      <p className="mt-1 mb-5 text-sm text-muted">Acesse a agenda e o financeiro do seu negócio.</p>
      <ActionForm action={signIn} className="flex flex-col gap-4">
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton pendingText="Entrando...">Entrar</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link href="/cadastro" className="font-medium text-brand hover:underline">
          Criar conta
        </Link>
      </p>
    </Card>
  );
}
