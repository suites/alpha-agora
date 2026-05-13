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
    expect(first.trace.traceHash).toMatch(/^pending-trace-/);
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

  it("classifies semiconductor stock articles before incidental AI text", () => {
    const card = generateMarketCardFromSource({
      sourceUrl: "https://v.daum.net/v/20260513142501045",
      sourceText:
        "SK하이닉스와 삼성전자가 장 초반 약세를 딛고 나란히 반등에 성공했다. 메모리 업황 개선 기대감이 주가 하단을 떠받치는 모양새다. 관련 추천뉴스에는 AI DC 문구가 있을 수 있다.",
    });

    expect(card.category).toBe("Semiconductors");
    expect(card.question).toContain("SK Hynix and Samsung Electronics");
    expect(card.question).not.toContain("AI policy");
  });

  it("keeps generic semiconductor sources from becoming SK Hynix/Samsung-specific", () => {
    const card = generateMarketCardFromSource({
      sourceUrl: "https://example.com/jp/chip-demand",
      sourceText: "日本の半導体装置メーカーが需要回復を受けて生産計画を見直す可能性がある。",
    });

    expect(card.category).toBe("Semiconductors");
    expect(card.question).toContain("semiconductor market event");
    expect(card.question).not.toContain("SK Hynix");
  });
});
