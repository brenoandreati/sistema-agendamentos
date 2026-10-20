import type { Metadata } from "next";
import { Card, PageHeader } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Novo cliente" };

export default async function NewClientPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Novo cliente" back={{ href: "/painel/clientes", label: "Clientes" }} />
      <Card className="max-w-2xl p-5">
        <ClientForm />
      </Card>
    </>
  );
}
