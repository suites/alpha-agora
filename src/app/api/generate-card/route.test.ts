import { describe, expect, it } from "vitest";

import { GET, POST } from "./route";

describe("/api/generate-card", () => {
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

    const listResponse = await GET();
    const listBody = await listResponse.json();
    expect(listBody.generatedCards).toEqual(expect.arrayContaining([body.card]));
  });
});
