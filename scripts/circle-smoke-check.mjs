#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { initiateDeveloperControlledWalletsClient, generateEntitySecretCiphertext } from "@circle-fin/developer-controlled-wallets";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

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

function summarizeError(error) {
  const status = error?.response?.status ?? error?.status ?? error?.statusCode;
  const code = error?.response?.data?.code ?? error?.code;
  const message = error?.response?.data?.message ?? error?.message ?? String(error);
  return { status, code, message };
}

async function main() {
  const env = parseEnvFile(envPath);
  const apiKey = env.CIRCLE_API_KEY;
  const entitySecret = env.CIRCLE_ENTITY_SECRET;
  const baseUrl = env.CIRCLE_BASE_URL || "https://api.circle.com";
  const blockchain = env.CIRCLE_BLOCKCHAIN || "ARC-TESTNET";

  if (!apiKey) throw new Error("CIRCLE_API_KEY missing");
  if (!entitySecret) throw new Error("CIRCLE_ENTITY_SECRET missing");

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret, baseUrl });

  const ciphertext = await generateEntitySecretCiphertext({ apiKey, entitySecret, baseUrl });
  if (!ciphertext || typeof ciphertext !== "string" || ciphertext.length < 100) {
    throw new Error("generateEntitySecretCiphertext returned an invalid ciphertext shape");
  }

  const walletsResponse = await client.listWallets({ blockchain, pageSize: 10 });
  const wallets = walletsResponse.data?.wallets ?? [];

  console.log(JSON.stringify({
    ok: true,
    checks: {
      entitySecretCiphertextGenerated: true,
      listWallets: true,
    },
    circle: {
      baseUrl,
      blockchain,
      walletCount: wallets.length,
      firstWalletAddressPresent: Boolean(wallets[0]?.address),
      firstWalletBlockchain: wallets[0]?.blockchain,
    },
    envCompleteness: {
      CIRCLE_WALLET_ADDRESS: Boolean(env.CIRCLE_WALLET_ADDRESS),
      CIRCLE_RECIPIENT_ADDRESS: Boolean(env.CIRCLE_RECIPIENT_ADDRESS),
      CIRCLE_TOKEN_ADDRESS: Boolean(env.CIRCLE_TOKEN_ADDRESS),
    }
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: summarizeError(error) }, null, 2));
  process.exit(1);
});
