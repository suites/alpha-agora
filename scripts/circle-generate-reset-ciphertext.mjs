#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {
  generateEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const outDir = path.join(root, ".circle", "entity-secret-reset");

function parseEnvFile(filePath) {
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").split(/\r?\n/) : [];
  const values = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    values[line.slice(0, index).trim()] = unquote(line.slice(index + 1).trim());
  }
  return values;
}

function unquote(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const env = parseEnvFile(envPath);
  const apiKey = env.CIRCLE_API_KEY;
  const baseUrl = env.CIRCLE_BASE_URL || "https://api.circle.com";

  if (!apiKey) throw new Error(`CIRCLE_API_KEY is missing in ${envPath}`);

  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });

  const newEntitySecret = crypto.randomBytes(32).toString("hex");

  const ciphertext = await generateEntitySecretCiphertext({
    apiKey,
    entitySecret: newEntitySecret,
    baseUrl,
  });

  const stamp = safeTimestamp();
  const ciphertextPath = path.join(outDir, `new_entity_secret_ciphertext_${stamp}.txt`);
  const secretPath = path.join(outDir, `new_entity_secret_${stamp}.env`);
  const manifestPath = path.join(outDir, `reset_manifest_${stamp}.json`);

  fs.writeFileSync(ciphertextPath, `${ciphertext}\n`, { mode: 0o600 });
  fs.writeFileSync(secretPath, `CIRCLE_ENTITY_SECRET=${newEntitySecret}\n`, { mode: 0o600 });
  fs.writeFileSync(manifestPath, JSON.stringify({
    createdAt: new Date().toISOString(),
    baseUrl,
    ciphertextFile: ciphertextPath,
    entitySecretEnvFile: secretPath,
    note: "Paste ciphertextFile contents into Circle Console reset form. After reset succeeds, update CIRCLE_ENTITY_SECRET from entitySecretEnvFile.",
  }, null, 2) + "\n", { mode: 0o600 });

  console.log(JSON.stringify({
    ok: true,
    ciphertextFile: ciphertextPath,
    entitySecretEnvFile: secretPath,
    manifestFile: manifestPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.message ?? String(error));
  process.exit(1);
});
