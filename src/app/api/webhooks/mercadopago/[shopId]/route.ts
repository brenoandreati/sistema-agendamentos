import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { syncMercadoPagoPayment } from "@/lib/payments";

/**
 * Notificações do Mercado Pago. O conteúdo da notificação não é confiável por si só:
 * o sistema sempre consulta o pagamento na API do Mercado Pago com o token da barbearia.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/api/webhooks/mercadopago/[shopId]">) {
  const { shopId } = await params;
  const shop = await db.shop.findUnique({ where: { id: shopId } });
  if (!shop) return NextResponse.json({ ok: false }, { status: 404 });

  const query = request.nextUrl.searchParams;
  const body = (await request.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string | number } };
  const type = body.type ?? query.get("type") ?? query.get("topic");
  const paymentId = String(body.data?.id ?? query.get("data.id") ?? query.get("id") ?? "");

  if (type === "payment" && /^\d+$/.test(paymentId)) {
    try {
      await syncMercadoPagoPayment(shop, paymentId);
    } catch (error) {
      console.error("Webhook do Mercado Pago falhou", error);
      // Responde erro para o Mercado Pago tentar de novo mais tarde.
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }
  return NextResponse.json({ ok: true });
}
