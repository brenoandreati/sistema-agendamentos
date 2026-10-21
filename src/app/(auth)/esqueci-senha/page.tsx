import Link from "next/link";
import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { buttonClass, Card } from "@/components/ui";
import { supportWhatsapp } from "@/lib/admin";
import { whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/esqueci-senha">) {
  const customer = (await searchParams).conta === "cliente";
  const support = supportWhatsapp();
  const message = customer
    ? "Olá! Esqueci a senha da minha conta de cliente no Arvan Agendamentos. Meu e-mail é: "
    : "Olá! Esqueci a senha do painel do meu negócio no Arvan Agendamentos. Meu e-mail é: ";

  return (
    <Card className="p-6">
      <h1 className="text-lg font-semibold">Esqueci minha senha</h1>
      <p className="mt-2 text-sm text-muted">
        Fale com o suporte pelo WhatsApp e informe o e-mail da sua conta. Você recebe um link para criar uma senha nova, que vale
        por 24 horas.
      </p>
      {support ? (
        <a href={whatsappLink(support, message)} target="_blank" rel="noreferrer" className={buttonClass("primary", "md", "mt-5 w-full")}>
          <MessageCircle className="size-4" aria-hidden /> Falar com o suporte
        </a>
      ) : (
        <p className="mt-5 rounded-control bg-surface-2 p-3 text-sm">Fale com a pessoa que te passou o acesso ao Arvan.</p>
      )}
      <p className="mt-5 text-center text-sm">
        <Link href={customer ? "/cliente" : "/entrar"} className="text-muted hover:text-fg hover:underline">
          Voltar
        </Link>
      </p>
    </Card>
  );
}
