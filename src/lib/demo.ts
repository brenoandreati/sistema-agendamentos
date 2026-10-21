import "server-only";
import type { Niche } from "@prisma/client";
import { DEMO_SHOPS } from "@/config/demo";
import { NICHE_ORDER, NICHES } from "@/config/niches";
import { db } from "./db";
import { buildDemoAgenda, buildDemoExpenses } from "./demo-data";
import { defaultWorkingHours } from "./defaults";
import { todayStr } from "./time";

const TIMEZONE = "America/Sao_Paulo";
/** Depois desse tempo a demonstração é refeita sozinha, para a agenda acompanhar a data de hoje. */
const REFRESH_AFTER_MS = 12 * 60 * 60_000;
/** Senha que nunca confere: ninguém entra na demonstração pelo login. */
const NO_PASSWORD = "demo$sem-senha";

export function demoNicheOf(shop: { isDemo: boolean; slug: string }): Niche | null {
  if (!shop.isDemo) return null;
  return NICHE_ORDER.find((niche) => DEMO_SHOPS[niche].slug === shop.slug) ?? null;
}

/**
 * Garante que o negócio de demonstração da área existe e tem dados atuais.
 * Com `reset`, apaga tudo o que foi mexido e gera os dados de novo.
 */
export async function ensureDemoShop(niche: Niche, { reset = false } = {}) {
  const config = DEMO_SHOPS[niche];
  return db.$transaction(
    async (tx) => {
      // Duas pessoas abrindo a mesma demonstração ao mesmo tempo não geram os dados duas vezes.
      await tx.$queryRaw`SELECT 1 AS ok FROM pg_advisory_xact_lock(hashtext(${`demo:${config.slug}`}))`;

      const settings = {
        niche,
        name: config.name,
        phone: config.phone,
        address: config.address,
        instagram: config.instagram,
        logoUrl: null,
        logoUpdatedAt: null,
        primaryColor: NICHES[niche].color,
        timezone: TIMEZONE,
        slotIntervalMin: 30,
        minNoticeMin: 60,
        maxAdvanceDays: 30,
        paymentMode: config.paymentMode,
        depositPercent: config.depositPercent,
        paymentHoldMin: 15,
        mpAccessToken: null,
      };

      let shop = await tx.shop.findUnique({ where: { slug: config.slug }, include: { users: { take: 1 } } });
      if (shop && !shop.isDemo) throw new Error(`O endereço ${config.slug} pertence a um negócio real.`);
      if (shop?.users.length && !reset && shop.demoResetAt && Date.now() - shop.demoResetAt.getTime() < REFRESH_AFTER_MS) {
        return { shopId: shop.id, userId: shop.users[0].id, slug: config.slug };
      }

      if (!shop) {
        shop = await tx.shop.create({
          data: { ...settings, slug: config.slug, isDemo: true },
          include: { users: { take: 1 } },
        });
      } else {
        await tx.payment.deleteMany({ where: { shopId: shop.id } });
        await tx.expense.deleteMany({ where: { shopId: shop.id } });
        await tx.recurringExpense.deleteMany({ where: { shopId: shop.id } });
        await tx.appointment.deleteMany({ where: { shopId: shop.id } });
        await tx.timeBlock.deleteMany({ where: { shopId: shop.id } });
        await tx.client.deleteMany({ where: { shopId: shop.id } });
        await tx.service.deleteMany({ where: { shopId: shop.id } });
        await tx.professional.deleteMany({ where: { shopId: shop.id } });
        await tx.shop.update({ where: { id: shop.id }, data: settings });
      }
      const user =
        shop.users[0] ??
        (await tx.user.create({
          data: {
            shopId: shop.id,
            name: config.owner,
            email: `demo+${config.slug}@arvan.local`,
            passwordHash: NO_PASSWORD,
          },
        }));

      const services = config.services.map((s, sortOrder) => ({ id: crypto.randomUUID(), ...s, sortOrder }));
      const serviceId = (name: string) => services.find((s) => s.name === name)!.id;
      const professionals = config.professionals.map((p, sortOrder) => ({
        id: crypto.randomUUID(),
        name: p.name,
        color: p.color,
        sortOrder,
        serviceIds: p.services.map(serviceId),
        hours: defaultWorkingHours(),
      }));
      const clients = config.clients.map((name, i) => ({
        id: crypto.randomUUID(),
        shopId: shop.id,
        name,
        phone: `119${String(71234567 + i * 1_357_911).slice(-8)}`,
      }));

      await tx.service.createMany({
        data: services.map((s) => ({
          id: s.id,
          shopId: shop.id,
          name: s.name,
          description: s.description ?? null,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
          sortOrder: s.sortOrder,
        })),
      });
      await tx.professional.createMany({
        data: professionals.map((p) => ({ id: p.id, shopId: shop.id, name: p.name, color: p.color, sortOrder: p.sortOrder })),
      });
      await tx.workingHour.createMany({
        data: professionals.flatMap((p) => p.hours.map((h) => ({ ...h, professionalId: p.id }))),
      });
      for (const p of professionals) {
        await tx.professional.update({
          where: { id: p.id },
          data: { services: { connect: p.serviceIds.map((id) => ({ id })) } },
        });
      }
      await tx.client.createMany({ data: clients });

      const agenda = buildDemoAgenda({
        shopId: shop.id,
        today: todayStr(TIMEZONE),
        timezone: TIMEZONE,
        now: new Date(),
        paymentMode: config.paymentMode,
        depositPercent: config.depositPercent,
        professionals,
        services,
        clientIds: clients.map((c) => c.id),
        seed: 42 + NICHE_ORDER.indexOf(niche),
      });
      await tx.appointment.createMany({ data: agenda.appointments });
      await tx.appointmentService.createMany({ data: agenda.appointmentServices });
      await tx.payment.createMany({ data: agenda.payments });
      const costs = buildDemoExpenses({
        shopId: shop.id,
        today: todayStr(TIMEZONE),
        timezone: TIMEZONE,
        revenueCents: agenda.payments.reduce((sum, p) => sum + p.amountCents, 0),
      });
      await tx.recurringExpense.createMany({ data: costs.recurring });
      await tx.expense.createMany({ data: costs.expenses });
      await tx.shop.update({ where: { id: shop.id }, data: { demoResetAt: new Date() } });

      return { shopId: shop.id, userId: user.id, slug: config.slug };
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
}
