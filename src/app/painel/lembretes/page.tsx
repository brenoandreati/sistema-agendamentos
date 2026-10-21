import type { Metadata } from "next";
import { BellRing, Check } from "lucide-react";
import { DateNav } from "@/components/date-nav";
import { Badge, buttonClass, Card, EmptyState, PageHeader } from "@/components/ui";
import { agendaScope, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPhone, whatsappLink } from "@/lib/format";
import { reminderMessage } from "@/lib/messages";
import { appBaseUrl } from "@/lib/payments";
import { serviceNames } from "@/lib/queries";
import { addDays, dayRange, formatDateLong, formatDateShort, formatTime, isDateStr, todayStr, toDateStr } from "@/lib/time";
import { ReminderLink } from "./reminder-link";

export const metadata: Metadata = { title: "Lembretes" };

export default async function RemindersPage({ searchParams }: PageProps<"/painel/lembretes">) {
  const user = await requireUser();
  const { shop } = user;
  const tz = shop.timezone;
  const query = await searchParams;
  const today = todayStr(tz);
  const tomorrow = addDays(today, 1);
  const date = isDateStr(query.data) ? query.data : tomorrow;
  const { start, end } = dayRange(date, tz);

  const appointments = await db.appointment.findMany({
    where: { shopId: shop.id, startAt: { gte: start, lt: end }, status: "CONFIRMED", ...agendaScope(user) },
    include: { client: true, professional: true, services: true },
    orderBy: { startAt: "asc" },
  });
  const sent = appointments.filter((a) => a.reminderSentAt).length;
  // Com cancelamento pelo site ligado, o lembrete leva o link para o cliente remarcar ou cancelar sozinho.
  const base = shop.cancelNoticeMin !== null ? await appBaseUrl() : null;
  const dayLabel = date === tomorrow ? "amanhã" : date === today ? "hoje" : formatDateLong(date).toLowerCase();

  return (
    <>
      <PageHeader
        title="Lembretes"
        description="Toque em Enviar: o WhatsApp abre com a mensagem pronta, é só mandar. A lista marca quem já recebeu."
      />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <DateNav basePath="/painel/lembretes" date={date} prev={addDays(date, -1)} next={addDays(date, 1)} today={tomorrow} todayLabel="Amanhã" />
        {appointments.length > 0 && (
          <p className="text-sm text-muted" role="status">
            {sent === appointments.length ? (
              <span className="font-medium text-emerald-700 dark:text-emerald-300">Todos os lembretes enviados</span>
            ) : (
              <>
                <b className="text-fg">{appointments.length - sent}</b> de {appointments.length} sem lembrete
              </>
            )}
          </p>
        )}
      </div>

      <h2 className="mb-3 font-semibold">{formatDateLong(date)}</h2>
      {appointments.length === 0 ? (
        <EmptyState title={`Ninguém marcado para ${dayLabel}`}>Os agendamentos confirmados do dia aparecem aqui.</EmptyState>
      ) : (
        <Card className="divide-y divide-line">
          {appointments.map((a) => {
            const message = reminderMessage({
              shopName: shop.name,
              timezone: tz,
              clientName: a.client.name,
              professionalName: a.professional.name,
              services: serviceNames(a),
              startAt: a.startAt,
              link: base && `${base}/agendar/${shop.slug}/agendamento/${a.publicToken}`,
            });
            const sentAt = a.reminderSentAt;
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <p className="w-14 shrink-0 font-semibold tabular-nums">{formatTime(a.startAt, tz)}</p>
                <span className="w-1 self-stretch rounded-full" style={{ background: a.professional.color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.client.name}</p>
                  <p className="truncate text-sm text-muted">
                    {serviceNames(a)} · {a.professional.name} · {formatPhone(a.client.phone)}
                  </p>
                </div>
                {sentAt && (
                  <Badge tone="success">
                    <Check className="mr-1 size-3" aria-hidden />
                    Enviado{" "}
                    {toDateStr(sentAt, tz) === today ? `às ${formatTime(sentAt, tz)}` : `${formatDateShort(toDateStr(sentAt, tz))}`}
                  </Badge>
                )}
                <ReminderLink
                  appointmentId={a.id}
                  href={whatsappLink(a.client.phone, message)}
                  className={buttonClass(sentAt ? "ghost" : "primary", "sm")}
                >
                  <BellRing className="size-4" aria-hidden /> {sentAt ? "Enviar de novo" : "Enviar"}
                </ReminderLink>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
