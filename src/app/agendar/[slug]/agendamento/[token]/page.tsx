import { notFound } from "next/navigation";
import { CalendarClock, CalendarPlus, CircleCheck, Clock, MessageCircle, XCircle } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/forms";
import { buttonClass, Card, LinkButton } from "@/components/ui";
import { customerCancelPolicy, customerReschedulePolicy } from "@/lib/cancellation";
import { db } from "@/lib/db";
import { whatsappLink } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { syncMercadoPagoPayment } from "@/lib/payments";
import { expireStaleHolds } from "@/lib/scheduling";
import { formatDateLong, formatTime, toDateStr } from "@/lib/time";
import { cancelByCustomer } from "../../actions";
import { AutoRefresh } from "./auto-refresh";

function googleCalendarLink(input: { title: string; start: Date; end: Date; location?: string | null; details: string }) {
  const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${stamp(input.start)}/${stamp(input.end)}`,
    details: input.details,
    ...(input.location ? { location: input.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

export default async function BookingStatusPage({ params, searchParams }: PageProps<"/agendar/[slug]/agendamento/[token]">) {
  const { slug, token } = await params;
  const query = await searchParams;
  const shop = await db.shop.findUnique({ where: { slug } });
  if (!shop) notFound();

  // Volta do checkout do Mercado Pago: confere o pagamento na hora, sem esperar o webhook.
  const returnedPaymentId = typeof query.payment_id === "string" ? query.payment_id : null;
  if (returnedPaymentId && /^\d+$/.test(returnedPaymentId)) {
    await syncMercadoPagoPayment(shop, returnedPaymentId).catch((error) => console.error("Falha ao consultar pagamento", error));
  }
  await expireStaleHolds(shop.id);

  const appointment = await db.appointment.findFirst({
    where: { publicToken: token, shopId: shop.id },
    include: { professional: true, services: true, payments: true },
  });
  if (!appointment) notFound();
  const reschedule = customerReschedulePolicy(appointment, shop);

  const tz = shop.timezone;
  const date = toDateStr(appointment.startAt, tz);
  const paid = appointment.payments.filter((p) => p.status === "APPROVED").reduce((s, p) => s + p.amountCents, 0);
  const pending = appointment.payments.find((p) => p.status === "PENDING" && p.checkoutUrl);
  const services = appointment.services.map((s) => s.name).join(" + ");
  const confirmed = appointment.status === "CONFIRMED" || appointment.status === "COMPLETED";
  const policy = customerCancelPolicy(appointment, shop);
  const cancelSection =
    appointment.status === "CONFIRMED" || appointment.status === "PENDING_PAYMENT" ? (
      policy.allowed ? (
        <div className="flex flex-col items-center gap-1 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {reschedule.allowed && (
              <LinkButton href={`/agendar/${shop.slug}/agendamento/${appointment.publicToken}/remarcar`} variant="secondary" size="sm">
                <CalendarClock className="size-4" aria-hidden /> Remarcar
              </LinkButton>
            )}
            <ActionForm action={cancelByCustomer} confirm="Cancelar este agendamento? O horário fica livre para outra pessoa.">
              <input type="hidden" name="token" value={appointment.publicToken} />
              <SubmitButton variant="ghost" size="sm" pendingText="Cancelando...">
                Cancelar agendamento
              </SubmitButton>
            </ActionForm>
          </div>
          <p className="text-xs text-muted">
            Pode {reschedule.allowed ? "remarcar ou cancelar" : "cancelar"} por aqui até {policy.until} antes.
            {paid > 0 && ` Se cancelar, o valor pago online (${formatMoney(paid)}) é devolvido por ${shop.name}.`}
          </p>
        </div>
      ) : (
        <p className="text-center text-xs text-muted">{policy.reason}</p>
      )
    ) : null;

  const summary = (
    <Card className="divide-y divide-line">
      <div className="p-4">
        <p className="font-semibold">
          {formatDateLong(date)} às {formatTime(appointment.startAt, tz)}
        </p>
        <p className="text-sm text-muted">
          {services} · com {appointment.professional.name}
        </p>
      </div>
      <div className="flex justify-between p-4 text-sm">
        <span className="text-muted">Total</span>
        <span className="font-medium tabular-nums">{formatMoney(appointment.totalCents)}</span>
      </div>
      {paid > 0 && (
        <div className="flex justify-between p-4 text-sm">
          <span className="text-muted">Pago online</span>
          <span className="font-medium tabular-nums">{formatMoney(paid)}</span>
        </div>
      )}
      {confirmed && appointment.totalCents > paid && (
        <div className="flex justify-between p-4 text-sm">
          <span className="text-muted">A pagar no local</span>
          <span className="font-medium tabular-nums">{formatMoney(appointment.totalCents - paid)}</span>
        </div>
      )}
    </Card>
  );

  if (appointment.status === "PENDING_PAYMENT") {
    return (
      <div className="flex flex-col gap-4">
        <AutoRefresh />
        <StatusHeader icon={<Clock className="size-10 text-amber-500" />} title="Falta pagar para confirmar">
          Seu horário está reservado até {appointment.holdExpiresAt ? formatTime(appointment.holdExpiresAt, tz) : "daqui a pouco"}.
          Assim que o pagamento for aprovado, esta página atualiza sozinha.
        </StatusHeader>
        {summary}
        {pending?.checkoutUrl && (
          <a href={pending.checkoutUrl} className={buttonClass("primary", "md", "h-12")}>
            Pagar {formatMoney(pending.amountCents)}
          </a>
        )}
        {cancelSection}
      </div>
    );
  }

  if (!confirmed) {
    const expired = appointment.status === "EXPIRED";
    return (
      <div className="flex flex-col gap-4">
        <StatusHeader
          icon={<XCircle className="size-10 text-muted" />}
          title={expired ? "O tempo para pagar acabou" : appointment.status === "NO_SHOW" ? "Atendimento não realizado" : "Agendamento cancelado"}
        >
          {expired ? "O horário foi liberado. Você pode escolher um novo horário." : `Se tiver alguma dúvida, fale com ${shop.name}.`}
        </StatusHeader>
        {summary}
        <LinkButton href={`/agendar/${shop.slug}`} className="h-12">
          Fazer novo agendamento
        </LinkButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <StatusHeader
        icon={<CircleCheck className="size-10 text-emerald-500" />}
        title={query.remarcado === "1" && appointment.status === "CONFIRMED" ? "Horário remarcado!" : "Agendamento confirmado!"}
      >
        {query.remarcado === "1" && appointment.status === "CONFIRMED" ? `${shop.name} já foi avisado do novo horário.` : `${shop.name} te espera!`}
      </StatusHeader>
      {summary}
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={googleCalendarLink({
            title: `${services} - ${shop.name}`,
            start: appointment.startAt,
            end: appointment.endAt,
            location: shop.address,
            details: `Com ${appointment.professional.name}`,
          })}
          target="_blank"
          rel="noreferrer"
          className={buttonClass("secondary", "md", "h-11")}
        >
          <CalendarPlus className="size-4" aria-hidden /> Salvar na agenda
        </a>
        {shop.phone && (
          <a
            href={whatsappLink(shop.phone, `Olá! Fiz um agendamento para ${formatDateLong(date).toLowerCase()} às ${formatTime(appointment.startAt, tz)}.`)}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("secondary", "md", "h-11")}
          >
            <MessageCircle className="size-4" aria-hidden /> Falar no WhatsApp
          </a>
        )}
      </div>
      <LinkButton href={`/agendar/${shop.slug}`} variant="ghost">
        Fazer outro agendamento
      </LinkButton>
      {cancelSection}
    </div>
  );
}

function StatusHeader({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-4 text-center">
      {icon}
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted">{children}</p>
    </div>
  );
}
