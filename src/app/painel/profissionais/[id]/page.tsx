import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireOwner } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfessionalForm } from "../professional-form";
import { StaffAccess } from "../staff-access";

export const metadata: Metadata = { title: "Editar profissional" };

export default async function EditProfessionalPage({ params }: PageProps<"/painel/profissionais/[id]">) {
  const { id } = await params;
  const { shopId, shop } = await requireOwner();
  const [professional, services] = await Promise.all([
    db.professional.findFirst({
      where: { id, shopId },
      include: { workingHours: true, services: { select: { id: true } }, user: { select: { email: true } } },
    }),
    db.service.findMany({ where: { shopId, active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!professional) notFound();
  return (
    <>
      <PageHeader title={professional.name} back={{ href: "/painel/profissionais", label: "Profissionais" }} />
      <div className="flex flex-col gap-4">
        <ProfessionalForm professional={professional} services={services} />
        <StaffAccess
          professional={{ id: professional.id, name: professional.name, phone: professional.phone, active: professional.active }}
          shopName={shop.name}
          email={professional.user?.email ?? null}
          locked={shop.isDemo}
        />
      </div>
    </>
  );
}
