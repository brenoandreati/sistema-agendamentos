import Link from "next/link";
import type { ReactNode } from "react";
import type { Viewport } from "next";
import { AppMark } from "@/components/shop-mark";
import { BRAND } from "@/config/brand";

export const viewport: Viewport = { themeColor: "#02081a" };

/** Páginas de termos e privacidade. */
export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <main className="theme-arvan flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Link href="/" className="mb-8 flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <AppMark /> {BRAND.name}
        </Link>
        <article className="flex flex-col gap-4 pb-16 text-[15px] leading-relaxed text-fg/90 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-fg [&_li]:ml-5 [&_li]:list-disc [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {children}
        </article>
      </div>
    </main>
  );
}
