import type { AppointmentStatus, PaymentMethod, PaymentMode, Prisma } from "@prisma/client";
import { onlineAmountCents } from "./pricing";
import { addDays, weekdayOf, zonedToUtc } from "./time";

type Input = {
  shopId: string;
  today: string;
  timezone: string;
  now: Date;
  paymentMode: PaymentMode;
  depositPercent: number;
  professionals: { id: string; serviceIds: string[]; hours: { weekday: number; startMin: number; endMin: number }[] }[];
  services: { id: string; name: string; durationMin: number; priceCents: number }[];
  clientIds: string[];
  pastDays?: number;
  futureDays?: number;
  seed?: number;
  newId?: () => string;
};

const IN_PERSON_METHODS: PaymentMethod[] = ["PIX", "PIX", "PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH"];
const ONLINE_METHODS: PaymentMethod[] = ["PIX", "PIX", "CREDIT_CARD"];

/**
 * Gera uma agenda fictícia: atendimentos dos últimos dias (concluídos, faltas e cancelados)
 * e dos próximos dias, com os pagamentos de acordo com a forma de cobrança do negócio.
 * Respeita o horário de trabalho e nunca sobrepõe dois atendimentos do mesmo profissional.
 */
export function buildDemoAgenda(input: Input) {
  const { shopId, today, timezone, now, professionals, services, clientIds } = input;
  const pastDays = input.pastDays ?? 30;
  const futureDays = input.futureDays ?? 7;
  const newId = input.newId ?? (() => crypto.randomUUID());

  // Sorteio com semente fixa, para a demonstração ficar parecida a cada restauração.
  let seed = input.seed ?? 42;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];

  const appointments: Prisma.AppointmentCreateManyInput[] = [];
  const appointmentServices: Prisma.AppointmentServiceCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];

  for (let offset = -pastDays; offset <= futureDays; offset++) {
    const date = addDays(today, offset);
    const weekday = weekdayOf(date);
    const busyChance = offset < 0 ? 0.55 : offset === 0 ? 0.5 : offset <= 2 ? 0.35 : 0.2;

    for (const professional of professionals) {
      const mine = services.filter((s) => professional.serviceIds.includes(s.id));
      if (!mine.length) continue;
      const periods = professional.hours.filter((h) => h.weekday === weekday).sort((a, b) => a.startMin - b.startMin);

      for (const period of periods) {
        let minute = period.startMin;
        while (minute < period.endMin) {
          const service = pick(mine);
          if (random() >= busyChance || minute + service.durationMin > period.endMin) {
            minute += 30;
            continue;
          }

          const id = newId();
          const startAt = zonedToUtc(date, minute, timezone);
          const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
          const roll = random();
          let status: AppointmentStatus = "CONFIRMED";
          if (endAt <= now) status = roll < 0.05 ? "NO_SHOW" : roll < 0.08 ? "CANCELED" : "COMPLETED";
          else if (roll < 0.04) status = "CANCELED";
          const online = random() < 0.6;
          const clientId = pick(clientIds);

          appointments.push({
            id,
            shopId,
            professionalId: professional.id,
            clientId,
            startAt,
            endAt,
            status,
            source: online ? "ONLINE" : "MANUAL",
            totalCents: service.priceCents,
          });
          appointmentServices.push({
            appointmentId: id,
            serviceId: service.id,
            name: service.name,
            durationMin: service.durationMin,
            priceCents: service.priceCents,
          });

          if (status !== "CANCELED") {
            const upfront = online ? onlineAmountCents(input, service.priceCents) : 0;
            if (upfront > 0) {
              const hoursBefore = 1 + random() * 72;
              payments.push({
                shopId,
                appointmentId: id,
                clientId,
                amountCents: upfront,
                method: pick(ONLINE_METHODS),
                channel: "ONLINE",
                provider: "demo",
                status: "APPROVED",
                paidAt: new Date(Math.min(now.getTime() - 5 * 60_000, startAt.getTime() - hoursBefore * 3_600_000)),
              });
            }
            // Uns poucos ficam sem pagar o restante, para aparecer no "falta receber".
            const rest = service.priceCents - upfront;
            if (rest > 0 && status === "COMPLETED" && random() < 0.92) {
              payments.push({
                shopId,
                appointmentId: id,
                clientId,
                amountCents: rest,
                method: pick(IN_PERSON_METHODS),
                channel: "IN_PERSON",
                status: "APPROVED",
                paidAt: endAt,
              });
            }
          }

          minute += service.durationMin;
        }
      }
    }
  }

  return { appointments, appointmentServices, payments };
}
