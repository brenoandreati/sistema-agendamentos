import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CalendarCheck, QrCode, Wallet } from "lucide-react";
import { NicheChoice } from "@/components/niche-choice";
import { AppMark } from "@/components/shop-mark";
import { LinkButton } from "@/components/ui";
import { BRAND } from "@/config/brand";

export const viewport: Viewport = { themeColor: "#02081a" };

export const metadata: Metadata = {
  openGraph: {
    title: BRAND.name,
    description: `${BRAND.tagline}. Agenda online, pagamento na hora de agendar e financeiro para barbearias, salões, nail designers e estética.`,
    type: "website",
  },
};

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Agenda online 24h",
    text: "Seu cliente escolhe o profissional, o serviço e o horário pelo link, sem precisar te chamar no WhatsApp.",
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
    <main className="theme-arvan relative flex flex-1 flex-col overflow-hidden">
      {/* Brilho azul atrás do topo, no tom da logo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(ellipse_60%_55%_at_50%_0%,rgba(0,60,252,0.32),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-4">
        <header className="flex items-center justify-between py-5">
          <span className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <AppMark className="h-8" /> {BRAND.name}
          </span>
          <LinkButton href="/entrar" variant="ghost">
            Entrar
          </LinkButton>
        </header>

        <section className="flex flex-col items-center pt-14 pb-12 text-center sm:pt-20">
          <AppMark className="mb-8 h-20 drop-shadow-[0_8px_32px_rgba(0,60,252,0.45)] sm:h-24" />
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            A agenda e o caixa do seu negócio no mesmo lugar
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted">{BRAND.tagline}.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="#comecar">Começar grátis</LinkButton>
            <LinkButton href="/entrar" variant="secondary">
              Já tenho conta
            </LinkButton>
          </div>
        </section>

        <section id="comecar" className="mx-auto mb-16 w-full max-w-3xl scroll-mt-6">
          <h2 className="mb-1 text-center text-xl font-semibold">O que você faz?</h2>
          <p className="mb-5 text-center text-sm text-muted">Escolha a sua área para começar o cadastro grátis.</p>
          <NicheChoice />
        </section>

        <section className="grid gap-4 pb-16 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-card border border-line bg-surface p-5">
              <span className="mb-3 grid size-10 place-items-center rounded-control bg-brand/15 text-brand">
                <f.icon className="size-5" aria-hidden />
              </span>
              <h2 className="font-semibold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted">{f.text}</p>
            </div>
          ))}
        </section>

        <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-line py-6 text-sm text-muted">
          <span className="flex items-center gap-2">
            <AppMark className="h-4" /> {BRAND.name}
          </span>
          <Link href="/termos" className="hover:text-fg">
            Termos de uso
          </Link>
          <Link href="/privacidade" className="hover:text-fg">
            Privacidade
          </Link>
        </footer>
      </div>
    </main>
  );
}
