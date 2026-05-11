import type { AgentDecision, MarketCard, MarketCardStatus, Validation, ValidationVerdict } from "./market-card";

export interface ValidationActionInput {
  card: MarketCard;
  validator: string;
  verdict: ValidationVerdict;
  comment: string;
  editedQuestion?: string;
}

export interface ValidatorMetrics {
  approved: number;
  rejected: number;
  needsEdit: number;
  pending: number;
  rewardsQueuedUsdc: number;
}

const VALIDATED_AT = "2026-05-11T05:00:00.000Z";

export function applyValidationAction(input: ValidationActionInput): MarketCard {
  const trimmedQuestion = input.editedQuestion?.trim();
  const status = statusForVerdict(input.verdict);
  const rewardUsdc = rewardForVerdict(input.verdict);
  const validation: Validation = {
    validator: input.validator.trim() || "AnonymousValidator",
    verdict: input.verdict,
    comment: input.comment.trim(),
    rewardUsdc,
  };
  const validatorDecision: AgentDecision = {
    agent: "HumanValidator",
    decision: input.verdict,
    rationale: validation.comment,
    confidence: input.verdict === "APPROVE" ? 0.95 : input.verdict === "REJECT" ? 0.9 : 0.72,
  };

  return {
    ...input.card,
    question: trimmedQuestion || input.card.question,
    status,
    validations: [...input.card.validations, validation],
    agentDecisions: [...input.card.agentDecisions, validatorDecision],
    trace: {
      ...input.card.trace,
      committedAt: input.card.trace.committedAt ?? VALIDATED_AT,
    },
  };
}

export function getValidatorMetrics(cards: MarketCard[]): ValidatorMetrics {
  const metrics = cards.reduce(
    (acc, card) => {
      if (card.status === "APPROVED") acc.approved += 1;
      if (card.status === "REJECTED") acc.rejected += 1;
      if (card.validations.at(-1)?.verdict === "NEEDS_EDIT") acc.needsEdit += 1;
      if (card.status === "DRAFT" || card.status === "VALIDATING") acc.pending += 1;
      acc.rewardsQueuedUsdc += card.validations.reduce(
        (sum, validation) => sum + (validation.rewardTxHash ? 0 : validation.rewardUsdc),
        0,
      );
      return acc;
    },
    { approved: 0, rejected: 0, needsEdit: 0, pending: 0, rewardsQueuedUsdc: 0 },
  );

  return {
    ...metrics,
    rewardsQueuedUsdc: Number(metrics.rewardsQueuedUsdc.toFixed(2)),
  };
}

function statusForVerdict(verdict: ValidationVerdict): MarketCardStatus {
  if (verdict === "APPROVE") return "APPROVED";
  if (verdict === "REJECT") return "REJECTED";
  return "VALIDATING";
}

function rewardForVerdict(verdict: ValidationVerdict): number {
  if (verdict === "APPROVE") return 0.05;
  if (verdict === "NEEDS_EDIT") return 0.01;
  return 0;
}
