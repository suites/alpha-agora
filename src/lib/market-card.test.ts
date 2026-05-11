import { describe, expect, it } from "vitest";

import {
  computeFinalScore,
  getDashboardMetrics,
  getFeaturedMarketCard,
  marketCards,
} from "./market-card";

describe("computeFinalScore", () => {
  it("weights clarity, interest, asymmetry, novelty, credibility and subtracts ambiguity risk", () => {
    expect(
      computeFinalScore({
        resolutionClarity: 91,
        tradingInterest: 68,
        informationAsymmetry: 77,
        novelty: 72,
        sourceCredibility: 78,
        ambiguityRisk: 21,
      }),
    ).toBe(74);
  });

  it("clamps final score to a 0-100 range", () => {
    expect(
      computeFinalScore({
        resolutionClarity: 100,
        tradingInterest: 100,
        informationAsymmetry: 100,
        novelty: 100,
        sourceCredibility: 100,
        ambiguityRisk: 0,
      }),
    ).toBe(100);

    expect(
      computeFinalScore({
        resolutionClarity: 0,
        tradingInterest: 0,
        informationAsymmetry: 0,
        novelty: 0,
        sourceCredibility: 0,
        ambiguityRisk: 100,
      }),
    ).toBe(0);
  });
});

describe("marketCards seed data", () => {
  it("contains at least 20 realistic KR/JP/CN seed market cards", () => {
    expect(marketCards.length).toBeGreaterThanOrEqual(20);
    expect(new Set(marketCards.map((card) => card.source.region))).toEqual(
      new Set(["KR", "JP", "CN"]),
    );
  });

  it("keeps every seed card resolution-ready", () => {
    for (const card of marketCards) {
      expect(card.question).toMatch(/^Will /);
      expect(card.outcomes).toEqual(["Yes", "No"]);
      expect(card.resolution.sources.length).toBeGreaterThan(0);
      expect(card.resolution.edgeCases.length).toBeGreaterThan(0);
      expect(card.scores.final).toBe(
        computeFinalScore({
          resolutionClarity: card.scores.resolutionClarity,
          tradingInterest: card.scores.tradingInterest,
          informationAsymmetry: card.scores.informationAsymmetry,
          novelty: card.scores.novelty,
          sourceCredibility: card.scores.sourceCredibility,
          ambiguityRisk: card.scores.ambiguityRisk,
        }),
      );
    }
  });
});

describe("dashboard helpers", () => {
  it("summarizes traction metrics from seed cards", () => {
    const metrics = getDashboardMetrics(marketCards);

    expect(metrics.generated).toBe(marketCards.length);
    expect(metrics.validated).toBeGreaterThan(0);
    expect(metrics.rewardsPaidUsdc).toBeGreaterThan(0);
    expect(metrics.arcTracesCommitted).toBeGreaterThan(0);
  });

  it("selects the highest final score card as featured", () => {
    const featured = getFeaturedMarketCard(marketCards);
    const maxFinal = Math.max(...marketCards.map((card) => card.scores.final));

    expect(featured.scores.final).toBe(maxFinal);
  });
});
