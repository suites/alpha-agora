import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { alphaAgoraPrisma?: PrismaClient };

function buildPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL ?? "postgresql://alpha_agora:alpha_agora@localhost:54329/alpha_agora?schema=public";
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.alphaAgoraPrisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.alphaAgoraPrisma = prisma;
}
