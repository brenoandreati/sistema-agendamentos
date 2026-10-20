import { CalendarCheck, QrCode, Wallet } from "lucide-react";
import { NicheChoice } from "@/components/niche-choice";
import { AppMark } from "@/components/shop-mark";
import { LinkButton } from "@/components/ui";
import { BRAND } from "@/config/brand";

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Agenda online 24h",
    text: "Seu cliente escolhe o serviço, o profissional e o horário pelo link, sem precisar te chamar no WhatsApp.",
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
        <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <AppMark /> {BRAND.name}
        </span>
        <LinkButton href="/entrar" variant="ghost">
          Entrar
        </LinkButton>
      </header>

      <section className="pt-12 pb-10 text-center sm:pt-20">
        <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          A agenda e o caixa do seu negócio no mesmo lugar
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">{BRAND.tagline}.</p>
      </section>

      <section id="comecar" className="mx-auto mb-16 w-full max-w-3xl">
        <h2 className="mb-1 text-center text-xl font-semibold">O que você faz?</h2>
        <p className="mb-5 text-center text-sm text-muted">Escolha a sua área para começar o cadastro grátis.</p>
        <NicheChoice />
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
