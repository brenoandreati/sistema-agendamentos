import Link from "next/link";
import type { Metadata } from "next";
import { Plus, Search } from "lucide-react";
import { Card, EmptyState, Input, LinkButton, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPhone, onlyDigits } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { formatDateNumeric, toDateStr } from "@/lib/time";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientsPage({ searchParams }: PageProps<"/painel/clientes">) {
  const { shop } = await requireUser();
  const q = typeof (await searchParams).q === "string" ? String((await searchParams).q).trim() : "";
  const digits = onlyDigits(q);

  const clients = await db.client.findMany({
    where: {
      shopId: shop.id,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              ...(digits.length >= 3 ? [{ phone: { contains: digits } }] : []),
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: 200,
  });

  const ids = clients.map((c) => c.id);
  const [spent, visits] = await Promise.all([
    db.payment.groupBy({
      by: ["clientId"],
      where: { clientId: { in: ids }, status: "APPROVED" },
      _sum: { amountCents: true },
    }),
    db.appointment.groupBy({
      by: ["clientId"],
      where: { clientId: { in: ids }, status: { in: ["CONFIRMED", "COMPLETED"] } },
      _count: true,
      _max: { startAt: true },
    }),
  ]);
  const spentBy = new Map(spent.map((s) => [s.clientId, s._sum.amountCents ?? 0]));
  const visitsBy = new Map(visits.map((v) => [v.clientId, v]));

  return (
    <>
      <PageHeader
        title="Clientes"
        actions={
          <LinkButton href="/painel/clientes/novo">
            <Plus className="size-4" aria-hidden /> Novo cliente
          </LinkButton>
        }
      />
      <form className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
        <Input name="q" defaultValue={q} placeholder="Buscar por nome ou telefone" className="pl-9" />
      </form>
      {clients.length === 0 ? (
        <EmptyState title={q ? "Nenhum cliente encontrado" : "Nenhum cliente ainda"}>
          {q ? "Tente outro nome ou telefone." : "Os clientes que agendarem online aparecem aqui automaticamente."}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line">
          {clients.map((client) => {
            const visit = visitsBy.get(client.id);
            return (
              <Link key={client.id} href={`/painel/clientes/${client.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-surface-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{client.name}</p>
                  <p className="text-sm text-muted">{formatPhone(client.phone)}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-medium tabular-nums">{formatMoney(spentBy.get(client.id) ?? 0)}</p>
                  <p className="text-muted">
                    {visit ? `${visit._count} visita(s) · última ${formatDateNumeric(toDateStr(visit._max.startAt!, shop.timezone))}` : "Sem visitas"}
                  </p>
                </div>
              </Link>
            );
          })}
        </Card>
      )}
    </>
  );
}
