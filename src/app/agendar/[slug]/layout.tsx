import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, CircleUserRound, MapPin, MessageCircle } from "lucide-react";
import { ShopMark } from "@/components/shop-mark";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { brandStyle, formatPhone, whatsappLink } from "@/lib/format";
import { appBaseUrl } from "@/lib/payments";
import { BRAND } from "@/config/brand";

/** Título e prévia do link quando ele é mandado no WhatsApp ou no Instagram. */
export async function generateMetadata({ params }: LayoutProps<"/agendar/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const shop = await db.shop.findUnique({ where: { slug }, select: { id: true, name: true, address: true, logoUpdatedAt: true } });
  if (!shop) return { title: "Agendar" };
  const base = await appBaseUrl();
  const description = `Agende seu horário com ${shop.name} pela internet: escolha o serviço, o profissional e o horário.`;
  const image = shop.logoUpdatedAt ? `${base}/api/logo/${shop.id}?v=${shop.logoUpdatedAt.getTime()}` : `${base}/icon-512.png`;
  return {
    title: `Agendar · ${shop.name}`,
    description,
    openGraph: { title: `Agende com ${shop.name}`, description, images: [image], type: "website", siteName: BRAND.name },
  };
}

export default async function PublicShopLayout({ children, params }: LayoutProps<"/agendar/[slug]"> & { children: ReactNode }) {
  const { slug } = await params;
  const [shop, customer] = await Promise.all([db.shop.findUnique({ where: { slug } }), getCustomer()]);
  if (!shop) notFound();

  return (
    <div style={brandStyle(shop.primaryColor)} data-niche={shop.niche} className="flex min-h-dvh flex-1 flex-col bg-bg">
      <header className="border-b border-sidebar-line bg-sidebar text-sidebar-fg">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <Link href={`/agendar/${shop.slug}`}>
            <ShopMark shop={shop} size="lg" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-semibold">{shop.name}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-sidebar-muted">
              {shop.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {shop.address}
                </span>
              )}
              {shop.phone && (
                <a href={whatsappLink(shop.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-sidebar-fg">
                  <MessageCircle className="size-3.5" aria-hidden /> {formatPhone(shop.phone)}
                </a>
              )}
              {shop.instagram && (
                <a href={`https://instagram.com/${shop.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-sidebar-fg">
                  <AtSign className="size-3.5" aria-hidden /> @{shop.instagram}
                </a>
              )}
            </div>
          </div>
          <Link
            href={`/cliente?voltar=/agendar/${shop.slug}`}
            className="flex shrink-0 flex-col items-center gap-0.5 text-xs text-sidebar-muted hover:text-sidebar-fg"
          >
            <CircleUserRound className="size-6" aria-hidden />
            {customer ? customer.name.split(" ")[0] : "Entrar"}
          </Link>
        </div>
      </header>
      {shop.isDemo && (
        <p className="border-b border-brand/25 bg-brand/8 px-4 py-2 text-center text-sm">
          <b>Demonstração</b> · o pagamento é simulado. Use dados de teste: o WhatsApp e o e-mail não são guardados.{" "}
          <Link href="/demonstracao" className="text-brand underline">
            Outras áreas
          </Link>
        </p>
      )}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
      <footer className="py-6 text-center text-xs text-muted">
        Agendamento online por <span className="font-medium">{BRAND.name}</span> ·{" "}
        <Link href="/privacidade" className="hover:text-fg hover:underline">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
