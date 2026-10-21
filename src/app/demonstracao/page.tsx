import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { CalendarDays, LayoutDashboard } from "lucide-react";
import { SubmitButton } from "@/components/forms";
import { AppMark } from "@/components/shop-mark";
import { BRAND } from "@/config/brand";
import { DEMO_SHOPS } from "@/config/demo";
import { NICHE_ORDER, NICHES } from "@/config/niches";
import { brandStyle } from "@/lib/format";
import { enterDemoPanel, openDemoBooking } from "./actions";

export const metadata: Metadata = { title: "Demonstração", robots: { index: false } };

export const viewport: Viewport = { themeColor: "#02081a" };

export default function DemoPage() {
  return (
    <main className="theme-arvan flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <AppMark /> {BRAND.name}
          </Link>
        </header>

        <section className="pt-8 pb-8">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Demonstração</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Um negócio de exemplo para cada área, com agenda, clientes e financeiro dos últimos 30 dias. Não precisa de conta. Pode
            mexer à vontade: o botão &quot;Restaurar dados&quot; do painel volta tudo ao normal. As configurações ficam travadas.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Se você estiver logado na sua conta, ela é desconectada ao abrir o painel de uma demonstração.
          </p>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2">
          {NICHE_ORDER.map((niche) => {
            const config = NICHES[niche];
            const demo = DEMO_SHOPS[niche];
            return (
              <div
                key={niche}
                data-niche={niche}
                style={brandStyle(config.color)}
                className="overflow-hidden rounded-card border border-line bg-surface"
              >
                <div className="relative overflow-hidden bg-linear-to-br from-hero-from to-hero-to p-5 text-white">
                  <config.icon className="pointer-events-none absolute -right-4 -bottom-8 size-32 opacity-15" aria-hidden />
                  <p className="text-sm text-white/80">{demo.area}</p>
                  <h2 className="mt-0.5 font-display text-2xl font-semibold tracking-tight">{demo.name}</h2>
                  <p className="mt-1 text-sm text-white/85">{demo.highlight}</p>
                </div>
                <div className="flex flex-col gap-4 p-5">
                  <p className="text-sm text-muted">{demo.services.map((s) => s.name).join(" · ")}</p>
                  <div className="flex flex-wrap gap-2">
                    <form action={enterDemoPanel}>
                      <input type="hidden" name="niche" value={niche} />
                      <SubmitButton pendingText="Abrindo...">
                        <LayoutDashboard className="size-4" aria-hidden /> Abrir painel
                      </SubmitButton>
                    </form>
                    <form action={openDemoBooking}>
                      <input type="hidden" name="niche" value={niche} />
                      <SubmitButton variant="secondary" pendingText="Abrindo...">
                        <CalendarDays className="size-4" aria-hidden /> Página de agendamento
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
