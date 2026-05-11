import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { realisticUserGenerationFixtures } from "../test/realistic-user-fixtures";
import { generateMarketCard } from "./provider-integrations";

const MAX_AVERAGE_GENERATION_MS = 125;
const MAX_SINGLE_GENERATION_MS = 300;

describe("realistic user fixture performance", () => {
  beforeEach(() => {
    vi.stubEnv("LLM_PROVIDER", "demo");
    vi.stubEnv("GEMINI_API_KEY", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("generates resolution-ready cards across realistic KR/JP/CN user inputs within the demo latency budget", async () => {
    const results = [];

    for (const fixture of realisticUserGenerationFixtures) {
      const startedAt = performance.now();
      const card = await generateMarketCard(fixture.input);
      const durationMs = performance.now() - startedAt;
      results.push({ fixture, card, durationMs });
    }

    expect(results).toHaveLength(realisticUserGenerationFixtures.length);
    expect(new Set(results.map(({ card }) => card.id)).size).toBe(results.length);

    for (const { fixture, card, durationMs } of results) {
      expect(durationMs, `${fixture.id} exceeded per-card demo latency budget`).toBeLessThan(MAX_SINGLE_GENERATION_MS);
      expect(card.source.region).toBe(fixture.expected.region);
      expect(card.source.language).toBe(fixture.expected.language);
      expect(card.category).toBe(fixture.expected.category);
      expect(card.question).toMatch(/^Will .+ before .+\?$/);
      expect(card.resolution.sources.length).toBeGreaterThanOrEqual(2);
      expect(card.resolution.edgeCases.length).toBeGreaterThanOrEqual(3);
      expect(card.scores.final).toBeGreaterThanOrEqual(fixture.expected.minFinalScore);
      expect(card.trace.traceHash).toMatch(/^pending-trace-/);
      expect(card.agentDecisions.map((decision) => decision.agent)).toEqual([
        "SourceReaderAgent",
        "MarketDraftAgent",
        "CriticAgent",
        "RevisionAgent",
      ]);
    }

    const averageMs = results.reduce((sum, result) => sum + result.durationMs, 0) / results.length;
    expect(averageMs).toBeLessThan(MAX_AVERAGE_GENERATION_MS);
  });

  it("normalizes messy pasted source text so duplicate whitespace does not change market semantics", async () => {
    const fixture = realisticUserGenerationFixtures.find((candidate) => candidate.id === "kr-ai-policy-messy-paste");
    expect(fixture).toBeDefined();

    const compactCard = await generateMarketCard({
      ...fixture!.input,
      sourceText: fixture!.input.sourceText.replace(/\s+/g, " ").trim(),
    });
    const messyCard = await generateMarketCard(fixture!.input);

    expect(messyCard.id).toBe(compactCard.id);
    expect(messyCard.question).toBe(compactCard.question);
    expect(messyCard.source.rawExcerpt).toBe(compactCard.source.rawExcerpt);
  });
});
