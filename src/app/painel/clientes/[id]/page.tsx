import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarPlus, MessageCircle } from "lucide-react";
import { AppointmentRow } from "@/components/appointment-row";
import { ActionForm, SubmitButton } from "@/components/forms";
import { buttonClass, Card, EmptyState, LinkButton, PageHeader, Stat } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPhone, whatsappLink } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { appointmentInclude } from "@/lib/queries";
import { deleteClient } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Cliente" };

export default async function ClientPage({ params }: PageProps<"/painel/clientes/[id]">) {
  const { id } = await params;
  const { shop } = await requireUser();
  const client = await db.client.findFirst({ where: { id, shopId: shop.id } });
  if (!client) notFound();

  const [appointments, spent] = await Promise.all([
    db.appointment.findMany({
      where: { clientId: id },
      include: appointmentInclude,
      orderBy: { startAt: "desc" },
      take: 50,
    }),
    db.payment.aggregate({ where: { clientId: id, status: "APPROVED" }, _sum: { amountCents: true } }),
  ]);
  const visits = appointments.filter((a) => a.status === "COMPLETED").length;
  const noShows = appointments.filter((a) => a.status === "NO_SHOW").length;

  return (
    <>
      <PageHeader
        title={client.name}
        description={formatPhone(client.phone)}
        back={{ href: "/painel/clientes", label: "Clientes" }}
        actions={
          <>
            <a href={whatsappLink(client.phone)} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
              <MessageCircle className="size-4" aria-hidden /> WhatsApp
            </a>
            <LinkButton href={`/painel/agenda/novo?cliente=${client.id}`}>
              <CalendarPlus className="size-4" aria-hidden /> Agendar
            </LinkButton>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Total pago" value={formatMoney(spent._sum.amountCents ?? 0)} />
        <Stat label="Atendimentos" value={visits} />
        <Stat label="Faltas" value={noShows} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section>
          <h2 className="mb-3 font-semibold">Histórico</h2>
          {appointments.length ? (
            <Card className="divide-y divide-line">
              {appointments.map((a) => (
                <AppointmentRow key={a.id} appointment={a} timezone={shop.timezone} showDate />
              ))}
            </Card>
          ) : (
            <EmptyState title="Nenhum agendamento ainda" />
          )}
        </section>
        <section className="flex flex-col gap-4">
          <h2 className="font-semibold">Dados</h2>
          <Card className="p-5">
            <ClientForm client={client} />
          </Card>
          {appointments.length === 0 ? (
            <ActionForm action={deleteClient} confirm="Excluir este cliente?">
              <input type="hidden" name="id" value={client.id} />
              <SubmitButton variant="danger" size="sm" pendingText="Excluindo...">
                Excluir cliente
              </SubmitButton>
            </ActionForm>
          ) : (
            !client.phone.startsWith("removido-") && (
              <ActionForm
                action={deleteClient}
                confirm="Apagar nome, WhatsApp, e-mail e observações deste cliente? Os atendimentos e pagamentos continuam no histórico, sem os dados pessoais. Não dá para desfazer."
              >
                <input type="hidden" name="id" value={client.id} />
                <SubmitButton variant="danger" size="sm" pendingText="Apagando...">
                  Apagar dados pessoais
                </SubmitButton>
                <p className="mt-1 text-xs text-muted">Use quando o cliente pedir para excluir os dados dele (LGPD).</p>
              </ActionForm>
            )
          )}
        </section>
      </div>
    </>
  );
}
