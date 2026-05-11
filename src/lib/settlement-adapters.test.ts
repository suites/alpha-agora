import { describe, expect, it } from "vitest";

import { marketCards } from "./market-card";
import { applyValidationAction } from "./validation-workflow";
import {
  buildReasoningTrace,
  commitTraceToArc,
  hashReasoningTrace,
  settleValidatorRewards,
  settleValidatedCard,
} from "./settlement-adapters";

const draftCard = marketCards.find((card) => card.status === "VALIDATING") ?? marketCards[0];
const approvedCard = applyValidationAction({
  card: draftCard,
  validator: "SettlementValidator",
  verdict: "APPROVE",
  comment: "Ready for trace commit and USDC reward settlement.",
});

describe("settlement adapters", () => {
  it("builds deterministic reasoning trace JSON for Arc", () => {
    const firstTrace = buildReasoningTrace(approvedCard);
    const secondTrace = buildReasoningTrace(approvedCard);

    expect(firstTrace).toEqual(secondTrace);
    expect(firstTrace.cardId).toBe(approvedCard.id);
    expect(firstTrace.agentDecisions.length).toBeGreaterThanOrEqual(2);
    expect(firstTrace.validations.at(-1)).toMatchObject({
      validator: "SettlementValidator",
      verdict: "APPROVE",
    });
  });

  it("hashes reasoning trace as a SHA-256 hex string", () => {
    const hash = hashReasoningTrace(buildReasoningTrace(approvedCard));

    expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(hash).toBe(hashReasoningTrace(buildReasoningTrace(approvedCard)));
  });

  it("commits trace through mock Arc adapter", () => {
    const trace = buildReasoningTrace(approvedCard);
    const receipt = commitTraceToArc(trace);

    expect(receipt.network).toBe("arc-testnet-mock");
    expect(receipt.traceHash).toBe(hashReasoningTrace(trace));
    expect(receipt.txHash).toMatch(/^0xarc[a-f0-9]{60}$/);
  });

  it("settles queued validator rewards through mock USDC adapter", () => {
    const receipts = settleValidatorRewards(approvedCard);

    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({
      validator: "SettlementValidator",
      amountUsdc: 0.05,
      network: "circle-usdc-testnet-mock",
    });
    expect(receipts[0].txHash).toMatch(/^0xusdc[a-f0-9]{59}$/);
  });

  it("returns a card with Arc trace and reward tx hashes attached", () => {
    const result = settleValidatedCard(approvedCard);

    expect(result.traceReceipt.txHash).toBe(result.card.trace.arcTxHash);
    expect(result.card.trace.traceHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(result.card.validations.at(-1)?.rewardTxHash).toMatch(/^0xusdc[a-f0-9]{59}$/);
  });
});
