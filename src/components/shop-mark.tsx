import type { Niche } from "@prisma/client";
import { NICHES } from "@/config/niches";
import { ArvanLogo } from "./brand-logo";
import { cn } from "./ui";

const SIZES = {
  sm: { box: "size-7 rounded-md", icon: "size-4" },
  md: { box: "size-8 rounded-control", icon: "size-4" },
  lg: { box: "size-12 rounded-card", icon: "size-6" },
  xl: { box: "size-14 rounded-card", icon: "size-7" },
};

/** Logo do negócio ou, sem logo, o ícone da área de atuação na cor do negócio. */
export function ShopMark({
  shop,
  size = "md",
}: {
  shop: { logoUrl: string | null; niche: Niche };
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];
  if (shop.logoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={shop.logoUrl} alt="" className={cn(s.box, "shrink-0 object-cover")} />;
  }
  const Icon = NICHES[shop.niche].icon;
  return (
    <span className={cn(s.box, "grid shrink-0 place-items-center bg-brand text-brand-fg")}>
      <Icon className={s.icon} aria-hidden />
    </span>
  );
}

/** Logo da plataforma (fora do painel de um negócio). */
export function AppMark({ className }: { className?: string }) {
  return <ArvanLogo className={className} />;
}
