import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, ExternalLink, LifeBuoy, LogOut, ShieldCheck } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { isAdminEmail, supportWhatsapp } from "@/lib/admin";
import { requireUser } from "@/lib/auth";
import { whatsappLink } from "@/lib/format";
import { signOut } from "../../(auth)/actions";
import { NICHES } from "@/config/niches";
import { MORE_ITEMS, withTeamLabel } from "../nav-items";

export const metadata: Metadata = { title: "Mais" };

export default async function MorePage() {
  const user = await requireUser();
  const support = supportWhatsapp();
  return (
    <>
      <PageHeader title="Mais opções" />
      <Card className="divide-y divide-line">
        {withTeamLabel(MORE_ITEMS, NICHES[user.shop.niche].team).map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3.5">
            <item.icon className="size-5 text-muted" aria-hidden />
            <span className="flex-1 font-medium">{item.label}</span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        ))}
        <a href={`/agendar/${user.shop.slug}`} target="_blank" className="flex items-center gap-3 px-4 py-3.5">
          <ExternalLink className="size-5 text-muted" aria-hidden />
          <span className="flex-1 font-medium">Abrir página de agendamento</span>
        </a>
        {support && !user.shop.isDemo && (
          <a
            href={whatsappLink(support, `Olá! Preciso de ajuda com o Arvan Agendamentos (${user.shop.name}).`)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3.5"
          >
            <LifeBuoy className="size-5 text-muted" aria-hidden />
            <span className="flex-1 font-medium">Falar com o suporte</span>
          </a>
        )}
        {isAdminEmail(user.email) && (
          <Link href="/admin" className="flex items-center gap-3 px-4 py-3.5">
            <ShieldCheck className="size-5 text-muted" aria-hidden />
            <span className="flex-1 font-medium">Administração</span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        )}
        <form action={signOut}>
          <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            <LogOut className="size-5 text-muted" aria-hidden />
            <span className="flex-1 font-medium">Sair</span>
          </button>
        </form>
      </Card>
    </>
  );
}
