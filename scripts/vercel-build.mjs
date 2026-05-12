#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MIGRATION_URL_ENV_ORDER = ["DIRECT_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];

export function getMigrationUrlSource(env = process.env) {
  return MIGRATION_URL_ENV_ORDER.find((key) => typeof env[key] === "string" && env[key].trim().length > 0);
}

export function shouldRunMigrateDeploy(env = process.env) {
  return env.VERCEL === "1" && Boolean(getMigrationUrlSource(env));
}

export function requireVercelMigrationUrl(env = process.env) {
  if (env.VERCEL !== "1") return undefined;

  const migrationUrlSource = getMigrationUrlSource(env);
  if (!migrationUrlSource) {
    throw new Error(
      "Vercel build requires a Prisma migration database URL. Configure DIRECT_URL or POSTGRES_URL_NON_POOLING from the Supabase integration.",
    );
  }

  return migrationUrlSource;
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

export function main(env = process.env) {
  const migrationUrlSource = env.VERCEL === "1" ? requireVercelMigrationUrl(env) : getMigrationUrlSource(env);

  if (shouldRunMigrateDeploy(env)) {
    console.log(`Running Prisma migrations on Vercel using ${migrationUrlSource}.`);
    run("pnpm", ["exec", "prisma", "migrate", "deploy"]);
  } else {
    const reason = env.VERCEL === "1" ? "no database URL env var was configured" : "this is not a Vercel build";
    console.log(`Skipping Prisma migrations because ${reason}.`);
  }

  run("pnpm", ["exec", "prisma", "generate"]);
  run("pnpm", ["exec", "next", "build"]);
}

const isDirectRun = process.argv[1] === fileURLToPath(import.meta.url);
if (isDirectRun) {
  main();
}
