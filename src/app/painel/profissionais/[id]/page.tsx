import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfessionalForm } from "../professional-form";

export const metadata: Metadata = { title: "Editar profissional" };

export default async function EditProfessionalPage({ params }: PageProps<"/painel/profissionais/[id]">) {
  const { id } = await params;
  const { shopId } = await requireUser();
  const [professional, services] = await Promise.all([
    db.professional.findFirst({
      where: { id, shopId },
      include: { workingHours: true, services: { select: { id: true } } },
    }),
    db.service.findMany({ where: { shopId, active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!professional) notFound();
  return (
    <>
      <PageHeader title={professional.name} back={{ href: "/painel/profissionais", label: "Profissionais" }} />
      <ProfessionalForm professional={professional} services={services} />
    </>
  );
}
