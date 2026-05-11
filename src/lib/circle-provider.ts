import { createHash } from "node:crypto";

import type { MarketCard } from "./market-card";
import type { RewardReceipt } from "./settlement-adapters";
import { getProviderEnv, shouldUseCircle, type ProviderEnv } from "./provider-env";

interface CircleWalletsModule {
  initiateDeveloperControlledWalletsClient: (options: {
    apiKey: string;
    entitySecret: string;
    baseUrl?: string;
  }) => {
    createTransaction: (input: {
      blockchain: string;
      walletAddress: string;
      tokenAddress: string;
      destinationAddress: string;
      amount: string[];
      fee: { type: "level"; config: { feeLevel: "LOW" | "MEDIUM" | "HIGH" } };
      idempotencyKey: string;
    }) => Promise<{ data?: { id?: string; transactionId?: string; txHash?: string } }>;
  };
}

export async function settleCircleRewards(
  card: MarketCard,
  env: ProviderEnv = getProviderEnv(),
): Promise<RewardReceipt[] | undefined> {
  if (!shouldUseCircle(env)) return undefined;
  if (!env.circleApiKey || !env.circleEntitySecret || !env.circleWalletAddress || !env.circleTokenAddress) {
    return undefined;
  }

  const destinationAddress = env.circleRecipientAddress ?? env.rewardRecipientAddress;
  if (!destinationAddress) return undefined;

  const { initiateDeveloperControlledWalletsClient } = await importCircleWallets();
  const client = initiateDeveloperControlledWalletsClient({
    apiKey: env.circleApiKey,
    entitySecret: env.circleEntitySecret,
    baseUrl: env.circleBaseUrl,
  });
  const receipts: RewardReceipt[] = [];

  for (const validation of card.validations) {
    if (validation.rewardUsdc <= 0 || validation.rewardTxHash) continue;
    assertRewardIsAllowed(validation.rewardUsdc, env);

    const response = await client.createTransaction({
      blockchain: env.circleBlockchain,
      walletAddress: env.circleWalletAddress,
      tokenAddress: env.circleTokenAddress,
      destinationAddress,
      amount: [validation.rewardUsdc.toFixed(2)],
      fee: { type: "level", config: { feeLevel: "MEDIUM" } },
      idempotencyKey: buildCircleIdempotencyKey(card.id, validation.validator, validation.rewardUsdc),
    });
    const providerId = response.data?.txHash ?? response.data?.transactionId ?? response.data?.id;

    if (!providerId) {
      throw new Error("Circle transaction response did not include an id or tx hash");
    }

    receipts.push({
      network: env.circleEnv === "production" ? "circle-wallets-production" : "circle-wallets-sandbox",
      status: "SUCCESS",
      validator: validation.validator,
      amountUsdc: validation.rewardUsdc,
      txHash: providerId,
      settledAt: new Date().toISOString(),
    });
  }

  return receipts;
}

function assertRewardIsAllowed(amountUsdc: number, env: ProviderEnv): void {
  if (amountUsdc > env.maxRewardUsdc) {
    throw new Error(`Reward ${amountUsdc} USDC exceeds MAX_REWARD_USDC=${env.maxRewardUsdc}`);
  }

  if (env.circleEnv === "production" && !env.allowMainnetTransfers) {
    throw new Error("Circle production transfers require ALLOW_MAINNET_TRANSFERS=true");
  }
}

function buildCircleIdempotencyKey(cardId: string, validator: string, rewardUsdc: number): string {
  const bytes = Buffer.from(createHash("sha256").update(`${cardId}:${validator}:${rewardUsdc}`).digest("hex").slice(0, 32), "hex");
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function importCircleWallets(): Promise<CircleWalletsModule> {
  return import("@circle-fin/developer-controlled-wallets") as unknown as Promise<CircleWalletsModule>;
}
