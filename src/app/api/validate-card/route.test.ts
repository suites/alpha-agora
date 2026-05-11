import { describe, expect, it } from "vitest";

import { GET, POST } from "./route";
import { POST as generateCard } from "../generate-card/route";
import { POST as settleCard } from "../settle-card/route";

describe("/api/validate-card", () => {
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
          sourceText: "政府が電気自動車向け補助金制度の延長を検討している。",
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
          sourceText: "서울시가 심야 자율주행버스 확대 여부를 공식 위원회 안건으로 상정할 예정이다.",
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
    await settleCard(
      new Request("http://localhost/api/settle-card", {
        method: "POST",
        body: JSON.stringify({ cardId: generatedBody.card.id }),
      }),
    );

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
});
