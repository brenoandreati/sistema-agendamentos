import Link from "next/link";
import type { ReactNode } from "react";
import { BRAND } from "@/config/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 text-xl font-semibold tracking-tight">
        <span className="text-brand">✂</span> {BRAND.name}
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
