// Regras para o cliente cancelar pelo site. Puro, para dar para testar.

type Appointment = { status: string; startAt: Date };

/** "2 horas", "1 dia"... */
export function noticeLabel(minutes: number): string {
  if (minutes % 1440 === 0) return minutes === 1440 ? "1 dia" : `${minutes / 1440} dias`;
  if (minutes % 60 === 0) return minutes === 60 ? "1 hora" : `${minutes / 60} horas`;
  return `${minutes} minutos`;
}

export function customerCancelPolicy(
  appointment: Appointment,
  shop: { cancelNoticeMin: number | null },
  now = new Date(),
): { allowed: true; until: string } | { allowed: false; reason: string } {
  if (appointment.status !== "CONFIRMED" && appointment.status !== "PENDING_PAYMENT") {
    return { allowed: false, reason: "Este agendamento não pode mais ser cancelado." };
  }
  if (shop.cancelNoticeMin === null) {
    return { allowed: false, reason: "Para cancelar ou remarcar, fale com o negócio pelo WhatsApp." };
  }
  const minutesLeft = (appointment.startAt.getTime() - now.getTime()) / 60_000;
  const until = noticeLabel(shop.cancelNoticeMin);
  if (minutesLeft < shop.cancelNoticeMin) {
    return { allowed: false, reason: `O cancelamento pelo site vai até ${until} antes do horário. Agora, fale com o negócio pelo WhatsApp.` };
  }
  return { allowed: true, until };
}

/**
 * Regras para o cliente remarcar pelo site: mesmo prazo do cancelamento, só horário já confirmado
 * (quem ainda não pagou escolhe outro horário fazendo um agendamento novo) e com o mesmo profissional.
 */
export function customerReschedulePolicy(
  appointment: Appointment & { professional: { active: boolean; bookableOnline: boolean } },
  shop: { cancelNoticeMin: number | null },
  now = new Date(),
): { allowed: true; until: string } | { allowed: false; reason: string } {
  if (appointment.status !== "CONFIRMED") return { allowed: false, reason: "Este agendamento não pode mais ser remarcado." };
  if (shop.cancelNoticeMin === null || !appointment.professional.active || !appointment.professional.bookableOnline) {
    return { allowed: false, reason: "Para remarcar, fale com o negócio pelo WhatsApp." };
  }
  const until = noticeLabel(shop.cancelNoticeMin);
  if ((appointment.startAt.getTime() - now.getTime()) / 60_000 < shop.cancelNoticeMin) {
    return { allowed: false, reason: `Dá para remarcar pelo site até ${until} antes do horário. Agora, fale com o negócio pelo WhatsApp.` };
  }
  return { allowed: true, until };
}
