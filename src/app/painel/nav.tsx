"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { cn } from "@/components/ui";
import { MAIN_ITEMS as MAIN, MORE_ITEMS, withTeamLabel } from "./nav-items";

function isActive(pathname: string, href: string) {
  if (href === "/painel") return pathname === "/painel";
  if (href === "/painel/agenda") return pathname.startsWith("/painel/agenda") || pathname.startsWith("/painel/agendamentos");
  return pathname.startsWith(href);
}

/** Menu lateral do computador. As cores vêm do tema da área (bg-sidebar etc.). */
export function SidebarNav({ teamLabel }: { teamLabel: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {[...MAIN, ...withTeamLabel(MORE_ITEMS, teamLabel)].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex items-center gap-3 rounded-control px-3 py-2 text-sm font-medium transition",
            isActive(pathname, item.href)
              ? "bg-sidebar-active text-sidebar-active-fg"
              : "text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg",
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
  const moreActive = pathname.startsWith("/painel/mais") || MORE_ITEMS.some((item) => isActive(pathname, item.href));
  const items = [...MAIN, { href: "/painel/mais", label: "Mais", icon: Ellipsis }];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-sidebar-line bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {items.map((item) => {
          const active = item.href === "/painel/mais" ? moreActive : isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-1.5 text-[11px] font-medium",
                active ? "text-sidebar-fg" : "text-sidebar-muted",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-12 place-items-center rounded-full transition",
                  active && "bg-sidebar-active text-sidebar-active-fg",
                )}
              >
                <item.icon className="size-5" aria-hidden />
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
