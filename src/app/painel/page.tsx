import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, BellRing, CalendarPlus, ExternalLink } from "lucide-react";
import { AppointmentRow } from "@/components/appointment-row";
import { CopyButton } from "@/components/copy-button";
import { PushToggle } from "@/components/push-toggle";
import { buttonClass, Card, EmptyState, LinkButton, Stat } from "@/components/ui";
import { NICHES } from "@/config/niches";
import { agendaScope, isOwner, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { pushPublicKey } from "@/lib/notify";
import { mercadoPagoToken } from "@/lib/payments";
import { appointmentInclude, paidCents } from "@/lib/queries";
import { expireStaleHolds } from "@/lib/scheduling";
import { addDays, dayRange, formatDateLong, startOfMonth, todayStr, zonedToUtc } from "@/lib/time";

export const metadata: Metadata = { title: "Início" };

export default async function DashboardPage() {
  const user = await requireUser();
  const { shop } = user;
  const owner = isOwner(user);
  const scope = agendaScope(user);
  const tz = shop.timezone;
  const today = todayStr(tz);
  const { start, end } = dayRange(today, tz);
  await expireStaleHolds(shop.id);
  const now = new Date();
  const DAY = 24 * 60 * 60_000;

  const tomorrow = dayRange(addDays(today, 1), tz);
  const [appointments, receivedToday, receivedMonth, attention, newOnline, tomorrowReminders] = await Promise.all([
    db.appointment.findMany({
      where: { shopId: shop.id, startAt: { gte: start, lt: end }, status: { notIn: ["CANCELED", "EXPIRED"] }, ...scope },
      include: appointmentInclude,
      orderBy: { startAt: "asc" },
    }),
    // Dinheiro do negócio: só o dono vê.
    owner
      ? db.payment.aggregate({
          where: { shopId: shop.id, status: "APPROVED", paidAt: { gte: start, lt: end } },
          _sum: { amountCents: true },
        })
      : null,
    owner
      ? db.payment.aggregate({
          where: { shopId: shop.id, status: "APPROVED", paidAt: { gte: zonedToUtc(startOfMonth(today), 0, tz), lt: end } },
          _sum: { amountCents: true },
        })
      : null,
    // Dinheiro que precisa de uma ação do negócio: devolver ou remarcar.
    owner
      ? db.appointment.findMany({
          where: {
            shopId: shop.id,
            startAt: { gte: new Date(now.getTime() - 30 * DAY) },
            OR: [
              { status: { in: ["CANCELED", "EXPIRED"] }, payments: { some: { status: "APPROVED", channel: "ONLINE" } } },
              { status: "CONFIRMED", startAt: { gt: now }, payments: { some: { status: "REFUNDED", channel: "ONLINE" } } },
            ],
          },
          include: appointmentInclude,
          orderBy: { startAt: "asc" },
          take: 10,
        })
      : [],
    db.appointment.findMany({
      where: {
        shopId: shop.id,
        source: "ONLINE",
        createdAt: { gte: new Date(now.getTime() - 2 * DAY) },
        startAt: { gte: now },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        ...scope,
      },
      include: appointmentInclude,
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.appointment.findMany({
      where: { shopId: shop.id, startAt: { gte: tomorrow.start, lt: tomorrow.end }, status: "CONFIRMED", ...scope },
      select: { reminderSentAt: true },
    }),
  ]);
  const remindersLeft = tomorrowReminders.filter((a) => !a.reminderSentAt).length;

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

      {owner ? (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Agendamentos hoje" value={appointments.length} hint={awaitingPayment ? `${awaitingPayment} aguardando pagamento` : undefined} />
          <Stat label="Recebido hoje" value={formatMoney(receivedToday?._sum.amountCents ?? 0)} />
          <Stat label="A receber hoje" value={formatMoney(toReceive)} />
          <Stat label="Recebido no mês" value={formatMoney(receivedMonth?._sum.amountCents ?? 0)} />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <Stat label="Hoje" value={appointments.length} hint="seus agendamentos" />
          <Stat label="Concluídos" value={appointments.filter((a) => a.status === "COMPLETED").length} />
          <Stat label="Falta atender" value={upcoming.length} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {attention.length > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="size-4" aria-hidden /> Precisa de atenção
              </h2>
              <Card className="divide-y divide-line border-amber-500/40">
                {attention.map((a) => (
                  <div key={a.id}>
                    <AppointmentRow appointment={a} timezone={tz} showDate />
                    <p className="px-4 pb-3 text-sm text-amber-800 dark:text-amber-200">
                      {a.status === "CONFIRMED"
                        ? "O pagamento online foi devolvido. Combine o pagamento no local."
                        : `${formatMoney(paidCents(a))} pagos online, mas o horário ${
                            a.status === "CANCELED" ? "foi cancelado" : "foi ocupado por outra pessoa"
                          }. Devolva o valor no Mercado Pago ou remarque com o cliente.`}
                    </p>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {newOnline.length > 0 && (
            <section>
              <h2 className="mb-3 font-semibold">Novos agendamentos online</h2>
              <Card className="divide-y divide-line">
                {newOnline.map((a) => (
                  <AppointmentRow key={a.id} appointment={a} timezone={tz} showDate />
                ))}
              </Card>
            </section>
          )}

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
        </div>

        <aside className="flex flex-col gap-4">
          {tomorrowReminders.length > 0 && (
            <Card className={remindersLeft ? "border-brand/40 p-5" : "p-5"}>
              <h2 className="flex items-center gap-2 font-semibold">
                <BellRing className="size-4 text-brand" aria-hidden /> Lembretes de amanhã
              </h2>
              <p className="mt-1 mb-3 text-sm text-muted">
                {tomorrowReminders.length} cliente(s) amanhã ·{" "}
                {remindersLeft ? `${remindersLeft} sem lembrete` : "todos já receberam"}
              </p>
              <LinkButton href="/painel/lembretes" size="sm" variant={remindersLeft ? "primary" : "secondary"}>
                {remindersLeft ? "Enviar lembretes" : "Ver lista"}
              </LinkButton>
            </Card>
          )}
          {!shop.isDemo && (
            <Card className="p-5">
              <h2 className="mb-2 font-semibold">Avisos no celular</h2>
              <PushToggle publicKey={pushPublicKey()} />
            </Card>
          )}
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
          {owner && !shop.isDemo && !(await mercadoPagoToken(shop)) && shop.paymentMode !== "NONE" && (
            <Card className="border-amber-500/40 p-5">
              <h2 className="font-semibold">Conecte o Mercado Pago</h2>
              <p className="mt-1 mb-3 text-sm text-muted">
                Enquanto não conectar, os clientes agendam sem pagar online e pagam no local. Conecte sua conta para receber por Pix e
                cartão na hora de agendar.
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
