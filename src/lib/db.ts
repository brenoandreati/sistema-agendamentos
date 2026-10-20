import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// No Cloudflare Workers uma conexão aberta numa requisição não pode ser usada em outra,
// então cada requisição ganha o seu próprio PrismaClient. Fora do Cloudflare
// (next dev, next start, scripts) um único cliente é compartilhado.

type DatabaseEnv = { HYPERDRIVE?: { connectionString: string } };

function connectionString(env?: DatabaseEnv) {
  const url = env?.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DATABASE_URL com o endereço do banco PostgreSQL.");
  return url;
}

function createClient(url: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

function workerContext() {
  if (typeof navigator === "undefined" || navigator.userAgent !== "Cloudflare-Workers") return null;
  try {
    return getCloudflareContext();
  } catch {
    return null;
  }
}

const perRequest = new WeakMap<object, PrismaClient>();
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function currentClient(): PrismaClient {
  const cf = workerContext();
  if (cf) {
    let client = perRequest.get(cf.ctx);
    if (!client) {
      client = createClient(connectionString(cf.env as DatabaseEnv));
      perRequest.set(cf.ctx, client);
    }
    return client;
  }
  globalForPrisma.prisma ??= createClient(connectionString());
  return globalForPrisma.prisma;
}

/** Acesso ao banco. Resolve o cliente certo para a requisição atual a cada uso. */
export const db = new Proxy({} as PrismaClient, {
  get(_, property) {
    const client = currentClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
