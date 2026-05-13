import { afterEach, describe, expect, it, vi } from "vitest";

import type { AgentRun } from "../../../lib/agent-run-store";
import type { MarketCard } from "../../../lib/market-card";
import type { GenerateCardInput } from "../../../lib/market-pipeline";

describe("/api/generate-card", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock("../../../lib/market-store");
    vi.doUnmock("../../../lib/agent-run-store");
    vi.doUnmock("../../../lib/source-fetcher");
  });

  it("rejects requests without sourceUrl even when sourceText is supplied", async () => {
    const { POST } = await importRouteWithMockedPersistence();

    const response = await POST(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({ sourceText: "政府がAI規制案を検討している。" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "sourceUrl is required" });
  });

  it("generates and stores a deterministic draft card from a URL-only submission", async () => {
    const { GET, POST } = await importRouteWithMockedPersistence({
      sourceText: "业内预计未来几批国产网络游戏版号数量或继续增加。",
      sourceUrl: "https://news.example.cn/gaming-approval",
    });

    const response = await POST(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://news.example.cn/gaming-approval",
          categoryHint: "Gaming / Internet",
        }),
      }),
    );

    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.card.status).toBe("DRAFT");
    expect(body.card.source.region).toBe("CN");
    expect(body.card.category).toBe("Gaming / Internet");
    expect(body.agentRun).toMatchObject({
      cardId: body.card.id,
      status: "SUCCESS",
    });
    expect(body.agentRun.steps.map((step: { nodeName: string }) => step.nodeName)).toEqual([
      "SourceReaderAgent",
      "MarketDraftAgent",
      "CriticAgent",
      "RevisionAgent",
    ]);

    const listResponse = await GET();
    const listBody = await listResponse.json();
    expect(listBody.generatedCards).toEqual(expect.arrayContaining([body.card]));
    expect(listBody.agentRuns[0].id).toBe(body.agentRun.id);
  });

  it("rejects non-2xx source URLs before generation", async () => {
    const { GET, POST } = await importRouteWithMockedPersistence(undefined, new Error("sourceUrl returned non-2xx status 404"));

    const response = await POST(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://news.example.cn/missing",
          sourceText: "业内预计未来几批国产网络游戏版号数量或继续增加。",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/non-2xx/i) });

    const listResponse = await GET();
    const listBody = await listResponse.json();
    expect(listBody.generatedCards).toEqual([]);
    expect(listBody.agentRuns).toEqual([]);
  });

  it("rejects unrelated sourceText even when the sourceUrl is reachable", async () => {
    const fetchSourceExcerpt = vi.fn(async () => ({
      sourceText: "业内预计未来几批国产网络游戏版号数量或继续增加。",
      sourceUrl: "https://news.example.cn/gaming-approval",
    }));
    const { GET, POST } = await importRouteWithMockedPersistence(undefined, undefined, fetchSourceExcerpt);

    const response = await POST(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://news.example.cn/gaming-approval",
          sourceText: "정부가 AI 기본법 시행령과 고영향 AI 기준을 공개하는 방안을 검토하고 있다.",
          categoryHint: "AI Policy",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(fetchSourceExcerpt).toHaveBeenCalledWith("https://news.example.cn/gaming-approval");
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/derived from the fetched source excerpt/i) });

    const listResponse = await GET();
    const listBody = await listResponse.json();
    expect(listBody.generatedCards).toEqual([]);
    expect(listBody.agentRuns).toEqual([]);
  });
});

async function importRouteWithMockedPersistence(
  sourceExcerpt = { sourceText: "业内预计未来几批国产网络游戏版号数量或继续增加。", sourceUrl: "https://news.example.cn/gaming-approval" },
  sourceError?: Error,
  fetchSourceExcerpt = vi.fn(async () => {
    if (sourceError) throw sourceError;
    return sourceExcerpt;
  }),
) {
  const generatedCards: MarketCard[] = [];
  const agentRuns: AgentRun[] = [];

  vi.doMock("../../../lib/source-fetcher", () => ({
    fetchSourceExcerpt,
    assertLocalLanguageSourceText: vi.fn(),
  }));

  vi.doMock("../../../lib/market-store", () => ({
    listGeneratedCardsPersisted: vi.fn(async () => generatedCards),
    upsertGeneratedCardPersisted: vi.fn(async (card: MarketCard) => {
      generatedCards.unshift(card);
      return generatedCards;
    }),
  }));
  vi.doMock("../../../lib/agent-run-store", () => ({
    listAgentRuns: vi.fn(async () => agentRuns),
    createAgentRunForCard: vi.fn(async ({ card, input, provider }: { card: MarketCard; input: GenerateCardInput; provider: string }) => {
      const run: AgentRun = {
        id: `run-${card.id}`,
        cardId: card.id,
        provider,
        status: "SUCCESS",
        input,
        output: { id: card.id, question: card.question, scores: card.scores, status: card.status },
        createdAt: "2026-05-13T00:00:00.000Z",
        completedAt: "2026-05-13T00:00:01.000Z",
        steps: ["SourceReaderAgent", "MarketDraftAgent", "CriticAgent", "RevisionAgent"].map((nodeName, index) => ({
          id: `step-${card.id}-${index}`,
          runId: `run-${card.id}`,
          sequence: index + 1,
          nodeName,
          status: "SUCCESS",
          input: {},
          output: {},
          confidence: 0.8,
          rationale: "test step",
          toolCalls: [],
          startedAt: "2026-05-13T00:00:00.000Z",
          completedAt: "2026-05-13T00:00:01.000Z",
        })),
      };
      agentRuns.unshift(run);
      return run;
    }),
  }));

  return import("./route");
}
