import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AtSign, MapPin, MessageCircle } from "lucide-react";
import { db } from "@/lib/db";
import { brandStyle, formatPhone, whatsappLink } from "@/lib/format";
import { BRAND } from "@/config/brand";

export async function generateMetadata({ params }: LayoutProps<"/agendar/[slug]">) {
  const { slug } = await params;
  const shop = await db.shop.findUnique({ where: { slug }, select: { name: true } });
  return { title: shop ? `Agendar · ${shop.name}` : "Agendar" };
}

export default async function PublicShopLayout({ children, params }: LayoutProps<"/agendar/[slug]"> & { children: ReactNode }) {
  const { slug } = await params;
  const shop = await db.shop.findUnique({ where: { slug } });
  if (!shop) notFound();

  return (
    <div style={brandStyle(shop.primaryColor)} className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-4">
          <Link href={`/agendar/${shop.slug}`}>
            {shop.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shop.logoUrl} alt="" className="size-12 rounded-xl object-cover" />
            ) : (
              <span className="grid size-12 place-items-center rounded-xl bg-brand text-xl text-brand-fg">✂</span>
            )}
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{shop.name}</h1>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
              {shop.address && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3.5" aria-hidden /> {shop.address}
                </span>
              )}
              {shop.phone && (
                <a href={whatsappLink(shop.phone)} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-fg">
                  <MessageCircle className="size-3.5" aria-hidden /> {formatPhone(shop.phone)}
                </a>
              )}
              {shop.instagram && (
                <a href={`https://instagram.com/${shop.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-fg">
                  <AtSign className="size-3.5" aria-hidden /> @{shop.instagram}
                </a>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
      <footer className="py-6 text-center text-xs text-muted">
        Agendamento online por <span className="font-medium">{BRAND.name}</span>
      </footer>
    </div>
  );
}
