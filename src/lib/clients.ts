import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Cliente do negócio pelo telefone, criando se ainda não existir. Guarda o e-mail se o cadastro ainda não tiver.
 * Duas requisições ao mesmo tempo com o mesmo telefone podem colidir no cadastro;
 * nesse caso, a segunda usa o cliente que a primeira acabou de criar.
 */
export async function findOrCreateClient(shopId: string, name: string, phone: string, email?: string | null) {
  const where = { shopId_phone: { shopId, phone } };
  let client;
  try {
    client = await db.client.upsert({ where, update: {}, create: { shopId, name, phone, email: email || null } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    client = await db.client.findUniqueOrThrow({ where });
  }
  if (email && !client.email) client = await db.client.update({ where: { id: client.id }, data: { email } });
  return client;
}
