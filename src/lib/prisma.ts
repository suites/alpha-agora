import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { alphaAgoraPrisma?: PrismaClient };

const LOCAL_DATABASE_URL = "postgresql://alpha_agora:alpha_agora@localhost:54329/alpha_agora?schema=public";

function buildPrismaClient(): PrismaClient {
  const connectionString = getRuntimeDatabaseUrl();
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

function getRuntimeDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL_NON_POOLING ??
    process.env.POSTGRES_URL ??
    LOCAL_DATABASE_URL
  );
}

export const prisma = globalForPrisma.alphaAgoraPrisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.alphaAgoraPrisma = prisma;
}
