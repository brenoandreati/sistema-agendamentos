import Link from "next/link";
import { Badge } from "./ui";
import { APPOINTMENT_STATUS, paymentSituation } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { paidCents, serviceNames, type AppointmentWithDetails } from "@/lib/queries";
import { formatDateShort, formatTime, toDateStr } from "@/lib/time";

export function AppointmentRow({
  appointment,
  timezone,
  showDate = false,
}: {
  appointment: AppointmentWithDetails;
  timezone: string;
  showDate?: boolean;
}) {
  const status = APPOINTMENT_STATUS[appointment.status];
  const situation = paymentSituation(appointment.totalCents, paidCents(appointment));
  const inactive = appointment.status === "CANCELED" || appointment.status === "EXPIRED";

  return (
    <Link
      href={`/painel/agendamentos/${appointment.id}`}
      className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-2 ${inactive ? "opacity-60" : ""}`}
    >
      <div className="w-16 shrink-0">
        <p className="font-semibold tabular-nums">{formatTime(appointment.startAt, timezone)}</p>
        {showDate && <p className="text-xs text-muted">{formatDateShort(toDateStr(appointment.startAt, timezone))}</p>}
      </div>
      <span className="w-1 self-stretch rounded-full" style={{ background: appointment.professional.color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{appointment.client.name}</p>
        <p className="truncate text-sm text-muted">
          {serviceNames(appointment)} · {appointment.professional.name}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <p className="font-medium tabular-nums">{formatMoney(appointment.totalCents)}</p>
        <div className="flex flex-wrap justify-end gap-1">
          <Badge tone={status.tone}>{status.label}</Badge>
          {!inactive && appointment.status !== "PENDING_PAYMENT" && <Badge tone={situation.tone}>{situation.label}</Badge>}
        </div>
      </div>
    </Link>
  );
}
