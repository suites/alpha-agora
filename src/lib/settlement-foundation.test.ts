import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical-json";
import { marketCards } from "./market-card";
import { applyValidationAction } from "./validation-workflow";
import {
  buildReasoningTrace,
  hashReasoningTrace,
  settleValidatedCardWithProviders,
} from "./settlement-adapters";
import type { ProviderEnv } from "./provider-env";

const draftCard = marketCards.find((card) => card.status === "VALIDATING") ?? marketCards[0];
const approvedCard = applyValidationAction({
  card: draftCard,
  validator: "StageOneValidator",
  verdict: "APPROVE",
  comment: "Ready for provider-backed settlement.",
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

describe("canonical settlement foundation", () => {
  it("serializes object keys canonically while preserving array order", () => {
    const first = { b: 2, a: { d: 4, c: 3 }, list: [{ z: 1, y: 2 }, "tail"] };
    const second = { list: [{ y: 2, z: 1 }, "tail"], a: { c: 3, d: 4 }, b: 2 };

    expect(canonicalJson(first)).toBe(canonicalJson(second));
    expect(canonicalJson(first)).toBe('{"a":{"c":3,"d":4},"b":2,"list":[{"y":2,"z":1},"tail"]}');
  });

  it("hashes reasoning traces from canonical JSON", () => {
    const trace = buildReasoningTrace(approvedCard);
    const reorderedTrace = {
      validations: trace.validations,
      createdAt: trace.createdAt,
      scores: trace.scores,
      source: trace.source,
      agentDecisions: trace.agentDecisions,
      resolution: trace.resolution,
      question: trace.question,
      cardId: trace.cardId,
    };

    expect(hashReasoningTrace(trace)).toBe(hashReasoningTrace(reorderedTrace));
  });

  it("returns UNCONFIGURED instead of fake settlement when no live provider is configured", async () => {
    await expect(settleValidatedCardWithProviders(approvedCard, unconfiguredEnv)).rejects.toMatchObject({
      providerStatus: "UNCONFIGURED",
    });
  });
});
