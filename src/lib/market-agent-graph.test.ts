import { describe, expect, it } from "vitest";

import { runMarketCreationGraph } from "./market-agent-graph";

describe("market creation LangGraph", () => {
  it("orchestrates source reader, draft, and critic nodes with LangGraph", async () => {
    const result = await runMarketCreationGraph({
      sourceUrl: "https://example.com/kr/ai-act",
      sourceText: "정부가 AI 기본법 시행령과 고영향 AI 기준을 6월 말까지 공개하는 방안을 검토하고 있다.",
      categoryHint: "AI Policy",
    });

    expect(result.runMode).toBe("langgraph");
    expect(result.nodeNames).toEqual(expect.arrayContaining(["SourceReaderAgent", "MarketDraftAgent", "CriticAgent"]));
    expect(result.card.category).toBe("AI Policy");
    expect(result.card.agentDecisions.map((decision) => decision.agent)).toContain("CriticAgent");
  });
});
