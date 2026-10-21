import Link from "next/link";
import type { Metadata } from "next";
import { CalendarPlus, ExternalLink } from "lucide-react";
import { AppointmentRow } from "@/components/appointment-row";
import { CopyButton } from "@/components/copy-button";
import { buttonClass, Card, EmptyState, LinkButton, Stat } from "@/components/ui";
import { NICHES } from "@/config/niches";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { mercadoPagoToken } from "@/lib/payments";
import { appointmentInclude, paidCents } from "@/lib/queries";
import { expireStaleHolds } from "@/lib/scheduling";
import { dayRange, formatDateLong, startOfMonth, todayStr, zonedToUtc } from "@/lib/time";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage() {
  const user = await requireUser();
  const { shop } = user;
  const tz = shop.timezone;
  const today = todayStr(tz);
  const { start, end } = dayRange(today, tz);
  await expireStaleHolds(shop.id);

  const [appointments, receivedToday, receivedMonth] = await Promise.all([
    db.appointment.findMany({
      where: { shopId: shop.id, startAt: { gte: start, lt: end }, status: { notIn: ["CANCELED", "EXPIRED"] } },
      include: appointmentInclude,
      orderBy: { startAt: "asc" },
    }),
    db.payment.aggregate({
      where: { shopId: shop.id, status: "APPROVED", paidAt: { gte: start, lt: end } },
      _sum: { amountCents: true },
    }),
    db.payment.aggregate({
      where: { shopId: shop.id, status: "APPROVED", paidAt: { gte: zonedToUtc(startOfMonth(today), 0, tz), lt: end } },
      _sum: { amountCents: true },
    }),
  ]);

  const now = new Date();
  const awaitingPayment = appointments.filter((a) => a.status === "PENDING_PAYMENT").length;
  const upcoming = appointments.filter((a) => a.endAt > now && a.status !== "COMPLETED");
  const toReceive = appointments
    .filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED")
    .reduce((sum, a) => sum + Math.max(0, a.totalCents - paidCents(a)), 0);
  const bookingPath = `/agendar/${shop.slug}`;
  const firstName = user.name.split(" ")[0];
  const niche = NICHES[shop.niche];

  return (
    <>
      <section className="relative mb-6 overflow-hidden rounded-card bg-linear-to-br from-hero-from to-hero-to p-6 text-white md:p-8">
        <niche.icon className="pointer-events-none absolute -right-6 -bottom-10 size-48 opacity-15 md:right-6" aria-hidden />
        <p className="text-sm text-white/80">{formatDateLong(today)}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight lining-nums md:text-4xl">Olá, {firstName}!</h1>
        <p className="mt-2 max-w-md text-white/85">{niche.welcome}</p>
        <Link
          href="/painel/agenda/novo"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-button bg-white px-4 text-sm font-medium text-zinc-900 transition hover:bg-white/90"
        >
          <CalendarPlus className="size-4" aria-hidden /> Agendar
        </Link>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Agendamentos hoje" value={appointments.length} hint={awaitingPayment ? `${awaitingPayment} aguardando pagamento` : undefined} />
        <Stat label="Recebido hoje" value={formatMoney(receivedToday._sum.amountCents ?? 0)} />
        <Stat label="A receber hoje" value={formatMoney(toReceive)} />
        <Stat label="Recebido no mês" value={formatMoney(receivedMonth._sum.amountCents ?? 0)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximos de hoje</h2>
            <Link href="/painel/agenda" className="text-sm text-brand hover:underline">
              Ver agenda
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <EmptyState title="Nenhum atendimento pendente hoje">Compartilhe seu link de agendamento para receber clientes.</EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {upcoming.map((a) => (
                <AppointmentRow key={a.id} appointment={a} timezone={tz} />
              ))}
            </Card>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="font-semibold">Seu link de agendamento</h2>
            <p className="mt-1 mb-3 text-sm text-muted">Coloque na bio do Instagram e mande no WhatsApp.</p>
            <code className="mb-3 block truncate rounded-control bg-surface-2 px-3 py-2 text-sm">{bookingPath}</code>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={bookingPath} />
              <a href={bookingPath} target="_blank" className={buttonClass("secondary", "sm")}>
                <ExternalLink className="size-4" aria-hidden /> Abrir
              </a>
            </div>
          </Card>
          {!(await mercadoPagoToken(shop)) && shop.paymentMode !== "NONE" && (
            <Card className="border-amber-500/40 p-5">
              <h2 className="font-semibold">Conecte o Mercado Pago</h2>
              <p className="mt-1 mb-3 text-sm text-muted">
                O pagamento online está em modo demonstração. Conecte sua conta para receber de verdade por Pix e cartão.
              </p>
              <LinkButton href="/painel/configuracoes" size="sm">
                Configurar pagamento
              </LinkButton>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
