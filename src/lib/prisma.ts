import { PrismaPg } from "@prisma/adapter-pg";
import type { PoolConfig } from "pg";

import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis as unknown as { alphaAgoraPrisma?: PrismaClient };

const LOCAL_DATABASE_URL = "postgresql://alpha_agora:alpha_agora@localhost:54329/alpha_agora?schema=public";

function buildPrismaClient(): PrismaClient {
  const connectionString = getRuntimeDatabaseUrl();
  return new PrismaClient({
    adapter: new PrismaPg(buildRuntimePgConfig(connectionString)),
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

export function buildRuntimePgConfig(connectionString: string): PoolConfig {
  const relaxedSslModes = new Set(["prefer", "require", "verify-ca", "no-verify"]);

  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

    if (!sslMode || !relaxedSslModes.has(sslMode)) {
      return { connectionString };
    }

    url.searchParams.delete("sslmode");

    return {
      connectionString: url.toString(),
      ssl: { rejectUnauthorized: false },
    };
  } catch {
    return { connectionString };
  }
}

export const prisma = globalForPrisma.alphaAgoraPrisma ?? buildPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.alphaAgoraPrisma = prisma;
}
