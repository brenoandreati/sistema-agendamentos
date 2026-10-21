import type { ReactNode } from "react";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { brandStyle } from "@/lib/format";
import { ShopMark } from "@/components/shop-mark";
import { BRAND } from "@/config/brand";
import { NICHES } from "@/config/niches";
import { signOut } from "../(auth)/actions";
import { BottomNav, SidebarNav } from "./nav";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const { shop } = user;

  return (
    <div style={brandStyle(shop.primaryColor)} data-niche={shop.niche} className="flex min-h-dvh flex-1 bg-bg">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-sidebar-line bg-sidebar px-3 py-5 text-sidebar-fg md:flex">
        <Link href="/painel" className="mb-6 flex items-center gap-2.5 px-3">
          <ShopMark shop={shop} />
          <span className="min-w-0">
            <span className="block truncate font-display text-sm font-semibold">{shop.name}</span>
            <span className="block text-xs text-sidebar-muted">{BRAND.name}</span>
          </span>
        </Link>
        <SidebarNav teamLabel={NICHES[shop.niche].team} />
        <div className="mt-auto border-t border-sidebar-line px-3 pt-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-sidebar-muted">{user.email}</p>
          <form action={signOut} className="mt-3">
            <button className="flex items-center gap-2 text-sm text-sidebar-muted hover:text-sidebar-fg">
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 flex-1 pb-24 md:pb-0">
        <header className="flex items-center gap-2.5 border-b border-sidebar-line bg-sidebar px-4 py-3 text-sidebar-fg md:hidden">
          <ShopMark shop={shop} size="sm" />
          <span className="truncate font-display font-semibold">{shop.name}</span>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
