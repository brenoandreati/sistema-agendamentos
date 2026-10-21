import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { agendaScope, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatTime, toDateStr } from "@/lib/time";
import { AppointmentForm } from "../../../agenda/appointment-form";
import { appointmentFormOptions } from "../../../agenda/form-options";

export const metadata: Metadata = { title: "Remarcar" };

export default async function EditAppointmentPage({ params }: PageProps<"/painel/agendamentos/[id]/editar">) {
  const { id } = await params;
  const user = await requireUser();
  const { shop } = user;
  const scope = agendaScope(user);
  const appointment = await db.appointment.findFirst({ where: { id, shopId: shop.id, ...scope }, include: { services: true } });
  if (!appointment) notFound();
  const options = await appointmentFormOptions(shop.id, scope);

  return (
    <>
      <PageHeader title="Editar agendamento" back={{ href: `/painel/agendamentos/${id}`, label: "Agendamento" }} />
      <AppointmentForm
        {...options}
        initial={{
          id,
          clientId: appointment.clientId,
          serviceIds: appointment.services.map((s) => s.serviceId).filter((s): s is string => Boolean(s)),
          professionalId: appointment.professionalId,
          date: toDateStr(appointment.startAt, shop.timezone),
          time: formatTime(appointment.startAt, shop.timezone),
          notes: appointment.notes ?? "",
        }}
      />
    </>
  );
}
