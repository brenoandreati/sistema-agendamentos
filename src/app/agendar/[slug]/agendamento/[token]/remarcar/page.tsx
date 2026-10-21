import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card, LinkButton } from "@/components/ui";
import { bookingDays } from "@/lib/booking";
import { customerReschedulePolicy } from "@/lib/cancellation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatDateLong, formatTime, todayStr, toDateStr } from "@/lib/time";
import { RescheduleFlow } from "./reschedule-flow";

export const metadata: Metadata = { title: "Remarcar horário", robots: { index: false } };

export default async function ReschedulePage({ params }: PageProps<"/agendar/[slug]/agendamento/[token]/remarcar">) {
  const { slug, token } = await params;
  const shop = await db.shop.findUnique({ where: { slug } });
  if (!shop) notFound();
  const appointment = await db.appointment.findFirst({
    where: { publicToken: token, shopId: shop.id },
    include: {
      professional: { include: { workingHours: { select: { weekday: true } } } },
      services: true,
      payments: { where: { status: "APPROVED" } },
    },
  });
  if (!appointment) notFound();

  const tz = shop.timezone;
  const statusPage = `/agendar/${shop.slug}/agendamento/${appointment.publicToken}`;
  const policy = customerReschedulePolicy(appointment, shop);
  const paid = appointment.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const current = `${formatDateLong(toDateStr(appointment.startAt, tz))} às ${formatTime(appointment.startAt, tz)}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-2xl font-semibold">Remarcar horário</h2>
        <p className="mt-1 text-sm text-muted">
          {appointment.services.map((s) => s.name).join(" + ")} · com {appointment.professional.name}
        </p>
      </div>
      <Card className="p-4 text-sm">
        <p className="text-muted">Horário atual</p>
        <p className="font-medium">{current}</p>
        {paid > 0 && <p className="mt-1 text-muted">O valor já pago ({formatMoney(paid)}) continua valendo para o novo horário.</p>}
      </Card>
      {policy.allowed ? (
        <RescheduleFlow
          token={appointment.publicToken}
          statusPage={statusPage}
          days={bookingDays(todayStr(tz), shop.maxAdvanceDays)}
          workingWeekdays={[...new Set(appointment.professional.workingHours.map((h) => h.weekday))]}
        />
      ) : (
        <>
          <p className="rounded-control bg-surface-2 p-3 text-sm">{policy.reason}</p>
          <LinkButton href={statusPage} variant="secondary">
            Voltar ao agendamento
          </LinkButton>
        </>
      )}
    </div>
  );
}
