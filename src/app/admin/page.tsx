import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { ExternalLink, MessageCircle } from "lucide-react";
import { AppMark } from "@/components/shop-mark";
import { Badge, buttonClass, Card, Field, Input, Stat } from "@/components/ui";
import { BRAND } from "@/config/brand";
import { NICHES } from "@/config/niches";
import { requireAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { formatPhone, whatsappLink } from "@/lib/format";
import { formatDateNumeric, toDateStr } from "@/lib/time";
import { ResetLinkButton } from "./reset-link-button";

export const metadata: Metadata = { title: "Administração", robots: { index: false } };
export const viewport: Viewport = { themeColor: "#02081a" };

const DAY = 24 * 60 * 60_000;
const TZ = "America/Sao_Paulo";

/** Painel do dono da plataforma: quem se cadastrou, quem está usando e senhas esquecidas. */
export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const query = await searchParams;
  const customerEmail = typeof query.cliente === "string" ? query.cliente.trim().toLowerCase().slice(0, 254) : "";
  const now = new Date().getTime();
  const week = new Date(now - 7 * DAY);
  const month = new Date(now - 30 * DAY);
  const real = { shop: { isDemo: false } };

  const [shops, weekly, lastBooking, totals, customer] = await Promise.all([
    db.shop.findMany({
      where: { isDemo: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        niche: true,
        phone: true,
        createdAt: true,
        mpAccessToken: true,
        // O dono vem primeiro; depois os logins dos profissionais.
        users: {
          select: { id: true, name: true, email: true, _count: { select: { pushSubscriptions: true } } },
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
        },
        _count: { select: { professionals: true, appointments: true, clients: true } },
      },
    }),
    db.appointment.groupBy({ by: ["shopId"], where: { createdAt: { gte: week }, ...real }, _count: { _all: true } }),
    db.appointment.groupBy({ by: ["shopId"], where: real, _max: { createdAt: true } }),
    Promise.all([
      db.appointment.count({ where: { createdAt: { gte: week }, ...real } }),
      db.appointment.count({ where: { createdAt: { gte: month }, ...real } }),
      db.appointment.count({ where: { createdAt: { gte: month }, source: "ONLINE", ...real } }),
      db.customer.count(),
    ]),
    customerEmail ? db.customer.findUnique({ where: { email: customerEmail } }) : null,
  ]);
  const [bookingsWeek, bookingsMonth, onlineMonth, customers] = totals;
  const weeklyBy = new Map(weekly.map((w) => [w.shopId, w._count._all]));
  const lastBy = new Map(lastBooking.map((l) => [l.shopId, l._max.createdAt]));
  const newShops = shops.filter((s) => s.createdAt >= week).length;
  const day = (d: Date) => formatDateNumeric(toDateStr(d, TZ));

  return (
    <main className="theme-arvan flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <AppMark /> {BRAND.name} · Administração
          </span>
          <Link href="/painel" className={buttonClass("ghost", "sm")}>
            Meu painel
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Negócios" value={shops.length} hint={`${newShops} nos últimos 7 dias`} />
          <Stat label="Agendamentos (7 dias)" value={bookingsWeek} />
          <Stat label="Agendamentos (30 dias)" value={bookingsMonth} hint={`${onlineMonth} pelo site`} />
          <Stat label="Contas de cliente" value={customers} />
        </div>

        <section>
          <h2 className="mb-3 font-semibold">Negócios cadastrados</h2>
          <Card className="divide-y divide-line">
            {shops.length === 0 && <p className="p-4 text-sm text-muted">Ninguém se cadastrou ainda.</p>}
            {shops.map((shop) => {
              const owner = shop.users[0];
              const last = lastBy.get(shop.id);
              const devices = shop.users.reduce((sum, u) => sum + u._count.pushSubscriptions, 0);
              return (
                <div key={shop.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {shop.name}
                      <Badge>{NICHES[shop.niche].choice.replace(/^Sou /, "")}</Badge>
                      {shop.mpAccessToken ? <Badge tone="success">Mercado Pago</Badge> : <Badge>Paga no local</Badge>}
                      {devices > 0 && <Badge tone="info">Avisos em {devices} aparelho(s)</Badge>}
                    </p>
                    <p className="text-sm text-muted">
                      {owner?.name} · {owner?.email}
                      {shop.phone ? ` · ${formatPhone(shop.phone)}` : ""}
                    </p>
                    <p className="text-sm text-muted">
                      Desde {day(shop.createdAt)} · {shop._count.professionals} profissional(is)
                      {shop.users.length > 1 ? ` (${shop.users.length - 1} com login)` : ""} · {shop._count.clients} cliente(s) ·{" "}
                      {shop._count.appointments} agendamento(s), {weeklyBy.get(shop.id) ?? 0} na semana
                      {last ? ` · último em ${day(last)}` : " · nenhum ainda"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-start gap-2">
                    <a href={`/agendar/${shop.slug}`} target="_blank" className={buttonClass("ghost", "sm")}>
                      <ExternalLink className="size-4" aria-hidden /> Página
                    </a>
                    {shop.phone && (
                      <a href={whatsappLink(shop.phone)} target="_blank" rel="noreferrer" className={buttonClass("ghost", "sm")}>
                        <MessageCircle className="size-4" aria-hidden /> WhatsApp
                      </a>
                    )}
                    {owner && <ResetLinkButton target={{ userId: owner.id }} phone={shop.phone} name={owner.name} />}
                  </div>
                </div>
              );
            })}
          </Card>
        </section>

        <section>
          <h2 className="mb-1 font-semibold">Conta de cliente</h2>
          <p className="mb-3 text-sm text-muted">Para quem agenda com conta e esqueceu a senha.</p>
          <Card className="p-4">
            <form className="flex flex-wrap items-end gap-2">
              <Field label="E-mail da conta">
                <Input name="cliente" type="email" defaultValue={customerEmail} className="w-72 max-w-full" />
              </Field>
              <button className={buttonClass("secondary")}>Buscar</button>
            </form>
            {customerEmail &&
              (customer ? (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="text-sm">
                    <b>{customer.name}</b> · {formatPhone(customer.phone)}
                  </p>
                  <ResetLinkButton target={{ customerId: customer.id }} phone={customer.phone} name={customer.name} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted">Nenhuma conta com esse e-mail.</p>
              ))}
          </Card>
        </section>
      </div>
    </main>
  );
}
