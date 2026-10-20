import { CalendarCheck, QrCode, Wallet } from "lucide-react";
import { LinkButton } from "@/components/ui";
import { BRAND } from "@/config/brand";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Agenda online 24h",
    text: "Seu cliente escolhe o serviço, o barbeiro e o horário pelo link, sem precisar te chamar no WhatsApp.",
  },
  {
    icon: QrCode,
    title: "Pagamento na hora de agendar",
    text: "Pix ou cartão pelo Mercado Pago. O horário só é confirmado depois do pagamento, e as faltas diminuem.",
  },
  {
    icon: Wallet,
    title: "Financeiro sem planilha",
    text: "Veja quanto entrou por dia, semana e mês, quem já pagou e quem ainda falta pagar.",
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4">
      <header className="flex items-center justify-between py-5">
        <span className="text-lg font-semibold tracking-tight">
          <span className="text-brand">✂</span> {BRAND.name}
        </span>
        <LinkButton href="/entrar" variant="ghost">
          Entrar
        </LinkButton>
      </header>

      <section className="py-16 text-center sm:py-24">
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          A agenda e o caixa da sua barbearia no mesmo lugar
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{BRAND.tagline}.</p>
        <div className="mt-8 flex justify-center gap-3">
          <LinkButton href="/cadastro" className="h-12 px-6 text-base">
            Criar conta grátis
          </LinkButton>
          <LinkButton href="/entrar" variant="secondary" className="h-12 px-6 text-base">
            Já tenho conta
          </LinkButton>
        </div>
      </section>

      <section className="grid gap-4 pb-20 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-line bg-surface p-5">
            <f.icon className="mb-3 size-6 text-brand" aria-hidden />
            <h2 className="font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-muted">{f.text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
