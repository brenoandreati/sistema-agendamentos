import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "Editar serviço" };

export default async function EditServicePage({ params }: PageProps<"/painel/servicos/[id]">) {
  const { id } = await params;
  const { shopId } = await requireUser();
  const [service, professionals] = await Promise.all([
    db.service.findFirst({ where: { id, shopId }, include: { professionals: { select: { id: true } } } }),
    db.professional.findMany({ where: { shopId, active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!service) notFound();
  return (
    <>
      <PageHeader title={service.name} back={{ href: "/painel/servicos", label: "Serviços" }} />
      <ServiceForm service={service} professionals={professionals} />
    </>
  );
}
