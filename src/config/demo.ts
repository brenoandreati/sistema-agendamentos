import type { Niche, PaymentMode } from "@prisma/client";

// Negócios de demonstração, um por área, abertos em /demonstracao sem precisar de conta.
// Os dados são fictícios e voltam ao normal ao restaurar a demonstração.

export type DemoService = { name: string; description?: string; durationMin: number; priceCents: number };

export type DemoConfig = {
  slug: string;
  /** Nome da área no cartão da página de demonstração. */
  area: string;
  name: string;
  owner: string;
  phone: string;
  address: string;
  instagram: string;
  paymentMode: PaymentMode;
  depositPercent: number;
  /** Explica na página de demonstração o que essa área mostra. */
  highlight: string;
  services: DemoService[];
  /** Cada profissional com os nomes dos serviços que faz. */
  professionals: { name: string; color: string; services: string[] }[];
  clients: string[];
};

export const DEMO_SHOPS: Record<Niche, DemoConfig> = {
  BARBER: {
    slug: "demo-barbearia",
    area: "Barbearia",
    name: "Barbearia Navalha de Ouro",
    owner: "Carlos",
    phone: "11912345678",
    address: "Rua Augusta, 1500 - Consolação, São Paulo",
    instagram: "navalhadeouro",
    paymentMode: "FULL",
    depositPercent: 30,
    highlight: "3 barbeiros · cliente paga tudo online ao agendar",
    services: [
      { name: "Corte", description: "Máquina e tesoura, com lavagem.", durationMin: 30, priceCents: 4500 },
      { name: "Barba", description: "Toalha quente e navalha.", durationMin: 30, priceCents: 3500 },
      { name: "Corte + barba", durationMin: 60, priceCents: 7000 },
      { name: "Sobrancelha", durationMin: 15, priceCents: 1500 },
      { name: "Pigmentação", description: "Disfarça falhas na barba e no corte.", durationMin: 30, priceCents: 4000 },
    ],
    professionals: [
      { name: "Carlos", color: "#b45309", services: ["Corte", "Barba", "Corte + barba", "Sobrancelha"] },
      { name: "Rafael", color: "#0f766e", services: ["Corte", "Barba", "Corte + barba"] },
      { name: "Diego", color: "#1d4ed8", services: ["Corte", "Sobrancelha", "Pigmentação"] },
    ],
    clients: [
      "João Pereira",
      "Lucas Andrade",
      "Pedro Souza",
      "Matheus Lima",
      "Gabriel Rocha",
      "Thiago Martins",
      "Bruno Almeida",
      "Felipe Ribeiro",
      "André Carvalho",
      "Vinícius Santos",
      "Gustavo Oliveira",
      "Leonardo Dias",
    ],
  },
  HAIR: {
    slug: "demo-cabeleireira",
    area: "Salão de beleza",
    name: "Studio Bella Hair",
    owner: "Ana",
    phone: "11923456789",
    address: "Av. Paulista, 900 - Bela Vista, São Paulo",
    instagram: "studiobellahair",
    paymentMode: "DEPOSIT",
    depositPercent: 30,
    highlight: "2 profissionais · cliente paga um sinal de 30% online",
    services: [
      { name: "Corte feminino", description: "Com lavagem e finalização.", durationMin: 60, priceCents: 8000 },
      { name: "Escova", durationMin: 45, priceCents: 5000 },
      { name: "Coloração", description: "Raiz ou cabelo todo.", durationMin: 120, priceCents: 18000 },
      { name: "Mechas", durationMin: 180, priceCents: 32000 },
      { name: "Hidratação", durationMin: 60, priceCents: 7000 },
    ],
    professionals: [
      { name: "Ana", color: "#be185d", services: ["Corte feminino", "Escova", "Hidratação"] },
      { name: "Juliana", color: "#7c3aed", services: ["Coloração", "Mechas", "Escova", "Hidratação"] },
    ],
    clients: [
      "Mariana Costa",
      "Fernanda Lima",
      "Camila Rocha",
      "Beatriz Souza",
      "Larissa Martins",
      "Amanda Alves",
      "Patrícia Gomes",
      "Renata Dias",
      "Aline Ferreira",
      "Vanessa Ribeiro",
      "Juliana Mendes",
      "Carolina Nunes",
    ],
  },
  NAILS: {
    slug: "demo-nail-designer",
    area: "Nail designer",
    name: "Bia Nails Studio",
    owner: "Bia",
    phone: "11934567890",
    address: "Rua Oscar Freire, 300 - Jardins, São Paulo",
    instagram: "bianailsstudio",
    paymentMode: "FULL",
    depositPercent: 30,
    highlight: "2 nail designers · cliente paga tudo online ao agendar",
    services: [
      { name: "Manicure", durationMin: 45, priceCents: 3500 },
      { name: "Pedicure", durationMin: 45, priceCents: 4000 },
      { name: "Pé e mão", durationMin: 90, priceCents: 7000 },
      { name: "Esmaltação em gel", description: "Dura até 3 semanas.", durationMin: 60, priceCents: 7000 },
      { name: "Alongamento em gel", durationMin: 120, priceCents: 15000 },
      { name: "Manutenção do alongamento", durationMin: 90, priceCents: 9000 },
    ],
    professionals: [
      { name: "Bia", color: "#a21caf", services: ["Manicure", "Pedicure", "Pé e mão", "Esmaltação em gel"] },
      { name: "Carol", color: "#be123c", services: ["Esmaltação em gel", "Alongamento em gel", "Manutenção do alongamento"] },
    ],
    clients: [
      "Gabriela Santos",
      "Letícia Araújo",
      "Natália Barbosa",
      "Isabela Freitas",
      "Débora Pinto",
      "Priscila Moura",
      "Tatiane Cardoso",
      "Bruna Teixeira",
      "Raquel Castro",
      "Sabrina Lopes",
      "Daniela Rezende",
      "Viviane Correia",
    ],
  },
  OTHER: {
    slug: "demo-estetica",
    area: "Estética, cílios e sobrancelha",
    name: "Espaço Lumi Estética",
    owner: "Marina",
    phone: "11945678901",
    address: "Rua Haddock Lobo, 450 - Cerqueira César, São Paulo",
    instagram: "espacolumi",
    paymentMode: "NONE",
    depositPercent: 30,
    highlight: "1 profissional · cliente paga no local",
    services: [
      { name: "Design de sobrancelha", durationMin: 30, priceCents: 4500 },
      { name: "Design com henna", durationMin: 45, priceCents: 6000 },
      { name: "Extensão de cílios", description: "Fio a fio.", durationMin: 120, priceCents: 18000 },
      { name: "Limpeza de pele", durationMin: 60, priceCents: 12000 },
      { name: "Maquiagem social", durationMin: 60, priceCents: 15000 },
    ],
    professionals: [
      {
        name: "Marina",
        color: "#0f766e",
        services: ["Design de sobrancelha", "Design com henna", "Extensão de cílios", "Limpeza de pele", "Maquiagem social"],
      },
    ],
    clients: [
      "Luana Ribeiro",
      "Helena Duarte",
      "Sofia Campos",
      "Manuela Vieira",
      "Alice Monteiro",
      "Valentina Rios",
      "Laura Batista",
      "Cecília Ramos",
      "Elisa Fonseca",
      "Lívia Cavalcanti",
    ],
  },
};

export const DEMO_LOCKED = "Na demonstração essa parte não pode ser alterada.";

const DEMO_SLUGS = new Set(Object.values(DEMO_SHOPS).map((d) => d.slug));

/** Endereços dos negócios de demonstração não podem ser usados por contas reais. */
export function isReservedSlug(slug: string) {
  return DEMO_SLUGS.has(slug);
}
