import { afterEach, describe, expect, it, vi } from "vitest";

import type { MarketCard } from "../../../lib/market-card";

const draftCard: MarketCard = {
  id: "generated-db-failure",
  source: {
    id: "src-db-failure",
    title: "Korea AI policy guidance",
    url: "https://example.com/kr/ai-policy",
    language: "ko",
    region: "KR",
    rawExcerpt: "정부가 AI 기본법 시행령과 고영향 AI 기준을 공개하는 방안을 검토하고 있다.",
    summaryEn: "Korea may publish AI Basic Act enforcement criteria.",
    publishedAt: "2026-05-12",
    sourceName: "Korean government briefing",
  },
  category: "AI Policy",
  question: "Will South Korea publish high-impact AI criteria before June 30, 2026?",
  outcomes: ["Yes", "No"],
  resolution: {
    endDate: "2026-06-30",
    timezone: "Asia/Seoul",
    sources: ["Ministry of Science and ICT"],
    edgeCases: ["Unofficial drafts do not count"],
  },
  scores: {
    resolutionClarity: 88,
    tradingInterest: 62,
    informationAsymmetry: 74,
    novelty: 80,
    sourceCredibility: 84,
    ambiguityRisk: 18,
    final: 75,
  },
  criticNotes: ["Use an official publication source for resolution."],
  agentDecisions: [
    {
      agent: "RevisionAgent",
      decision: "ACCEPT",
      rationale: "Question is bounded by date and official source.",
      confidence: 0.86,
    },
  ],
  validations: [],
  trace: { traceHash: "test-trace-db-failure" },
  status: "DRAFT",
  createdAt: "2026-05-12T00:00:00.000Z",
};

describe("/api/generate-card persistence failures", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock("../../../lib/provider-integrations");
    vi.doUnmock("../../../lib/market-store");
    vi.doUnmock("../../../lib/agent-run-store");
    vi.doUnmock("../../../lib/source-fetcher");
  });

  it("returns a JSON error when card persistence fails after generation", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.doMock("../../../lib/source-fetcher", () => ({
      fetchSourceExcerpt: vi.fn(async () => ({
        sourceUrl: "https://example.com/kr/ai-policy",
        sourceText: "정부가 AI 기본법 시행령과 고영향 AI 기준을 공개하는 방안을 검토하고 있다.",
      })),
      assertLocalLanguageSourceText: vi.fn(),
    }));

    vi.doMock("../../../lib/provider-integrations", () => ({
      generateMarketCard: vi.fn(async () => draftCard),
    }));
    vi.doMock("../../../lib/market-store", () => ({
      listGeneratedCardsPersisted: vi.fn(async () => []),
      upsertGeneratedCardPersisted: vi.fn(async () => {
        throw new Error("relation market_cards does not exist");
      }),
    }));
    vi.doMock("../../../lib/agent-run-store", () => ({
      listAgentRuns: vi.fn(async () => []),
      createAgentRunForCard: vi.fn(async () => {
        throw new Error("should not create an agent run when card persistence fails");
      }),
    }));

    const { POST } = await import("./route");

    const response = await POST(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://example.com/kr/ai-policy",
          sourceText: "정부가 AI 기본법 시행령과 고영향 AI 기준을 공개하는 방안을 검토하고 있다.",
          categoryHint: "AI Policy",
        }),
      }),
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      error: "Failed to persist generated card",
    });
  });
});
