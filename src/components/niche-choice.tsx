import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { NICHE_ORDER, NICHES } from "@/config/niches";
import { brandStyle } from "@/lib/format";

/** Cartões para a pessoa escolher a área dela antes do cadastro. */
export function NicheChoice({ singleColumn = false }: { singleColumn?: boolean }) {
  return (
    <div className={singleColumn ? "grid gap-3" : "grid gap-3 sm:grid-cols-2"}>
      {NICHE_ORDER.map((niche) => {
        const config = NICHES[niche];
        return (
          <Link
            key={niche}
            href={`/cadastro?tipo=${config.slug}`}
            style={brandStyle(config.color)}
            className="group flex items-center gap-4 rounded-card border border-line bg-surface p-4 text-left transition hover:border-brand hover:shadow-sm"
          >
            <span className="grid size-12 shrink-0 place-items-center rounded-card bg-brand text-brand-fg">
              <config.icon className="size-6" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{config.choice}</span>
              <span className="block text-sm text-muted">{config.description}</span>
            </span>
            <ChevronRight className="size-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand" aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}
