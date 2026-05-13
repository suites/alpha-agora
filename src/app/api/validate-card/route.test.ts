import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/source-fetcher", () => ({
  fetchSourceExcerpt: vi.fn(async () => ({
    sourceUrl: "https://example.com/jp/ev-subsidy",
    sourceText: "政府が電気自動車向け補助金制度の延長を検討している。",
  })),
  assertLocalLanguageSourceText: vi.fn(),
}));

import { GET, POST } from "./route";
import { POST as generateCard } from "../generate-card/route";
import { findCardPersisted, updateCardPersisted } from "../../../lib/market-store";

describe("/api/validate-card", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(
        "정부가 AI 기본법 시행령과 고영향 AI 기준을 공개하는 방안을 검토하고 있다.",
        { status: 200, headers: { "content-type": "text/plain" } },
      )),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns 404 for an unknown card", async () => {
    const response = await POST(
      new Request("http://localhost/api/validate-card", {
        method: "POST",
        body: JSON.stringify({
          cardId: "missing-card",
          validator: "Validator",
          verdict: "APPROVE",
          comment: "Looks clear.",
        }),
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: "card not found" });
  });

  it("returns live dashboard metrics with the validator board", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.dashboardMetrics.generated).toBe(body.cards.length);
    expect(body.dashboardMetrics.validated).toBeGreaterThanOrEqual(body.metrics.approved);
    expect(body.dashboardMetrics.rewardsPaidUsdc).toBeGreaterThanOrEqual(0);
  });

  it("validates a generated card and returns updated board metrics", async () => {
    const generatedResponse = await generateCard(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://example.com/jp/ev-subsidy",
          categoryHint: "EV Policy",
        }),
      }),
    );
    const generatedBody = await generatedResponse.json();

    const response = await POST(
      new Request("http://localhost/api/validate-card", {
        method: "POST",
        body: JSON.stringify({
          cardId: generatedBody.card.id,
          validator: "TokyoValidator",
          verdict: "APPROVE",
          comment: "Official source and deadline are clear enough.",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.card.status).toBe("APPROVED");
    expect(body.card.validations.at(-1)).toMatchObject({
      validator: "TokyoValidator",
      verdict: "APPROVE",
    });
    expect(body.metrics.approved).toBeGreaterThanOrEqual(1);
    expect(body.metrics.rewardsQueuedUsdc).toBeGreaterThanOrEqual(0.05);
  });

  it("locks a card after trace and reward settlement so it cannot receive contradictory verdicts", async () => {
    const generatedResponse = await generateCard(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://example.com/kr/night-bus",
          categoryHint: "Transportation",
        }),
      }),
    );
    const generatedBody = await generatedResponse.json();

    await POST(
      new Request("http://localhost/api/validate-card", {
        method: "POST",
        body: JSON.stringify({
          cardId: generatedBody.card.id,
          validator: "SeoulValidator",
          verdict: "APPROVE",
          comment: "Official source and deadline are clear enough.",
        }),
      }),
    );
    const approvedCard = await findCardPersisted(generatedBody.card.id);
    if (!approvedCard) throw new Error("approved card missing");
    await updateCardPersisted({
      ...approvedCard,
      trace: {
        traceHash: "sample-trace-lock-test",
        arcTxHash: "sample-arc-proof-lock-test",
        committedAt: "2026-05-11T04:00:00.000Z",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/validate-card", {
        method: "POST",
        body: JSON.stringify({
          cardId: generatedBody.card.id,
          validator: "SeoulValidator",
          verdict: "NEEDS_EDIT",
          comment: "Change it after settlement.",
          editedQuestion: "Will this already-settled card change?",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: "card already settled",
    });
  });

  it("rejects contradictory verdicts after a draft receives an approval", async () => {
    const generatedResponse = await generateCard(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://example.com/kr/stablecoin-guidance",
          categoryHint: "Crypto Policy",
        }),
      }),
    );
    const generatedBody = await generatedResponse.json();

    const approveResponse = await POST(
      new Request("http://localhost/api/validate-card", {
        method: "POST",
        body: JSON.stringify({
          cardId: generatedBody.card.id,
          validator: "SeoulValidator",
          verdict: "APPROVE",
          comment: "Official source and deadline are clear enough.",
        }),
      }),
    );
    expect(approveResponse.status).toBe(200);

    const editResponse = await POST(
      new Request("http://localhost/api/validate-card", {
        method: "POST",
        body: JSON.stringify({
          cardId: generatedBody.card.id,
          validator: "SeoulValidator",
          verdict: "NEEDS_EDIT",
          comment: "Need stronger official-source wording before settlement.",
        }),
      }),
    );

    expect(editResponse.status).toBe(409);
    await expect(editResponse.json()).resolves.toMatchObject({
      error: "card validation already finalized",
    });
  });

  it("requires edit-specific rationale for NEEDS_EDIT verdicts", async () => {
    const generatedResponse = await generateCard(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://example.com/kr/platform-rule",
          categoryHint: "Platform Policy",
        }),
      }),
    );
    const generatedBody = await generatedResponse.json();

    const response = await POST(
      new Request("http://localhost/api/validate-card", {
        method: "POST",
        body: JSON.stringify({
          cardId: generatedBody.card.id,
          validator: "SeoulValidator",
          verdict: "NEEDS_EDIT",
          comment: "Official source and deadline are clear enough for validator approval.",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: "edit verdict requires edit-specific rationale",
    });
  });
});
