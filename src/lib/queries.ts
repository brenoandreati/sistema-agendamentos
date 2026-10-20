import "server-only";
import type { Prisma } from "@prisma/client";

/** Dados que as telas de agendamento usam. `payments` traz só os pagamentos aprovados. */
export const appointmentInclude = {
  client: true,
  professional: true,
  services: true,
  payments: { where: { status: "APPROVED" } },
} satisfies Prisma.AppointmentInclude;

export type AppointmentWithDetails = Prisma.AppointmentGetPayload<{ include: typeof appointmentInclude }>;

export function paidCents(appointment: { payments: { amountCents: number; status?: string }[] }) {
  return appointment.payments
    .filter((p) => p.status === undefined || p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amountCents, 0);
}

export function serviceNames(appointment: { services: { name: string }[] }) {
  return appointment.services.map((s) => s.name).join(" + ");
}
