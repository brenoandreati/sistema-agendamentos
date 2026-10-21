import type { CSSProperties } from "react";
import type { AppointmentStatus, PaymentMethod, PaymentStatus } from "@prisma/client";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  PENDING_PAYMENT: { label: "Aguardando pagamento", tone: "warning" },
  CONFIRMED: { label: "Confirmado", tone: "info" },
  COMPLETED: { label: "Concluído", tone: "success" },
  NO_SHOW: { label: "Faltou", tone: "danger" },
  CANCELED: { label: "Cancelado", tone: "neutral" },
  EXPIRED: { label: "Reserva expirada", tone: "neutral" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  CASH: "Dinheiro",
  OTHER: "Outro",
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pendente", tone: "warning" },
  APPROVED: { label: "Pago", tone: "success" },
  REJECTED: { label: "Recusado", tone: "danger" },
  REFUNDED: { label: "Estornado", tone: "neutral" },
  CANCELED: { label: "Cancelado", tone: "neutral" },
};

export type Tone = "neutral" | "info" | "success" | "warning" | "danger";

/** Situação do pagamento de um agendamento. */
export function paymentSituation(totalCents: number, paidCents: number): { label: string; tone: Tone } {
  if (totalCents > 0 && paidCents >= totalCents) return { label: "Pago", tone: "success" };
  if (paidCents > 0) return { label: "Pago em parte", tone: "info" };
  return { label: "Não pago", tone: "warning" };
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/** "(11) 98765-4321" */
export function formatPhone(value: string): string {
  const d = onlyDigits(value).replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return value;
}

/** Link do WhatsApp com mensagem pronta. Assume DDI 55 quando o número não tem. */
export function whatsappLink(phone: string, message?: string): string {
  let digits = onlyDigits(phone);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Cor de texto legível (preto ou branco) sobre uma cor de fundo hexadecimal. */
export function readableTextColor(hex: string): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!match) return "#ffffff";
  const n = parseInt(match[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#111111" : "#ffffff";
}

/** Variáveis CSS que aplicam a cor do negócio nos componentes. */
export function brandStyle(color: string) {
  return { "--brand": color, "--brand-fg": readableTextColor(color) } as CSSProperties;
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value);
}

export function durationLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

/** Acrescenta uma linha às observações. */
export function addNote(notes: string | null, note: string) {
  return [notes, note].filter(Boolean).join("\n");
}
