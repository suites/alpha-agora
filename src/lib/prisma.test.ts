import { describe, expect, it } from "vitest";

import { buildRuntimePgConfig } from "./prisma";

describe("buildRuntimePgConfig", () => {
  it("loosens certificate verification for Supabase sslmode=require runtime URLs", () => {
    const config = buildRuntimePgConfig(
      "postgresql://user:pass@db.example.supabase.co:5432/postgres?sslmode=require&schema=public",
    );

    expect(config).toEqual({
      connectionString: "postgresql://user:pass@db.example.supabase.co:5432/postgres?schema=public",
      ssl: { rejectUnauthorized: false },
    });
  });

  it("preserves strict verify-full runtime URLs", () => {
    const connectionString = "postgresql://user:pass@db.example.supabase.co:5432/postgres?sslmode=verify-full";

    expect(buildRuntimePgConfig(connectionString)).toEqual({ connectionString });
  });
});
