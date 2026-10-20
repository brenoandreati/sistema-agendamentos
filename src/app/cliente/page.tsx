import Link from "next/link";
import type { Metadata } from "next";
import type { AppointmentStatus, Niche } from "@prisma/client";
import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { ShopMark } from "@/components/shop-mark";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { getCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { APPOINTMENT_STATUS, brandStyle, formatPhone } from "@/lib/format";
import { formatDateShort, formatTime, toDateStr } from "@/lib/time";
import { customerSignOut } from "./actions";
import { LoginPanel } from "./login-panel";

export const metadata: Metadata = { title: "Minha conta" };

export default async function CustomerPage({ searchParams }: PageProps<"/cliente">) {
  const { voltar } = await searchParams;
  const back = typeof voltar === "string" && /^\/agendar\/[a-z0-9-]+$/.test(voltar) ? voltar : null;
  const customer = await getCustomer();

  if (!customer) {
    return (
      <div className="mx-auto max-w-sm">
        {back && <BackLink href={back} />}
        <h1 className="text-xl font-semibold">Minha conta</h1>
        <p className="mt-1 mb-5 text-sm text-muted">
          Com uma conta, seus dados já vêm preenchidos nos próximos agendamentos e você vê todos os seus horários aqui.
        </p>
        <Card className="p-5">
          <LoginPanel />
        </Card>
      </div>
    );
  }

  const appointments = await db.appointment.findMany({
    where: { customerId: customer.id },
    include: {
      shop: { select: { name: true, slug: true, timezone: true, logoUrl: true, niche: true, primaryColor: true } },
      services: { select: { name: true } },
      professional: { select: { name: true } },
    },
    orderBy: { startAt: "desc" },
    take: 100,
  });
  const now = new Date();
  const active = (status: string) => status === "CONFIRMED" || status === "PENDING_PAYMENT";
  const upcoming = appointments.filter((a) => a.endAt > now && active(a.status)).reverse();
  const history = appointments.filter((a) => !(a.endAt > now && active(a.status)));

  async function signOut() {
    "use server";
    await customerSignOut();
    redirect("/cliente");
  }

  return (
    <>
      {back && <BackLink href={back} />}
      <PageHeader
        title={`Olá, ${customer.name.split(" ")[0]}!`}
        description={`${customer.email} · ${formatPhone(customer.phone)}`}
        actions={
          <form action={signOut}>
            <button className="flex items-center gap-2 text-sm text-muted hover:text-fg">
              <LogOut className="size-4" aria-hidden /> Sair
            </button>
          </form>
        }
      />
      <Section title="Próximos horários" empty="Você não tem horários marcados.">
        {upcoming.map((a) => (
          <Row key={a.id} appointment={a} />
        ))}
      </Section>
      <Section title="Histórico" empty="Seus agendamentos anteriores aparecem aqui.">
        {history.map((a) => (
          <Row key={a.id} appointment={a} />
        ))}
      </Section>
    </>
  );
}

type Item = {
  id: string;
  startAt: Date;
  status: AppointmentStatus;
  publicToken: string;
  shop: { name: string; slug: string; timezone: string; logoUrl: string | null; niche: Niche; primaryColor: string };
  services: { name: string }[];
  professional: { name: string };
};

function Row({ appointment: a }: { appointment: Item }) {
  const status = APPOINTMENT_STATUS[a.status];
  return (
    <Link
      href={`/agendar/${a.shop.slug}/agendamento/${a.publicToken}`}
      style={brandStyle(a.shop.primaryColor)}
      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2"
    >
      <ShopMark shop={a.shop} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{a.shop.name}</p>
        <p className="text-sm">
          {formatDateShort(toDateStr(a.startAt, a.shop.timezone))} às {formatTime(a.startAt, a.shop.timezone)}
        </p>
        <p className="truncate text-sm text-muted">
          {a.services.map((s) => s.name).join(" + ")} · {a.professional.name}
        </p>
      </div>
      <Badge tone={status.tone}>{status.label}</Badge>
    </Link>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children.length ? <Card className="divide-y divide-line">{children}</Card> : <EmptyState title={empty} />}
    </section>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="mb-3 inline-block text-sm text-muted hover:text-fg">
      ← Voltar para o agendamento
    </Link>
  );
}
