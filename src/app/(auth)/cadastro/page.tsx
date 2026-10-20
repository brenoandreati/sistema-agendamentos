import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/forms";
import { NicheChoice } from "@/components/niche-choice";
import { Card, Field, Input } from "@/components/ui";
import { NICHES, nicheFromSlug } from "@/config/niches";
import { getSession } from "@/lib/auth";
import { brandStyle } from "@/lib/format";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Criar conta" };

export default async function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  if (await getSession()) redirect("/painel");
  const niche = nicheFromSlug((await searchParams).tipo);

  if (!niche) {
    return (
      <div>
        <h1 className="mb-1 text-center text-lg font-semibold">O que você faz?</h1>
        <p className="mb-5 text-center text-sm text-muted">Escolha a sua área para começar.</p>
        <NicheChoice singleColumn />
        <LoginLink />
      </div>
    );
  }

  const config = NICHES[niche];
  return (
    <div style={brandStyle(config.color)}>
      <Card className="p-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-brand-fg">
            <config.icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">Criar conta</h1>
            <p className="text-sm text-muted">
              {config.choice} ·{" "}
              <Link href="/cadastro" className="text-brand hover:underline">
                trocar
              </Link>
            </p>
          </div>
        </div>
        <p className="mb-5 text-sm text-muted">
          Já deixamos alguns serviços e horários prontos para você ajustar depois.
        </p>
        <ActionForm action={signUp} className="flex flex-col gap-4">
          <input type="hidden" name="tipo" value={config.slug} />
          <Field label="Nome do seu negócio">
            <Input name="shopName" required placeholder={config.namePlaceholder} />
          </Field>
          <Field label="Seu nome">
            <Input name="name" autoComplete="name" required />
          </Field>
          <Field label="WhatsApp" hint="Aparece para os clientes na página de agendamento.">
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
      </Card>
      <LoginLink />
    </div>
  );
}

function LoginLink() {
  return (
    <p className="mt-5 text-center text-sm text-muted">
      Já tem conta?{" "}
      <Link href="/entrar" className="font-medium text-brand hover:underline">
        Entrar
      </Link>
    </p>
  );
}
