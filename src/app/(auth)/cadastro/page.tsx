import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage() {
  if (await getSession()) redirect("/painel");
  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">Criar conta</h1>
      <p className="mt-1 mb-5 text-sm text-muted">
        Cadastre sua barbearia. Já deixamos alguns serviços e horários prontos para você ajustar.
      </p>
      <ActionForm action={signUp} className="flex flex-col gap-4">
        <Field label="Nome da barbearia">
          <Input name="shopName" required placeholder="Ex.: Barbearia do Zé" />
        </Field>
        <Field label="Seu nome">
          <Input name="name" autoComplete="name" required />
        </Field>
        <Field label="WhatsApp da barbearia" hint="Aparece para os clientes na página de agendamento.">
          <Input name="phone" type="tel" inputMode="tel" placeholder="(11) 98765-4321" />
        </Field>
        <Field label="E-mail">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Senha" hint="Mínimo de 6 caracteres.">
          <Input name="password" type="password" autoComplete="new-password" minLength={6} required />
        </Field>
        <SubmitButton pendingText="Criando...">Criar conta</SubmitButton>
      </ActionForm>
      <p className="mt-5 text-center text-sm text-muted">
        Já tem conta?{" "}
        <Link href="/entrar" className="font-medium text-brand hover:underline">
          Entrar
        </Link>
      </p>
    </Card>
  );
}
