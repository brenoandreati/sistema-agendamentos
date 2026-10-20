import type { PaymentMode } from "@prisma/client";

/** Quanto o cliente paga online ao agendar. */
export function onlineAmountCents(shop: { paymentMode: PaymentMode; depositPercent: number }, totalCents: number): number {
  if (shop.paymentMode === "NONE" || totalCents <= 0) return 0;
  if (shop.paymentMode === "DEPOSIT") {
    const deposit = Math.round((totalCents * shop.depositPercent) / 100);
    return Math.min(totalCents, Math.max(100, deposit));
  }
  return totalCents;
}
