#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  initiateDeveloperControlledWalletsClient,
  registerEntitySecretCiphertext,
} from "@circle-fin/developer-controlled-wallets";

const root = process.cwd();
const envPath = path.join(root, ".env.local");
const recoveryDir = path.join(root, ".circle");
const blockchain = "ARC-TESTNET";
const arcUsdcTokenAddress = "0x3600000000000000000000000000000000000000";
const defaultCircleBaseUrl = "https://api.circle.com";

function parseEnvFile(filePath) {
  const lines = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8").split(/\r?\n/) : [];
  const values = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !line.includes("=")) continue;
    const index = line.indexOf("=");
    values[line.slice(0, index).trim()] = unquote(line.slice(index + 1).trim());
  }
  return { lines, values };
}

function unquote(value) {
  if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
    return value.slice(1, -1);
  }
  return value;
}

function upsertEnv(filePath, updates) {
  const { lines } = parseEnvFile(filePath);
  const seen = new Set();
  const next = lines.map((line) => {
    if (!line.includes("=") || line.trim().startsWith("#")) return line;
    const key = line.slice(0, line.indexOf("=")).trim();
    if (!(key in updates)) return line;
    seen.add(key);
    return `${key}=${updates[key]}`;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) next.push(`${key}=${value}`);
  }

  fs.writeFileSync(filePath, `${next.join("\n").replace(/\n*$/, "")}\n`, { mode: 0o600 });
}

function redactedError(error) {
  const status = error?.response?.status ?? error?.status ?? error?.statusCode;
  const code = error?.response?.data?.code ?? error?.code;
  const message = error?.response?.data?.message ?? error?.message ?? String(error);
  return [status && `status=${status}`, code && `code=${code}`, message && `message=${message}`]
    .filter(Boolean)
    .join(" ");
}

function pickWallet(wallets) {
  return wallets.find((wallet) => wallet?.blockchain === blockchain && wallet?.address) ?? wallets.find((wallet) => wallet?.address);
}

function hasRecoveryFiles() {
  return fs.existsSync(recoveryDir) && fs.readdirSync(recoveryDir).some((name) => name.startsWith("recovery_file_"));
}

async function main() {
  const { values } = parseEnvFile(envPath);
  const circleEnv = values.CIRCLE_ENV || "sandbox";
  const baseUrl = values.CIRCLE_BASE_URL || defaultCircleBaseUrl;
  const apiKey = values.CIRCLE_API_KEY;

  if (!apiKey) {
    throw new Error("CIRCLE_API_KEY is missing in .env.local");
  }
  if (apiKey.split(":").length !== 3) {
    throw new Error("CIRCLE_API_KEY is not a Developer-Controlled Wallets API key in the expected three-part format");
  }

  fs.mkdirSync(recoveryDir, { recursive: true, mode: 0o700 });

  let entitySecret = values.CIRCLE_ENTITY_SECRET;
  let registeredEntitySecret = false;
  if (!entitySecret) {
    if (hasRecoveryFiles()) {
      throw new Error(
        "CIRCLE_ENTITY_SECRET is missing, but a Circle recovery file already exists. Reset/rotate the entity secret in Circle Console with the recovery file, then put the new CIRCLE_ENTITY_SECRET in .env.local.",
      );
    }
    entitySecret = crypto.randomBytes(32).toString("hex");
    await registerEntitySecretCiphertext({
      apiKey,
      entitySecret,
      baseUrl,
      recoveryFileDownloadPath: recoveryDir,
    });
    registeredEntitySecret = true;
    upsertEnv(envPath, {
      CIRCLE_ENV: circleEnv,
      CIRCLE_BASE_URL: baseUrl,
      CIRCLE_ENTITY_SECRET: entitySecret,
    });
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret, baseUrl });

  let walletAddress = values.CIRCLE_WALLET_ADDRESS;
  let createdWallet = false;

  if (!walletAddress) {
    const existingWalletsResponse = await client.listWallets({ blockchain, pageSize: 50 });
    const existingWallet = pickWallet(existingWalletsResponse.data?.wallets ?? []);

    if (existingWallet?.address) {
      walletAddress = existingWallet.address;
    } else {
      const walletSetResponse = await client.createWalletSet({
        name: "alpha-agora",
      });
      const walletSetId = walletSetResponse.data?.walletSet?.id;
      if (!walletSetId) throw new Error("Circle wallet set creation returned no id");

      const walletResponse = await client.createWallets({
        blockchains: [blockchain],
        count: 1,
        walletSetId,
      });
      const wallet = pickWallet(walletResponse.data?.wallets ?? []);
      if (!wallet?.address) throw new Error("Circle wallet creation returned no address");
      walletAddress = wallet.address;
      createdWallet = true;
    }
  }

  const recipientAddress = values.CIRCLE_RECIPIENT_ADDRESS || values.REWARD_RECIPIENT_ADDRESS || walletAddress;

  upsertEnv(envPath, {
    CIRCLE_ENV: circleEnv,
    CIRCLE_BASE_URL: baseUrl,
    CIRCLE_ENTITY_SECRET: entitySecret,
    CIRCLE_BLOCKCHAIN: blockchain,
    CIRCLE_WALLET_ADDRESS: walletAddress,
    CIRCLE_TOKEN_ADDRESS: values.CIRCLE_TOKEN_ADDRESS || values.ARC_USDC_ADDRESS || arcUsdcTokenAddress,
    CIRCLE_RECIPIENT_ADDRESS: recipientAddress,
  });

  console.log(JSON.stringify({
    ok: true,
    envFile: ".env.local",
    recoveryDir: ".circle",
    registeredEntitySecret,
    createdWallet,
    saved: {
      CIRCLE_ENTITY_SECRET: "set",
      CIRCLE_WALLET_ADDRESS: "set",
      CIRCLE_RECIPIENT_ADDRESS: "set",
      CIRCLE_BLOCKCHAIN: "set",
      CIRCLE_TOKEN_ADDRESS: "set",
    },
  }, null, 2));
}

main().catch((error) => {
  console.error(`Circle setup failed: ${redactedError(error)}`);
  process.exit(1);
});
