import Link from "next/link";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Badge, Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { durationLabel } from "@/lib/format";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Serviços" };

export default async function ServicesPage() {
  const { shopId } = await requireUser();
  const services = await db.service.findMany({
    where: { shopId },
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { professionals: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader
        title="Serviços"
        description="O que os clientes podem agendar, com duração e preço."
        actions={
          <LinkButton href="/painel/servicos/novo">
            <Plus className="size-4" aria-hidden /> Novo serviço
          </LinkButton>
        }
      />
      {services.length === 0 ? (
        <EmptyState title="Nenhum serviço cadastrado">Cadastre o primeiro serviço para começar a receber agendamentos.</EmptyState>
      ) : (
        <Card className="divide-y divide-line">
          {services.map((service) => (
            <Link key={service.id} href={`/painel/servicos/${service.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-surface-2">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium">
                  {service.name}
                  {!service.active && <Badge>Inativo</Badge>}
                </p>
                <p className="truncate text-sm text-muted">
                  {durationLabel(service.durationMin)} · {service.professionals.map((p) => p.name).join(", ") || "Nenhum profissional"}
                </p>
              </div>
              <p className="font-semibold tabular-nums">{formatMoney(service.priceCents)}</p>
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
