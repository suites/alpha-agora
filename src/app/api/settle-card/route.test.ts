import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/source-fetcher", () => ({
  fetchSourceExcerpt: vi.fn(async () => ({
    sourceUrl: "https://example.com/cn/chip-response",
    sourceText: "政府が半導体輸出管理への対応策を正式発表する可能性がある。",
  })),
  assertLocalLanguageSourceText: vi.fn(),
}));

import { POST as generateCard } from "../generate-card/route";
import { POST as validateCard } from "../validate-card/route";
import { GET as settlementPreflight, POST as settleCard } from "./route";

describe("/api/settle-card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes non-secret provider preflight before settlement", async () => {
    const response = await settlementPreflight();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      settlementPossible: expect.any(Boolean),
      providers: {
        arc: { configured: expect.any(Boolean) },
        circle: { configured: expect.any(Boolean) },
      },
    });
    expect(JSON.stringify(body)).not.toContain(process.env.CIRCLE_API_KEY ?? "__missing_circle_key__");
    expect(JSON.stringify(body)).not.toContain(process.env.CIRCLE_ENTITY_SECRET ?? "__missing_circle_secret__");
    expect(JSON.stringify(body)).not.toContain(process.env.ARC_COMMITTER_PRIVATE_KEY ?? "__missing_arc_key__");
  });

  it("rejects settlement for unknown cards", async () => {
    const response = await settleCard(
      new Request("http://localhost/api/settle-card", {
        method: "POST",
        body: JSON.stringify({ cardId: "missing-card" }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "card not found" });
  });

  it("returns UNCONFIGURED instead of fake settlement when live providers are missing", async () => {
    const generatedResponse = await generateCard(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceText: "政府が半導体輸出管理への対応策を正式発表する可能性がある。",
          sourceUrl: "https://example.com/cn/chip-response",
          categoryHint: "Semiconductors",
        }),
      }),
    );
    const generatedBody = await generatedResponse.json();

    await validateCard(
      new Request("http://localhost/api/validate-card", {
        method: "POST",
        body: JSON.stringify({
          cardId: generatedBody.card.id,
          validator: "SettlementValidator",
          verdict: "APPROVE",
          comment: "Approved for Arc and USDC settlement.",
        }),
      }),
    );

    const originalArcRpcUrl = process.env.ARC_RPC_URL;
    const originalArcCommitterPrivateKey = process.env.ARC_COMMITTER_PRIVATE_KEY;
    delete process.env.ARC_RPC_URL;
    delete process.env.ARC_COMMITTER_PRIVATE_KEY;

    const response = await settleCard(
      new Request("http://localhost/api/settle-card", {
        method: "POST",
        body: JSON.stringify({ cardId: generatedBody.card.id }),
      }),
    );

    process.env.ARC_RPC_URL = originalArcRpcUrl;
    process.env.ARC_COMMITTER_PRIVATE_KEY = originalArcCommitterPrivateKey;

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "settlement provider unconfigured",
      providerStatus: "UNCONFIGURED",
    });
  });
});
