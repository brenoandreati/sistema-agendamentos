import { CalendarDays, ClipboardList, House, Settings, UserRound, Users, Wallet, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export const MAIN_ITEMS: NavItem[] = [
  { href: "/painel", label: "Início", icon: House },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/painel/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/painel/clientes", label: "Clientes", icon: Users },
];

export const MORE_ITEMS: NavItem[] = [
  { href: "/painel/servicos", label: "Serviços", icon: ClipboardList },
  { href: "/painel/profissionais", label: "Profissionais", icon: UserRound },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
];
