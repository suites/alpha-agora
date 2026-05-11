import { beforeEach, describe, expect, it } from "vitest";

import { resetAgentRunStoreForTests } from "../../../lib/agent-run-store";
import { GET, POST } from "./route";

describe("/api/generate-card", () => {
  beforeEach(async () => {
    await resetAgentRunStoreForTests();
  });

  it("rejects requests without sourceText", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({ sourceUrl: "https://example.com/empty" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: "sourceText is required" });
  });

  it("generates and stores a deterministic draft card", async () => {
    const response = await POST(
      new Request("http://localhost/api/generate-card", {
        method: "POST",
        body: JSON.stringify({
          sourceUrl: "https://example.com/cn/gaming-approval",
          sourceText: "业内预计未来几批国产网络游戏版号数量或继续增加。",
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
});
