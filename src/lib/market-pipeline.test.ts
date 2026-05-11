import { describe, expect, it } from "vitest";

import {
  generateMarketCardFromSource,
  inferRegionAndLanguage,
  type GenerateCardInput,
} from "./market-pipeline";

const koreanPolicyInput: GenerateCardInput = {
  sourceUrl: "https://example.com/kr/ai-basic-act-update",
  sourceText:
    "정부가 AI 기본법 시행령과 고영향 AI 기준을 6월 말까지 공개하는 방안을 검토하고 있다.",
  categoryHint: "AI Policy",
};

describe("market pipeline", () => {
  it("infers KR/ko for Korean source text", () => {
    expect(inferRegionAndLanguage(koreanPolicyInput.sourceText)).toEqual({
      region: "KR",
      language: "ko",
      timezone: "Asia/Seoul",
    });
  });

  it("generates a deterministic resolution-ready draft market card", () => {
    const first = generateMarketCardFromSource(koreanPolicyInput);
    const second = generateMarketCardFromSource(koreanPolicyInput);

    expect(first).toEqual(second);
    expect(first.id).toMatch(/^generated-/);
    expect(first.status).toBe("DRAFT");
    expect(first.source.region).toBe("KR");
    expect(first.source.language).toBe("ko");
    expect(first.category).toBe("AI Policy");
    expect(first.question).toMatch(/^Will .+ before \w+ \d{1,2}, \d{4}\?$/);
    expect(first.outcomes).toEqual(["Yes", "No"]);
    expect(first.resolution.sources.length).toBeGreaterThanOrEqual(2);
    expect(first.resolution.edgeCases.length).toBeGreaterThanOrEqual(2);
    expect(first.scores.final).toBeGreaterThanOrEqual(50);
    expect(first.agentDecisions.map((decision) => decision.agent)).toEqual([
      "EventExtractor",
      "QuestionGenerator",
      "ResolutionRulesAgent",
      "CriticAgent",
    ]);
    expect(first.trace.traceHash).toMatch(/^0xtrace/);
    expect(first.trace.arcTxHash).toBeUndefined();
  });

  it("produces different generated IDs for meaningfully different source text", () => {
    const koreaCard = generateMarketCardFromSource(koreanPolicyInput);
    const japanCard = generateMarketCardFromSource({
      sourceUrl: "https://example.com/jp/boj-update",
      sourceText: "日銀が国債買い入れ予定を見直す可能性について議論している。",
    });

    expect(japanCard.source.region).toBe("JP");
    expect(japanCard.source.language).toBe("ja");
    expect(japanCard.id).not.toBe(koreaCard.id);
  });
});
