import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfessionalForm } from "../professional-form";

export const metadata: Metadata = { title: "Novo profissional" };

export default async function NewProfessionalPage() {
  const { shopId } = await requireOwner();
  const [services, count] = await Promise.all([
    db.service.findMany({ where: { shopId, active: true }, orderBy: { sortOrder: "asc" } }),
    db.professional.count({ where: { shopId } }),
  ]);
  return (
    <>
      <PageHeader title="Novo profissional" back={{ href: "/painel/profissionais", label: "Profissionais" }} />
      <ProfessionalForm services={services} colorIndex={count} />
    </>
  );
}
