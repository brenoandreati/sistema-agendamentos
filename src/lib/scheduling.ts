import "server-only";
import type { Prisma, Shop } from "@prisma/client";
import { db } from "./db";
import { computeSlots, type Interval } from "./availability";
import { dayRange, diffDays, minutesOfDay, todayStr, weekdayOf } from "./time";

type Tx = Prisma.TransactionClient;

/** Agendamentos que ocupam a agenda. Reservas aguardando pagamento só contam até expirar. */
export function blockingAppointments(now: Date): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { status: { in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } },
      { status: "PENDING_PAYMENT", holdExpiresAt: { gt: now } },
    ],
  };
}

/** Marca como expiradas as reservas que não foram pagas a tempo. */
export async function expireStaleHolds(shopId: string, now = new Date()) {
  const stale = await db.appointment.findMany({
    where: { shopId, status: "PENDING_PAYMENT", holdExpiresAt: { lte: now } },
    select: { id: true },
  });
  if (!stale.length) return;
  const ids = stale.map((a) => a.id);
  await db.$transaction([
    db.appointment.updateMany({
      where: { id: { in: ids }, status: "PENDING_PAYMENT" },
      data: { status: "EXPIRED" },
    }),
    db.payment.updateMany({
      where: { appointmentId: { in: ids }, status: "PENDING" },
      data: { status: "CANCELED" },
    }),
  ]);
}

function toDayInterval(start: Date, end: Date, day: { start: Date; end: Date }, tz: string): Interval {
  return {
    start: start <= day.start ? 0 : minutesOfDay(start, tz),
    end: end >= day.end ? 24 * 60 : minutesOfDay(end, tz),
  };
}

type AvailabilityOptions = {
  shop: Shop;
  dateStr: string;
  durationMin: number;
  professionalIds: string[];
  /** Aplica antecedência mínima e limite de dias (agendamento online). */
  publicBooking?: boolean;
  excludeAppointmentId?: string;
  now?: Date;
};

/** Horários livres de cada profissional no dia, em minutos desde 00:00. */
export async function getDayAvailability(opts: AvailabilityOptions): Promise<Record<string, number[]>> {
  const { shop, dateStr, durationMin, professionalIds } = opts;
  const now = opts.now ?? new Date();
  const result: Record<string, number[]> = {};
  if (!professionalIds.length) return result;

  const offset = diffDays(todayStr(shop.timezone, now), dateStr);
  if (offset < 0) return result;
  if (opts.publicBooking && offset > shop.maxAdvanceDays) return result;

  const day = dayRange(dateStr, shop.timezone);
  const [hours, appointments, blocks] = await Promise.all([
    db.workingHour.findMany({
      where: { professionalId: { in: professionalIds }, weekday: weekdayOf(dateStr) },
    }),
    db.appointment.findMany({
      where: {
        professionalId: { in: professionalIds },
        startAt: { lt: day.end },
        endAt: { gt: day.start },
        ...(opts.excludeAppointmentId ? { id: { not: opts.excludeAppointmentId } } : {}),
        ...blockingAppointments(now),
      },
      select: { professionalId: true, startAt: true, endAt: true },
    }),
    db.timeBlock.findMany({
      where: { professionalId: { in: professionalIds }, startAt: { lt: day.end }, endAt: { gt: day.start } },
      select: { professionalId: true, startAt: true, endAt: true },
    }),
  ]);

  const earliestStart =
    offset === 0 ? minutesOfDay(now, shop.timezone) + (opts.publicBooking ? shop.minNoticeMin : 0) : undefined;

  for (const id of professionalIds) {
    const working = hours
      .filter((h) => h.professionalId === id)
      .map((h) => ({ start: h.startMin, end: h.endMin }));
    const busy = [...appointments, ...blocks]
      .filter((item) => item.professionalId === id)
      .map((item) => toDayInterval(item.startAt, item.endAt, day, shop.timezone));
    result[id] = computeSlots({
      working,
      busy,
      duration: durationMin,
      step: shop.slotIntervalMin,
      earliestStart,
    });
  }
  return result;
}

/** Garante que só uma marcação por profissional seja gravada por vez (evita horário duplicado). */
export async function lockProfessional(tx: Tx, professionalId: string) {
  await tx.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(hashtext(${professionalId}))`;
}

export async function findConflict(
  tx: Tx,
  opts: { professionalId: string; startAt: Date; endAt: Date; excludeAppointmentId?: string; now?: Date },
): Promise<"appointment" | "block" | null> {
  const now = opts.now ?? new Date();
  const overlap = { startAt: { lt: opts.endAt }, endAt: { gt: opts.startAt } };
  const appointment = await tx.appointment.findFirst({
    where: {
      professionalId: opts.professionalId,
      ...overlap,
      ...(opts.excludeAppointmentId ? { id: { not: opts.excludeAppointmentId } } : {}),
      ...blockingAppointments(now),
    },
    select: { id: true },
  });
  if (appointment) return "appointment";
  const block = await tx.timeBlock.findFirst({
    where: { professionalId: opts.professionalId, ...overlap },
    select: { id: true },
  });
  return block ? "block" : null;
}
