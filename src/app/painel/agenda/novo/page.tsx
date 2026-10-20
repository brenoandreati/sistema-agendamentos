import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { isDateStr, todayStr } from "@/lib/time";
import { AppointmentForm } from "../appointment-form";
import { appointmentFormOptions } from "../form-options";

export const metadata: Metadata = { title: "Novo agendamento" };

export default async function NewAppointmentPage({ searchParams }: PageProps<"/painel/agenda/novo">) {
  const { shop } = await requireUser();
  const query = await searchParams;
  const param = (key: string) => (typeof query[key] === "string" ? (query[key] as string) : "");

  const options = await appointmentFormOptions(shop.id);
  const date = isDateStr(param("data")) ? param("data") : todayStr(shop.timezone);
  const professionalId = options.professionals.some((p) => p.id === param("prof")) ? param("prof") : (options.professionals[0]?.id ?? "");
  const clientId = options.clients.some((c) => c.id === param("cliente")) ? param("cliente") : undefined;

  return (
    <>
      <PageHeader title="Novo agendamento" back={{ href: `/painel/agenda?data=${date}`, label: "Agenda" }} />
      <AppointmentForm
        {...options}
        initial={{
          clientId,
          serviceIds: options.services.slice(0, 1).map((s) => s.id),
          professionalId,
          date,
          time: /^\d{2}:\d{2}$/.test(param("hora")) ? param("hora") : "",
          notes: "",
        }}
      />
    </>
  );
}
