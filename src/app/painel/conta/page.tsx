import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { changePassword } from "../configuracoes/actions";

export const metadata: Metadata = { title: "Minha senha" };

/** Senha do próprio login (usada pelo profissional da equipe, que não abre as configurações do negócio). */
export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Minha senha" description={`${user.name} · ${user.email}`} />
      <Card className="max-w-xl p-5">
        <ActionForm action={changePassword} className="flex flex-col gap-4">
          <Field label="Senha atual">
            <Input name="current" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Nova senha" hint="Mínimo de 8 caracteres. Os outros aparelhos vão precisar entrar de novo.">
            <Input name="next" type="password" autoComplete="new-password" minLength={8} maxLength={200} required />
          </Field>
          <div>
            <SubmitButton>Alterar senha</SubmitButton>
          </div>
        </ActionForm>
        <p className="mt-4 text-sm text-muted">Esqueceu a senha? Peça ao dono do negócio um link novo.</p>
      </Card>
    </>
  );
}
