// Cria uma barbearia de demonstração com agenda e pagamentos dos últimos 30 dias.
// Uso: npm run db:seed   (login: demo@exemplo.com / 123456)
import { PrismaClient, type PaymentMethod } from "@prisma/client";
import bcrypt from "bcryptjs";
import { defaultWorkingHours } from "../src/lib/defaults";
import { addDays, todayStr, weekdayOf, zonedToUtc } from "../src/lib/time";

const db = new PrismaClient();
const TZ = "America/Sao_Paulo";
const SLUG = "exemplo";

const CLIENTS = [
  ["João Pereira", "11987654321"],
  ["Lucas Andrade", "11976543210"],
  ["Pedro Souza", "11965432109"],
  ["Matheus Lima", "11954321098"],
  ["Gabriel Rocha", "11943210987"],
  ["Rafael Costa", "11932109876"],
  ["Thiago Martins", "11921098765"],
  ["Bruno Almeida", "11910987654"],
  ["Felipe Ribeiro", "11998877665"],
  ["André Carvalho", "11988776655"],
];

// Gerador simples com semente fixa, para os dados saírem sempre iguais.
let seed = 42;
function random() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

async function main() {
  const existing = await db.shop.findUnique({ where: { slug: SLUG } });
  if (existing) {
    await db.payment.deleteMany({ where: { shopId: existing.id } });
    await db.appointment.deleteMany({ where: { shopId: existing.id } });
    await db.shop.delete({ where: { id: existing.id } });
  }

  const shop = await db.shop.create({
    data: {
      name: "Barbearia Exemplo",
      slug: SLUG,
      phone: "11912345678",
      address: "Rua Augusta, 1500 - Consolação, São Paulo",
      instagram: "barbeariaexemplo",
      paymentMode: "FULL",
      users: {
        create: { name: "Carlos", email: "demo@exemplo.com", passwordHash: await bcrypt.hash("123456", 10), role: "OWNER" },
      },
    },
  });

  const [carlos, rafael] = await Promise.all(
    [
      { name: "Carlos", color: "#b45309", sortOrder: 0 },
      { name: "Rafael", color: "#0f766e", sortOrder: 1 },
    ].map((p) => db.professional.create({ data: { ...p, shopId: shop.id, workingHours: { create: defaultWorkingHours() } } })),
  );

  const services = await Promise.all(
    [
      { name: "Corte", durationMin: 30, priceCents: 4500, description: "Máquina e tesoura, com lavagem." },
      { name: "Barba", durationMin: 30, priceCents: 3500, description: "Toalha quente e navalha." },
      { name: "Corte + barba", durationMin: 60, priceCents: 7000, description: null },
      { name: "Sobrancelha", durationMin: 15, priceCents: 1500, description: null },
    ].map((s, i) =>
      db.service.create({
        data: { ...s, shopId: shop.id, sortOrder: i, professionals: { connect: [{ id: carlos.id }, { id: rafael.id }] } },
      }),
    ),
  );

  const clients = await Promise.all(
    CLIENTS.map(([name, phone]) => db.client.create({ data: { shopId: shop.id, name, phone } })),
  );

  const today = todayStr(TZ);
  const methods: PaymentMethod[] = ["PIX", "PIX", "PIX", "CREDIT_CARD", "DEBIT_CARD", "CASH"];
  let created = 0;

  for (let offset = -30; offset <= 2; offset++) {
    const date = addDays(today, offset);
    if (weekdayOf(date) === 0) continue; // domingo fechado
    for (const professional of [carlos, rafael]) {
      let minute = 9 * 60;
      while (minute < 18 * 60) {
        if (minute >= 12 * 60 && minute < 13 * 60) {
          minute = 13 * 60;
          continue;
        }
        const busy = offset < 0 ? random() < 0.55 : offset === 0 ? random() < 0.45 : random() < 0.3;
        const service = pick(services);
        if (!busy || minute + service.durationMin > 19 * 60) {
          minute += 30;
          continue;
        }
        const startAt = zonedToUtc(date, minute, TZ);
        const endAt = new Date(startAt.getTime() + service.durationMin * 60_000);
        const online = random() < 0.6;
        const past = endAt < new Date();
        const noShow = past && random() < 0.05;
        const status = past ? (noShow ? "NO_SHOW" : "COMPLETED") : "CONFIRMED";
        const paid = online || (past && !noShow && random() < 0.93);

        const appointment = await db.appointment.create({
          data: {
            shopId: shop.id,
            professionalId: professional.id,
            clientId: pick(clients).id,
            startAt,
            endAt,
            status,
            source: online ? "ONLINE" : "MANUAL",
            totalCents: service.priceCents,
            services: {
              create: { serviceId: service.id, name: service.name, durationMin: service.durationMin, priceCents: service.priceCents },
            },
          },
        });
        if (paid) {
          await db.payment.create({
            data: {
              shopId: shop.id,
              appointmentId: appointment.id,
              clientId: appointment.clientId,
              amountCents: service.priceCents,
              method: online ? pick<PaymentMethod>(["PIX", "PIX", "CREDIT_CARD"]) : pick(methods),
              channel: online ? "ONLINE" : "IN_PERSON",
              provider: online ? "demo" : null,
              status: "APPROVED",
              paidAt: online ? new Date(Math.min(Date.now(), startAt.getTime() - (1 + random() * 48) * 3_600_000)) : endAt,
            },
          });
        }
        created++;
        minute += service.durationMin;
      }
    }
  }

  console.log(`Barbearia de demonstração criada com ${created} agendamentos.`);
  console.log(`Painel: login demo@exemplo.com / senha 123456`);
  console.log(`Agendamento online: /agendar/${SLUG}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
