import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Cliente da barbearia pelo telefone, criando se ainda não existir.
 * Duas requisições ao mesmo tempo com o mesmo telefone podem colidir no cadastro;
 * nesse caso, a segunda usa o cliente que a primeira acabou de criar.
 */
export async function findOrCreateClient(shopId: string, name: string, phone: string) {
  const where = { shopId_phone: { shopId, phone } };
  try {
    return await db.client.upsert({ where, update: {}, create: { shopId, name, phone } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return db.client.findUniqueOrThrow({ where });
    }
    throw error;
  }
}
