import { db } from "@/lib/db";

/** Logo do negócio. Fica guardada no banco e é servida aqui com cache, em vez de ir embutida em cada página. */
export async function GET(_: Request, { params }: RouteContext<"/api/logo/[shopId]">) {
  const { shopId } = await params;
  const shop = await db.shop.findUnique({ where: { id: shopId }, select: { logoUrl: true } });
  const match = shop?.logoUrl?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!match) return new Response("Logo não encontrada", { status: 404 });
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, {
    headers: {
      "Content-Type": match[1],
      // O endereço muda quando a logo muda (?v=...), então pode guardar por bastante tempo.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
