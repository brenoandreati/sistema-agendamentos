"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonClass } from "./ui";

/** Navegação entre datas: anterior, hoje, próxima e seletor. Mantém os outros parâmetros da URL. */
export function DateNav({
  basePath,
  date,
  prev,
  next,
  today,
  extraParams = {},
  todayLabel = "Hoje",
}: {
  basePath: string;
  date: string;
  prev: string;
  next: string;
  today: string;
  extraParams?: Record<string, string>;
  todayLabel?: string;
}) {
  const router = useRouter();
  const href = (d: string) => `${basePath}?${new URLSearchParams({ ...extraParams, data: d })}`;
  return (
    <div className="flex items-center gap-1.5">
      <Link href={href(prev)} className={buttonClass("secondary", "icon")} aria-label="Anterior">
        <ChevronLeft className="size-5" />
      </Link>
      <Link href={href(today)} className={buttonClass("secondary")}>
        {todayLabel}
      </Link>
      <Link href={href(next)} className={buttonClass("secondary", "icon")} aria-label="Próximo">
        <ChevronRight className="size-5" />
      </Link>
      <input
        type="date"
        value={date}
        aria-label="Escolher data"
        onChange={(e) => e.target.value && router.push(href(e.target.value))}
        className="h-10 rounded-lg border border-line bg-surface px-2 text-sm"
      />
    </div>
  );
}
