import { notFound } from "next/navigation";
import { CreditCard, QrCode } from "lucide-react";
import { buttonClass, Card } from "@/components/ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { formatTime } from "@/lib/time";
import { approveDemoPayment } from "../../actions";

/**
 * Tela de pagamento do modo demonstração, usada quando o negócio ainda não conectou o Mercado Pago.
 * Com o Mercado Pago conectado, o cliente vai direto para o checkout do Mercado Pago.
 */
export default async function DemoPaymentPage({ params, searchParams }: PageProps<"/agendar/[slug]/pagamento/[paymentId]">) {
  const { slug, paymentId } = await params;
  const { t } = await searchParams;
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { shop: true, appointment: true },
  });
  const appointment = payment?.appointment;
  if (!payment || !appointment || payment.shop.slug !== slug || payment.provider !== "demo" || appointment.publicToken !== t) {
    notFound();
  }
  const expiresAt = appointment.holdExpiresAt;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
        <b>Modo demonstração.</b> {payment.shop.name} ainda não conectou o Mercado Pago, então nenhum valor será cobrado. Escolha uma
        opção para simular o pagamento.
      </div>
      <Card className="p-5">
        <p className="text-sm text-muted">Valor a pagar</p>
        <p className="text-3xl font-semibold tabular-nums">{formatMoney(payment.amountCents)}</p>
        {payment.description && <p className="mt-1 text-sm text-muted">{payment.description}</p>}
        {expiresAt && (
          <p className="mt-3 text-sm text-muted">
            Pague até {formatTime(expiresAt, payment.shop.timezone)} para garantir o horário.
          </p>
        )}
        <form action={approveDemoPayment} className="mt-5 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="paymentId" value={payment.id} />
          <input type="hidden" name="token" value={appointment.publicToken} />
          <button name="method" value="PIX" className={buttonClass("primary", "md", "h-12")}>
            <QrCode className="size-5" aria-hidden /> Pagar com Pix
          </button>
          <button name="method" value="CREDIT_CARD" className={buttonClass("secondary", "md", "h-12")}>
            <CreditCard className="size-5" aria-hidden /> Pagar com cartão
          </button>
        </form>
      </Card>
    </div>
  );
}
