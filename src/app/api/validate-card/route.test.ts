import { describe, expect, it } from "vitest";

import { POST } from "./route";
import { POST as generateCard } from "../generate-card/route";

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
});
