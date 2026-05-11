import { createHash } from "node:crypto";

import { canonicalJson } from "./canonical-json";
import type { ArcTraceReceipt, ReasoningTrace, RewardReceipt } from "./settlement-adapters";
import type { MarketCard } from "./market-card";
import { getProviderEnv, shouldUseArc, type ProviderEnv } from "./provider-env";

interface ViemModule {
  createPublicClient: (options: unknown) => PublicClient;
  createWalletClient: (options: unknown) => WalletClient;
  defineChain: (options: unknown) => unknown;
  http: (url: string) => unknown;
  parseUnits: (value: string, decimals: number) => bigint;
  stringToHex: (value: string) => `0x${string}`;
}

interface AccountsModule {
  privateKeyToAccount: (privateKey: `0x${string}`) => { address: `0x${string}` };
}

interface PublicClient {
  waitForTransactionReceipt: (options: { hash: `0x${string}` }) => Promise<unknown>;
}

interface WalletClient {
  sendTransaction: (options: {
    account: { address: `0x${string}` };
    to: `0x${string}`;
    data?: `0x${string}`;
    value?: bigint;
  }) => Promise<`0x${string}`>;
  writeContract: (options: {
    account: { address: `0x${string}` };
    address: `0x${string}`;
    abi: unknown;
    functionName: string;
    args: unknown[];
  }) => Promise<`0x${string}`>;
}

const erc20TransferAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export async function commitTraceToArcProvider(
  trace: ReasoningTrace,
  env: ProviderEnv = getProviderEnv(),
): Promise<ArcTraceReceipt | undefined> {
  if (!shouldUseArc(env) || !env.arcRpcUrl || !env.arcCommitterPrivateKey) return undefined;

  const { createClients, stringToHex } = await getArcClients(env);
  const { account, publicClient, walletClient } = createClients();
  const traceHash = hashReasoningTrace(trace);
  const txHash = await walletClient.sendTransaction({
    account,
    to: account.address,
    data: stringToHex(JSON.stringify({ kind: "alpha-agora-trace", cardId: trace.cardId, traceHash })),
    value: BigInt(0),
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });

  return {
    network: "arc-testnet",
    status: "SUCCESS",
    traceHash,
    txHash,
    committedAt: new Date().toISOString(),
  };
}

export async function settleArcUsdcRewards(
  card: MarketCard,
  env: ProviderEnv = getProviderEnv(),
): Promise<RewardReceipt[] | undefined> {
  if (!shouldUseArc(env) || !env.arcRpcUrl || !env.arcCommitterPrivateKey) return undefined;
  if (!env.arcUsdcAddress || !env.rewardRecipientAddress) return undefined;

  const { createClients, parseUnits } = await getArcClients(env);
  const { account, publicClient, walletClient } = createClients();
  const receipts: RewardReceipt[] = [];

  for (const validation of card.validations) {
    if (validation.rewardUsdc <= 0 || validation.rewardTxHash) continue;
    assertRewardIsAllowed(validation.rewardUsdc, env);

    const txHash = await walletClient.writeContract({
      account,
      address: env.arcUsdcAddress,
      abi: erc20TransferAbi,
      functionName: "transfer",
      args: [env.rewardRecipientAddress, parseUnits(validation.rewardUsdc.toString(), 6)],
    });
    await publicClient.waitForTransactionReceipt({ hash: txHash });
    receipts.push({
      network: "arc-usdc-testnet",
      status: "SUCCESS",
      validator: validation.validator,
      amountUsdc: validation.rewardUsdc,
      txHash,
      settledAt: new Date().toISOString(),
    });
  }

  return receipts;
}

async function getArcClients(env: ProviderEnv): Promise<{
  createClients: () => { account: { address: `0x${string}` }; publicClient: PublicClient; walletClient: WalletClient };
  parseUnits: ViemModule["parseUnits"];
  stringToHex: ViemModule["stringToHex"];
}> {
  const [{ createPublicClient, createWalletClient, defineChain, http, parseUnits, stringToHex }, { privateKeyToAccount }] =
    await Promise.all([importViem(), importAccounts()]);
  const chain = defineChain({
    id: env.arcChainId,
    name: "Arc Testnet",
    nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
    rpcUrls: { default: { http: [env.arcRpcUrl] } },
    blockExplorers: env.arcExplorerUrl ? { default: { name: "Arcscan", url: env.arcExplorerUrl } } : undefined,
  });

  return {
    parseUnits,
    stringToHex,
    createClients: () => {
      if (!env.arcCommitterPrivateKey || !env.arcRpcUrl) {
        throw new Error("Arc private key is not configured");
      }

      const account = privateKeyToAccount(env.arcCommitterPrivateKey);
      return {
        account,
        publicClient: createPublicClient({ chain, transport: http(env.arcRpcUrl) }),
        walletClient: createWalletClient({ account, chain, transport: http(env.arcRpcUrl) }),
      };
    },
  };
}

function assertRewardIsAllowed(amountUsdc: number, env: ProviderEnv): void {
  if (amountUsdc > env.maxRewardUsdc) {
    throw new Error(`Reward ${amountUsdc} USDC exceeds MAX_REWARD_USDC=${env.maxRewardUsdc}`);
  }
}

async function importViem(): Promise<ViemModule> {
  return import("viem") as unknown as Promise<ViemModule>;
}

async function importAccounts(): Promise<AccountsModule> {
  return import("viem/accounts") as unknown as Promise<AccountsModule>;
}

function hashReasoningTrace(trace: ReasoningTrace): string {
  return `0x${createHash("sha256").update(canonicalJson(trace)).digest("hex")}`;
}
