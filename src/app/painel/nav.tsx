"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { cn } from "@/components/ui";
import { MAIN_ITEMS as MAIN, MORE_ITEMS as MORE } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/painel") return pathname === "/painel";
  if (href === "/painel/agenda") return pathname.startsWith("/painel/agenda") || pathname.startsWith("/painel/agendamentos");
  return pathname.startsWith(href);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {[...MAIN, ...MORE].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition",
            isActive(pathname, item.href) ? "bg-brand/12 text-brand" : "text-muted hover:bg-surface-2 hover:text-fg",
          )}
        >
          <item.icon className="size-4" aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const moreActive = pathname.startsWith("/painel/mais") || MORE.some((item) => isActive(pathname, item.href));
  const items = [...MAIN, { href: "/painel/mais", label: "Mais", icon: Ellipsis }];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.href === "/painel/mais" ? moreActive : isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[11px] font-medium",
                active ? "text-brand" : "text-muted",
              )}
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
