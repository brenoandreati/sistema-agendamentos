import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ServiceForm } from "../service-form";

export const metadata: Metadata = { title: "Novo serviço" };

export default async function NewServicePage() {
  const { shopId } = await requireUser();
  const professionals = await db.professional.findMany({ where: { shopId, active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <>
      <PageHeader title="Novo serviço" back={{ href: "/painel/servicos", label: "Serviços" }} />
      <ServiceForm professionals={professionals} />
    </>
  );
}
