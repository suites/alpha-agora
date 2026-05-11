import { createHash } from "node:crypto";

import type { AgentDecision, MarketCard, Validation } from "./market-card";

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
  network: "arc-testnet-mock";
  traceHash: string;
  txHash: string;
  committedAt: string;
}

export interface RewardReceipt {
  network: "circle-usdc-testnet-mock";
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

const SETTLED_AT = "2026-05-11T06:00:00.000Z";

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
  return `0x${createHash("sha256").update(JSON.stringify(trace)).digest("hex")}`;
}

export function commitTraceToArc(trace: ReasoningTrace): ArcTraceReceipt {
  const traceHash = hashReasoningTrace(trace);
  return {
    network: "arc-testnet-mock",
    traceHash,
    txHash: `0xarc${sha256Hex(`arc:${traceHash}`).slice(0, 60)}`,
    committedAt: SETTLED_AT,
  };
}

export function settleValidatorRewards(card: MarketCard): RewardReceipt[] {
  return card.validations
    .filter((validation) => validation.rewardUsdc > 0 && !validation.rewardTxHash)
    .map((validation) => ({
      network: "circle-usdc-testnet-mock" as const,
      validator: validation.validator,
      amountUsdc: validation.rewardUsdc,
      txHash: `0xusdc${sha256Hex(`usdc:${card.id}:${validation.validator}:${validation.rewardUsdc}`).slice(0, 59)}`,
      settledAt: SETTLED_AT,
    }));
}

export function settleValidatedCard(card: MarketCard): SettledCardResult {
  const reasoningTrace = buildReasoningTrace(card);
  const traceReceipt = commitTraceToArc(reasoningTrace);
  const rewardReceipts = settleValidatorRewards(card);
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
        committedAt: traceReceipt.committedAt,
      },
    },
    reasoningTrace,
    traceReceipt,
    rewardReceipts,
  };
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
