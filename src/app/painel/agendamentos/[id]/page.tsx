import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BellRing, CalendarClock, MessageCircle } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, buttonClass, Card, Checkbox, Field, Input, LinkButton, PageHeader, Select } from "@/components/ui";
import { agendaScope, isOwner, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  APPOINTMENT_STATUS,
  durationLabel,
  formatPhone,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  paymentSituation,
  whatsappLink,
} from "@/lib/format";
import { confirmationMessage, reminderMessage } from "@/lib/messages";
import { centsToInput, formatMoney } from "@/lib/money";
import { appBaseUrl } from "@/lib/payments";
import { expireStaleHolds } from "@/lib/scheduling";
import { formatDateLong, formatDateNumeric, formatTime, toDateStr } from "@/lib/time";
import { registerPayment, removePayment, setAppointmentStatus } from "../../agenda/actions";
import { ReminderLink } from "../../lembretes/reminder-link";

export const metadata: Metadata = { title: "Agendamento" };

export default async function AppointmentPage({ params }: PageProps<"/painel/agendamentos/[id]">) {
  const { id } = await params;
  const user = await requireUser();
  const { shop } = user;
  const owner = isOwner(user);
  await expireStaleHolds(shop.id);

  const appointment = await db.appointment.findFirst({
    where: { id, shopId: shop.id, ...agendaScope(user) },
    include: { client: true, professional: true, services: true, payments: { orderBy: { createdAt: "asc" } } },
  });
  if (!appointment) notFound();

  const tz = shop.timezone;
  const date = toDateStr(appointment.startAt, tz);
  const approved = appointment.payments.filter((p) => p.status === "APPROVED");
  const paid = approved.reduce((sum, p) => sum + p.amountCents, 0);
  const remaining = Math.max(0, appointment.totalCents - paid);
  const status = APPOINTMENT_STATUS[appointment.status];
  const situation = paymentSituation(appointment.totalCents, paid);
  const closed = appointment.status === "CANCELED" || appointment.status === "EXPIRED";
  const pendingOnline = appointment.payments.find((p) => p.status === "PENDING" && p.channel === "ONLINE");

  // Com cancelamento pelo site ligado, o lembrete leva o link para o cliente remarcar ou cancelar sozinho.
  const publicLink =
    shop.cancelNoticeMin !== null && appointment.status === "CONFIRMED"
      ? `${await appBaseUrl()}/agendar/${shop.slug}/agendamento/${appointment.publicToken}`
      : null;
  const messageInput = {
    shopName: shop.name,
    timezone: tz,
    clientName: appointment.client.name,
    professionalName: appointment.professional.name,
    services: appointment.services.map((s) => s.name).join(" + "),
    startAt: appointment.startAt,
  };

  return (
    <>
      <PageHeader
        title={appointment.client.name}
        description={
          <>
            {formatDateLong(date)}, {formatTime(appointment.startAt, tz)}–{formatTime(appointment.endAt, tz)} · {appointment.professional.name}
          </>
        }
        back={{ href: `/painel/agenda?data=${date}`, label: "Agenda" }}
        actions={
          !closed && (
            <LinkButton href={`/painel/agendamentos/${appointment.id}/editar`} variant="secondary">
              <CalendarClock className="size-4" aria-hidden /> Remarcar / editar
            </LinkButton>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge tone={status.tone}>{status.label}</Badge>
              {!closed && <Badge tone={situation.tone}>{situation.label}</Badge>}
              <Badge>{appointment.source === "ONLINE" ? "Agendado online" : "Agendado no painel"}</Badge>
            </div>
            <ul className="divide-y divide-line">
              {appointment.services.map((s) => (
                <li key={s.id} className="flex justify-between py-2 text-sm">
                  <span>
                    {s.name} <span className="text-muted">· {durationLabel(s.durationMin)}</span>
                  </span>
                  <span className="tabular-nums">{formatMoney(s.priceCents)}</span>
                </li>
              ))}
              <li className="flex justify-between py-2 font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatMoney(appointment.totalCents)}</span>
              </li>
              <li className="flex justify-between py-2 text-sm">
                <span className="text-muted">Pago</span>
                <span className="tabular-nums">{formatMoney(paid)}</span>
              </li>
              {remaining > 0 && !closed && (
                <li className="flex justify-between py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
                  <span>Falta receber</span>
                  <span className="tabular-nums">{formatMoney(remaining)}</span>
                </li>
              )}
            </ul>
            {appointment.notes && <p className="mt-3 rounded-control bg-surface-2 p-3 text-sm whitespace-pre-line">{appointment.notes}</p>}
            {appointment.status === "PENDING_PAYMENT" && appointment.holdExpiresAt && (
              <p className="mt-3 text-sm text-muted">
                O cliente tem até {formatTime(appointment.holdExpiresAt, tz)} para pagar. Depois disso o horário volta a ficar livre.
              </p>
            )}
          </Card>

          <section>
            <h2 className="mb-3 font-semibold">Pagamentos</h2>
            <Card className="divide-y divide-line">
              {appointment.payments.length === 0 && <p className="px-4 py-3 text-sm text-muted">Nenhum pagamento registrado.</p>}
              {appointment.payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {p.method ? PAYMENT_METHOD[p.method] : "Pagamento online"}{" "}
                      <span className="font-normal text-muted">· {p.channel === "ONLINE" ? "online" : "presencial"}</span>
                    </p>
                    <p className="text-muted">
                      {p.paidAt ? `Pago em ${formatDateNumeric(toDateStr(p.paidAt, tz))} às ${formatTime(p.paidAt, tz)}` : `Criado às ${formatTime(p.createdAt, tz)}`}
                      {p.provider === "demo" && " · demonstração"}
                    </p>
                  </div>
                  <Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge>
                  <span className="w-20 text-right font-medium tabular-nums">{formatMoney(p.amountCents)}</span>
                  {owner && p.channel === "IN_PERSON" && p.status === "APPROVED" && (
                    <ActionForm action={removePayment} confirm="Remover este pagamento?">
                      <input type="hidden" name="paymentId" value={p.id} />
                      <SubmitButton variant="ghost" size="sm" pendingText="...">
                        Remover
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
              ))}
            </Card>
          </section>

          {!closed && remaining > 0 && (
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">Registrar pagamento presencial</h2>
              <ActionForm action={registerPayment} className="flex flex-col gap-4">
                <input type="hidden" name="appointmentId" value={appointment.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Valor recebido (R$)">
                    <Input name="amount" inputMode="decimal" defaultValue={centsToInput(remaining)} required />
                  </Field>
                  <Field label="Forma de pagamento">
                    <Select name="method" defaultValue="PIX">
                      {Object.entries(PAYMENT_METHOD).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <Checkbox name="complete" label="Marcar atendimento como concluído" defaultChecked={appointment.status !== "COMPLETED"} />
                <div>
                  <SubmitButton>Registrar pagamento</SubmitButton>
                </div>
              </ActionForm>
            </Card>
          )}
        </div>

        <aside className="flex flex-col gap-4">
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Situação</h2>
            <ActionForm action={setAppointmentStatus} className="grid grid-cols-2 gap-2">
              <input type="hidden" name="id" value={appointment.id} />
              {appointment.status !== "COMPLETED" && !closed && (
                <SubmitButton name="status" value="COMPLETED" size="sm" pendingText="...">
                  Concluir
                </SubmitButton>
              )}
              {(appointment.status === "COMPLETED" || appointment.status === "NO_SHOW" || closed) && (
                <SubmitButton name="status" value="CONFIRMED" size="sm" variant="secondary" pendingText="...">
                  {closed ? "Reativar" : "Reabrir"}
                </SubmitButton>
              )}
              {appointment.status === "PENDING_PAYMENT" && (
                <SubmitButton name="status" value="CONFIRMED" size="sm" variant="secondary" pendingText="...">
                  Confirmar sem pagar
                </SubmitButton>
              )}
              {appointment.status !== "NO_SHOW" && !closed && (
                <SubmitButton name="status" value="NO_SHOW" size="sm" variant="secondary" pendingText="...">
                  Faltou
                </SubmitButton>
              )}
              {!closed && (
                <SubmitButton name="status" value="CANCELED" size="sm" variant="danger" pendingText="...">
                  Cancelar
                </SubmitButton>
              )}
            </ActionForm>
            {approved.some((p) => p.channel === "ONLINE") && appointment.status === "CANCELED" && (
              <p className="mt-3 text-xs text-muted">
                Este agendamento teve pagamento online. Se for devolver o dinheiro, faça o estorno pelo app do Mercado Pago.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold">{appointment.client.name}</h2>
            <p className="mb-4 text-sm text-muted">{formatPhone(appointment.client.phone)}</p>
            <div className="flex flex-col gap-2">
              <a
                href={whatsappLink(appointment.client.phone, confirmationMessage(messageInput))}
                target="_blank"
                rel="noreferrer"
                className={buttonClass("secondary", "md", "justify-start")}
              >
                <MessageCircle className="size-4" aria-hidden /> Enviar confirmação
              </a>
              <ReminderLink
                appointmentId={appointment.id}
                href={whatsappLink(appointment.client.phone, reminderMessage({ ...messageInput, link: publicLink }))}
                className={buttonClass("secondary", "md", "justify-start")}
              >
                <BellRing className="size-4" aria-hidden /> Enviar lembrete
              </ReminderLink>
              {appointment.reminderSentAt && (
                <p className="px-1 text-xs text-muted">
                  Lembrete enviado em {formatDateNumeric(toDateStr(appointment.reminderSentAt, tz))} às {formatTime(appointment.reminderSentAt, tz)}.
                </p>
              )}
              {owner && (
                <LinkButton href={`/painel/clientes/${appointment.client.id}`} variant="ghost" className="justify-start">
                  Ver ficha do cliente
                </LinkButton>
              )}
            </div>
            {pendingOnline?.checkoutUrl && (
              <p className="mt-4 text-xs text-muted">Pagamento online pendente. O cliente recebeu o link ao agendar.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
