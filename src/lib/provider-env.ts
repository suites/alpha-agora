export type RuntimeMode = "demo" | "production";

const ARC_TESTNET_USDC_ADDRESS = "0x3600000000000000000000000000000000000000" as const;

export interface ProviderEnv {
  mode: RuntimeMode;
  llmProvider: string;
  geminiApiKey?: string;
  geminiModel: string;
  arcRpcUrl?: string;
  arcChainId: number;
  arcExplorerUrl?: string;
  arcCommitterPrivateKey?: `0x${string}`;
  arcUsdcAddress?: `0x${string}`;
  rewardRecipientAddress?: `0x${string}`;
  circleEnv: "sandbox" | "production";
  circleApiKey?: string;
  circleEntitySecret?: string;
  circleBaseUrl: string;
  circleBlockchain: string;
  circleWalletAddress?: `0x${string}`;
  circleTokenAddress?: `0x${string}`;
  circleRecipientAddress?: `0x${string}`;
  allowMainnetTransfers: boolean;
  maxRewardUsdc: number;
}

export interface ProviderPreflight {
  settlementPossible: boolean;
  providers: {
    arc: { configured: boolean; reason?: string };
    circle: { configured: boolean; reason?: string };
  };
}

export function getProviderEnv(env: NodeJS.ProcessEnv = process.env): ProviderEnv {
  return {
    mode: env.ALPHA_AGORA_MODE === "production" ? "production" : "demo",
    llmProvider: env.LLM_PROVIDER?.trim().toLowerCase() || "demo",
    geminiApiKey: optional(env.GEMINI_API_KEY) ?? optional(env.GOOGLE_GENERATIVE_AI_API_KEY),
    geminiModel: optional(env.GEMINI_MODEL) ?? "gemini-2.5-flash",
    arcRpcUrl: optional(env.ARC_RPC_URL),
    arcChainId: numberFromEnv(env.ARC_CHAIN_ID, 5042002),
    arcExplorerUrl: optional(env.ARC_EXPLORER_URL),
    arcCommitterPrivateKey: privateKeyFromEnv(env.ARC_COMMITTER_PRIVATE_KEY),
    arcUsdcAddress: addressFromEnv(env.ARC_USDC_ADDRESS),
    rewardRecipientAddress: addressFromEnv(env.REWARD_RECIPIENT_ADDRESS),
    circleEnv: env.CIRCLE_ENV === "production" ? "production" : "sandbox",
    circleApiKey: optional(env.CIRCLE_API_KEY),
    circleEntitySecret: optional(env.CIRCLE_ENTITY_SECRET),
    circleBaseUrl: optional(env.CIRCLE_BASE_URL) ?? circleBaseUrlForEnv(),
    circleBlockchain: optional(env.CIRCLE_BLOCKCHAIN) ?? "ARC-TESTNET",
    circleWalletAddress: addressFromEnv(env.CIRCLE_WALLET_ADDRESS),
    circleTokenAddress: addressFromEnv(env.CIRCLE_TOKEN_ADDRESS) ?? addressFromEnv(env.ARC_USDC_ADDRESS) ?? ARC_TESTNET_USDC_ADDRESS,
    circleRecipientAddress: addressFromEnv(env.CIRCLE_RECIPIENT_ADDRESS),
    allowMainnetTransfers: env.ALLOW_MAINNET_TRANSFERS === "true",
    maxRewardUsdc: numberFromEnv(env.MAX_REWARD_USDC, 1),
  };
}

export function shouldUseGemini(env = getProviderEnv()): boolean {
  return (env.llmProvider === "gemini" || env.llmProvider === "google") && Boolean(env.geminiApiKey);
}

export function shouldUseArc(env = getProviderEnv()): boolean {
  return Boolean(env.arcRpcUrl && env.arcCommitterPrivateKey);
}

export function shouldUseCircle(env = getProviderEnv()): boolean {
  return Boolean(
    env.circleApiKey &&
      env.circleEntitySecret &&
      env.circleWalletAddress &&
      env.circleTokenAddress &&
      (env.circleRecipientAddress || env.rewardRecipientAddress),
  );
}

export function getProviderPreflight(env: NodeJS.ProcessEnv = process.env): ProviderPreflight {
  const parsed = getProviderEnv(env);
  const arcChecks = [
    parsed.arcRpcUrl ? null : "ARC_RPC_URL missing",
    parsed.arcCommitterPrivateKey ? null : env.ARC_COMMITTER_PRIVATE_KEY ? "ARC_COMMITTER_PRIVATE_KEY invalid 0x64hex format" : "ARC_COMMITTER_PRIVATE_KEY missing",
  ].filter(Boolean) as string[];
  const circleChecks = [
    parsed.circleApiKey ? null : "CIRCLE_API_KEY missing",
    parsed.circleEntitySecret ? null : "CIRCLE_ENTITY_SECRET missing",
    parsed.circleWalletAddress ? null : env.CIRCLE_WALLET_ADDRESS ? "CIRCLE_WALLET_ADDRESS invalid 0x40hex format" : "CIRCLE_WALLET_ADDRESS missing",
    parsed.circleTokenAddress ? null : env.CIRCLE_TOKEN_ADDRESS ? "CIRCLE_TOKEN_ADDRESS invalid 0x40hex format" : "CIRCLE_TOKEN_ADDRESS missing",
    parsed.circleRecipientAddress || parsed.rewardRecipientAddress
      ? null
      : env.CIRCLE_RECIPIENT_ADDRESS || env.REWARD_RECIPIENT_ADDRESS
        ? "recipient address invalid 0x40hex format"
        : "CIRCLE_RECIPIENT_ADDRESS or REWARD_RECIPIENT_ADDRESS missing",
  ].filter(Boolean) as string[];

  return {
    settlementPossible: arcChecks.length === 0 && circleChecks.length === 0,
    providers: {
      arc: { configured: arcChecks.length === 0, reason: arcChecks[0] },
      circle: { configured: circleChecks.length === 0, reason: circleChecks[0] },
    },
  };
}

export function isHexAddress(value: string | undefined): value is `0x${string}` {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function numberFromEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function addressFromEnv(value: string | undefined): `0x${string}` | undefined {
  const trimmed = optional(value);
  return isHexAddress(trimmed) ? trimmed : undefined;
}

function privateKeyFromEnv(value: string | undefined): `0x${string}` | undefined {
  const trimmed = optional(value);
  return trimmed && /^0x[a-fA-F0-9]{64}$/.test(trimmed) ? (trimmed as `0x${string}`) : undefined;
}

function circleBaseUrlForEnv(): string {
  // Circle Developer-Controlled Wallets TEST_API_KEY credentials authenticate
  // against the Wallets API host. Keep this overrideable through
  // CIRCLE_BASE_URL, but default to the SDK/API host for both test and live keys.
  return "https://api.circle.com";
}
