import { Flower2, Paintbrush, Scissors, Sparkles, type LucideIcon } from "lucide-react";
import type { Niche } from "@prisma/client";

// Áreas de atuação atendidas pela plataforma. A agenda e o financeiro são iguais para todas;
// o que muda é o visual padrão e os serviços que já vêm cadastrados.

type NicheConfig = {
  /** Usado na URL do cadastro: /cadastro?tipo=<slug> */
  slug: string;
  /** Texto do botão na página inicial. */
  choice: string;
  description: string;
  icon: LucideIcon;
  color: string;
  namePlaceholder: string;
  services: { name: string; durationMin: number; priceCents: number }[];
};

export const NICHES: Record<Niche, NicheConfig> = {
  BARBER: {
    slug: "barbeiro",
    choice: "Sou barbeiro",
    description: "Corte, barba e acabamento",
    icon: Scissors,
    color: "#b45309",
    namePlaceholder: "Ex.: Barbearia do Zé",
    services: [
      { name: "Corte", durationMin: 30, priceCents: 4000 },
      { name: "Barba", durationMin: 30, priceCents: 3000 },
      { name: "Corte + barba", durationMin: 60, priceCents: 6500 },
    ],
  },
  HAIR: {
    slug: "cabeleireira",
    choice: "Sou cabeleireira",
    description: "Corte, escova, coloração e tratamentos",
    icon: Sparkles,
    color: "#be185d",
    namePlaceholder: "Ex.: Studio Ana Hair",
    services: [
      { name: "Corte feminino", durationMin: 60, priceCents: 8000 },
      { name: "Escova", durationMin: 45, priceCents: 5000 },
      { name: "Coloração", durationMin: 120, priceCents: 18000 },
      { name: "Hidratação", durationMin: 60, priceCents: 7000 },
    ],
  },
  NAILS: {
    slug: "nail-designer",
    choice: "Sou nail designer",
    description: "Manicure, pedicure, gel e alongamento",
    icon: Paintbrush,
    color: "#a21caf",
    namePlaceholder: "Ex.: Bia Nails",
    services: [
      { name: "Manicure", durationMin: 45, priceCents: 3500 },
      { name: "Pedicure", durationMin: 45, priceCents: 4000 },
      { name: "Esmaltação em gel", durationMin: 60, priceCents: 7000 },
      { name: "Alongamento em gel", durationMin: 120, priceCents: 15000 },
    ],
  },
  OTHER: {
    slug: "outra-area",
    choice: "Outra área",
    description: "Estética, cílios, sobrancelha, maquiagem e mais",
    icon: Flower2,
    color: "#0f766e",
    namePlaceholder: "Ex.: Espaço Bella",
    services: [{ name: "Atendimento", durationMin: 60, priceCents: 10000 }],
  },
};

export const NICHE_ORDER: Niche[] = ["BARBER", "HAIR", "NAILS", "OTHER"];

export function nicheFromSlug(slug: unknown): Niche | null {
  return NICHE_ORDER.find((niche) => NICHES[niche].slug === slug) ?? null;
}
