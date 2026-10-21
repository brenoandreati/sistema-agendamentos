import {
  BellRing,
  CalendarDays,
  ClipboardList,
  House,
  KeyRound,
  Settings,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon };

/** Quem está logado: o dono vê tudo; o profissional da equipe, só a agenda dele. */
export type NavRole = "owner" | "staff";

export const MAIN_ITEMS: NavItem[] = [
  { href: "/painel", label: "Início", icon: House },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/painel/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/painel/clientes", label: "Clientes", icon: Users },
];

export const MORE_ITEMS: NavItem[] = [
  { href: "/painel/lembretes", label: "Lembretes", icon: BellRing },
  { href: "/painel/servicos", label: "Serviços", icon: ClipboardList },
  { href: "/painel/profissionais", label: "Profissionais", icon: UserRound },
  { href: "/painel/configuracoes", label: "Configurações", icon: Settings },
];

export const STAFF_MAIN_ITEMS: NavItem[] = [
  { href: "/painel", label: "Início", icon: House },
  { href: "/painel/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/painel/lembretes", label: "Lembretes", icon: BellRing },
];

export const STAFF_MORE_ITEMS: NavItem[] = [{ href: "/painel/conta", label: "Minha senha", icon: KeyRound }];

export function navItems(role: NavRole) {
  return role === "owner" ? { main: MAIN_ITEMS, more: MORE_ITEMS } : { main: STAFF_MAIN_ITEMS, more: STAFF_MORE_ITEMS };
}

/** Troca o nome do item "Profissionais" pelo nome da equipe da área (ex.: "Barbeiros"). */
export function withTeamLabel(items: NavItem[], teamLabel: string): NavItem[] {
  return items.map((item) => (item.href === "/painel/profissionais" ? { ...item, label: teamLabel } : item));
}
