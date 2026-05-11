import { describe, expect, it } from "vitest";

import { marketCards } from "./market-card";
import { applyValidationAction } from "./validation-workflow";
import { buildReasoningTrace, hashReasoningTrace, settleValidatedCardWithProviders } from "./settlement-adapters";
import type { ProviderEnv } from "./provider-env";

const draftCard = marketCards.find((card) => card.status === "VALIDATING") ?? marketCards[0];
const approvedCard = applyValidationAction({
  card: draftCard,
  validator: "SettlementValidator",
  verdict: "APPROVE",
  comment: "Ready for trace commit and USDC reward settlement.",
});

const unconfiguredEnv: ProviderEnv = {
  mode: "demo",
  llmProvider: "demo",
  geminiModel: "gemini-2.5-flash",
  arcChainId: 5042002,
  circleEnv: "sandbox",
  circleBaseUrl: "https://api.circle.com",
  circleBlockchain: "ARC-TESTNET",
  allowMainnetTransfers: false,
  maxRewardUsdc: 1,
};

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

  it("refuses to settle without real providers instead of returning fake receipts", async () => {
    await expect(settleValidatedCardWithProviders(approvedCard, unconfiguredEnv)).rejects.toMatchObject({
      providerStatus: "UNCONFIGURED",
      provider: "arc",
    });
  });
});
