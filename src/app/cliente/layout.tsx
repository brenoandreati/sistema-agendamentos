import type { ReactNode } from "react";
import Link from "next/link";
import { AppMark } from "@/components/shop-mark";
import { BRAND } from "@/config/brand";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2.5 px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <AppMark /> {BRAND.name}
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
