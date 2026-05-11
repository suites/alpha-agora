#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { initiateDeveloperControlledWalletsClient } from "@circle-fin/developer-controlled-wallets";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const outDir = path.join(root, ".circle", "wallet-setup");
const defaultBaseUrl = "https://api.circle.com";
const defaultBlockchain = "ARC-TESTNET";
const defaultTokenAddress = "0x3600000000000000000000000000000000000000";

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

function pickWallet(wallets, blockchain) {
  return wallets.find((wallet) => wallet?.blockchain === blockchain && wallet?.address) ?? wallets.find((wallet) => wallet?.address);
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
  const baseUrl = env.CIRCLE_BASE_URL || defaultBaseUrl;
  const circleEnv = env.CIRCLE_ENV || "sandbox";
  const blockchain = env.CIRCLE_BLOCKCHAIN || defaultBlockchain;
  const tokenAddress = env.CIRCLE_TOKEN_ADDRESS || env.ARC_USDC_ADDRESS || defaultTokenAddress;

  if (!apiKey) throw new Error(`CIRCLE_API_KEY is missing in ${envPath}`);
  if (!entitySecret) throw new Error(`CIRCLE_ENTITY_SECRET is missing in ${envPath}`);

  fs.mkdirSync(outDir, { recursive: true, mode: 0o700 });

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret, baseUrl });

  const existingWalletsResponse = await client.listWallets({ blockchain, pageSize: 50 });
  const existingWallets = existingWalletsResponse.data?.wallets ?? [];
  let wallet = pickWallet(existingWallets, blockchain);
  let walletSetId = wallet?.walletSetId;
  let createdWalletSet = false;
  let createdWallet = false;

  if (!wallet?.address) {
    const walletSetResponse = await client.createWalletSet({ name: "alpha-agora" });
    walletSetId = walletSetResponse.data?.walletSet?.id;
    if (!walletSetId) throw new Error("Circle wallet set creation returned no id");
    createdWalletSet = true;

    const walletResponse = await client.createWallets({
      blockchains: [blockchain],
      count: 1,
      walletSetId,
    });
    wallet = pickWallet(walletResponse.data?.wallets ?? [], blockchain);
    if (!wallet?.address) throw new Error("Circle wallet creation returned no address");
    createdWallet = true;
  }

  const walletAddress = wallet.address;
  const recipientAddress = env.CIRCLE_RECIPIENT_ADDRESS || env.REWARD_RECIPIENT_ADDRESS || walletAddress;
  const stamp = safeTimestamp();
  const envOutPath = path.join(outDir, `circle_wallet_env_${stamp}.env`);
  const jsonOutPath = path.join(outDir, `circle_wallet_result_${stamp}.json`);

  const envContent = [
    `CIRCLE_ENV=${circleEnv}`,
    `CIRCLE_BASE_URL=${baseUrl}`,
    `CIRCLE_BLOCKCHAIN=${blockchain}`,
    `CIRCLE_WALLET_ADDRESS=${walletAddress}`,
    `CIRCLE_TOKEN_ADDRESS=${tokenAddress}`,
    `CIRCLE_RECIPIENT_ADDRESS=${recipientAddress}`,
    "",
  ].join("\n");

  const result = {
    ok: true,
    createdWalletSet,
    createdWallet,
    existingWalletCountBeforeCreate: existingWallets.length,
    envFile: envOutPath,
    resultFile: jsonOutPath,
    circle: {
      baseUrl,
      circleEnv,
      blockchain,
      walletSetId: wallet.walletSetId ?? walletSetId ?? null,
      walletId: wallet.id ?? null,
      walletAddress,
      tokenAddress,
      recipientAddress,
    },
    nextStep: "Copy variables from envFile into .env.local. Keep CIRCLE_ENTITY_SECRET already configured.",
  };

  fs.writeFileSync(envOutPath, envContent, { mode: 0o600 });
  fs.writeFileSync(jsonOutPath, JSON.stringify(result, null, 2) + "\n", { mode: 0o600 });

  console.log(JSON.stringify({
    ok: true,
    createdWalletSet,
    createdWallet,
    walletAddress,
    envFile: envOutPath,
    resultFile: jsonOutPath,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: summarizeError(error) }, null, 2));
  process.exit(1);
});
