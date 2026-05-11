import { createHash } from "node:crypto";

import type { AgentDecision, MarketCard, Validation } from "./market-card";
import { commitTraceToArcProvider, settleArcUsdcRewards } from "./arc-provider";
import { canonicalJson } from "./canonical-json";
import { settleCircleRewards } from "./circle-provider";
import { getProviderEnv } from "./provider-env";
import { ProviderExecutionError, type ProviderStatus } from "./provider-status";

export interface ReasoningTrace {
  cardId: string;
  question: string;
  source: {
    title: string;
    url: string;
    language: string;
    region: string;
    rawExcerpt: string;
    summaryEn: string;
  };
  resolution: MarketCard["resolution"];
  scores: MarketCard["scores"];
  agentDecisions: AgentDecision[];
  validations: Validation[];
  createdAt: string;
}

export interface ArcTraceReceipt {
  network: "arc-testnet";
  status: ProviderStatus;
  traceHash: string;
  txHash: string;
  committedAt: string;
}

export interface RewardReceipt {
  network: "circle-wallets-sandbox" | "circle-wallets-production" | "arc-usdc-testnet";
  status: ProviderStatus;
  validator: string;
  amountUsdc: number;
  txHash: string;
  settledAt: string;
}

export interface SettledCardResult {
  card: MarketCard;
  reasoningTrace: ReasoningTrace;
  traceReceipt: ArcTraceReceipt;
  rewardReceipts: RewardReceipt[];
}

export function buildReasoningTrace(card: MarketCard): ReasoningTrace {
  return {
    cardId: card.id,
    question: card.question,
    source: {
      title: card.source.title,
      url: card.source.url,
      language: card.source.language,
      region: card.source.region,
      rawExcerpt: card.source.rawExcerpt,
      summaryEn: card.source.summaryEn,
    },
    resolution: card.resolution,
    scores: card.scores,
    agentDecisions: card.agentDecisions,
    validations: card.validations,
    createdAt: card.createdAt,
  };
}

export function hashReasoningTrace(trace: ReasoningTrace): string {
  return `0x${createHash("sha256").update(canonicalJson(trace)).digest("hex")}`;
}

export async function settleValidatedCardWithProviders(card: MarketCard, env = getProviderEnv()): Promise<SettledCardResult> {
  const reasoningTrace = buildReasoningTrace(card);

  if (!env.arcRpcUrl || !env.arcCommitterPrivateKey) {
    throw new ProviderExecutionError("settlement provider unconfigured", "UNCONFIGURED", { provider: "arc" });
  }

  const traceReceipt = await commitTraceToArcProvider(reasoningTrace, env);
  if (!traceReceipt) {
    throw new ProviderExecutionError("Arc trace provider unavailable", "PROVIDER_UNAVAILABLE", { provider: "arc" });
  }

  const rewardReceipts = await settleCircleRewards(card, env) ?? await settleArcUsdcRewards(card, env);
  if (!rewardReceipts) {
    throw new ProviderExecutionError("settlement provider unconfigured", "UNCONFIGURED", { provider: "reward" });
  }
  const settledValidations = card.validations.map((validation) => {
    const receipt = rewardReceipts.find(
      (candidate) => candidate.validator === validation.validator && candidate.amountUsdc === validation.rewardUsdc,
    );

    return receipt ? { ...validation, rewardTxHash: receipt.txHash } : validation;
  });

  return {
    card: {
      ...card,
      validations: settledValidations,
      trace: {
        traceHash: traceReceipt.traceHash,
        arcTxHash: traceReceipt.txHash,
        arcNetwork: traceReceipt.network,
        committedAt: traceReceipt.committedAt,
      },
    },
    reasoningTrace,
    traceReceipt,
    rewardReceipts,
  };
}
