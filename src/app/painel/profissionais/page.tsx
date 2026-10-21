import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { NICHES } from "@/config/niches";
import { db } from "@/lib/db";
import { minutesToHHMM, WEEKDAYS } from "@/lib/time";

export const metadata: Metadata = { title: "Profissionais" };

export default async function ProfessionalsPage() {
  const { shopId, shop } = await requireUser();
  const professionals = await db.professional.findMany({
    where: { shopId },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }],
    include: { workingHours: true, _count: { select: { services: true } } },
  });

  return (
    <>
      <PageHeader
        title={NICHES[shop.niche].team}
        description="Cada profissional tem a sua agenda e os seus horários."
        actions={
          <LinkButton href="/painel/profissionais/novo">
            <Plus className="size-4" aria-hidden /> Novo profissional
          </LinkButton>
        }
      />
      <Card className="divide-y divide-line">
        {professionals.map((p) => {
          const days = [...new Set(p.workingHours.map((h) => h.weekday))].sort();
          const first = p.workingHours.length ? Math.min(...p.workingHours.map((h) => h.startMin)) : null;
          const last = p.workingHours.length ? Math.max(...p.workingHours.map((h) => h.endMin)) : null;
          return (
            <Link key={p.id} href={`/painel/profissionais/${p.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-2">
              <span className="size-3 shrink-0 rounded-full" style={{ background: p.color }} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-medium">
                  {p.name}
                  {!p.active && <Badge>Inativo</Badge>}
                  {p.active && !p.bookableOnline && <Badge tone="warning">Fora do agendamento online</Badge>}
                </p>
                <p className="truncate text-sm text-muted">
                  {days.length
                    ? `${days.map((d) => WEEKDAYS[d].slice(0, 3)).join(", ")} · ${minutesToHHMM(first!)}–${minutesToHHMM(last!)}`
                    : "Sem horário definido"}{" "}
                  · {p._count.services} serviço(s)
                </p>
              </div>
            </Link>
          );
        })}
      </Card>
    </>
  );
}
