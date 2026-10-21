import Link from "next/link";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { AppMark } from "@/components/shop-mark";
import { BRAND } from "@/config/brand";

export const viewport: Viewport = { themeColor: "#02081a" };

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="theme-arvan flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-3 text-xl font-semibold tracking-tight">
        <AppMark className="h-8" /> {BRAND.name}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
