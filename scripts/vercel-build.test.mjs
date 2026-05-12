import { describe, expect, it } from "vitest";

import { getMigrationUrlSource, requireVercelMigrationUrl, shouldRunMigrateDeploy } from "./vercel-build.mjs";

describe("vercel build migration guard", () => {
  it("runs migrate deploy on Vercel when a migration database URL is configured", () => {
    expect(
      shouldRunMigrateDeploy({
        VERCEL: "1",
        POSTGRES_URL_NON_POOLING: "postgresql://direct-db.example.com/app",
      }),
    ).toBe(true);
  });

  it("does not run migrate deploy for local builds", () => {
    expect(
      shouldRunMigrateDeploy({
        POSTGRES_URL_NON_POOLING: "postgresql://direct-db.example.com/app",
      }),
    ).toBe(false);
  });

  it("fails closed on Vercel when no database URL is configured", () => {
    expect(() => requireVercelMigrationUrl({ VERCEL: "1" })).toThrow(
      "Vercel build requires a Prisma migration database URL",
    );
  });

  it("prefers direct migration URLs over pooled runtime URLs", () => {
    expect(
      getMigrationUrlSource({
        VERCEL: "1",
        DIRECT_URL: "postgresql://direct.example.com/app",
        POSTGRES_URL_NON_POOLING: "postgresql://non-pooling.example.com/app",
        DATABASE_URL: "postgresql://pooled.example.com/app",
      }),
    ).toBe("DIRECT_URL");
  });

  it("ignores blank higher-priority database URL values", () => {
    expect(
      getMigrationUrlSource({
        VERCEL: "1",
        DIRECT_URL: "   ",
        POSTGRES_URL_NON_POOLING: "postgresql://non-pooling.example.com/app",
      }),
    ).toBe("POSTGRES_URL_NON_POOLING");
  });
});
