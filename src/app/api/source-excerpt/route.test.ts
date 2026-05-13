import { afterEach, describe, expect, it, vi } from "vitest";

const mockFetchSourceExcerpt = vi.hoisted(() => vi.fn());

vi.mock("../../../lib/source-fetcher", () => ({
  fetchSourceExcerpt: mockFetchSourceExcerpt,
}));

import { POST } from "./route";

describe("/api/source-excerpt", () => {
  afterEach(() => {
    mockFetchSourceExcerpt.mockReset();
  });

  it("fetches and returns an editable local-language source excerpt for a URL", async () => {
    mockFetchSourceExcerpt.mockResolvedValue({
      sourceUrl: "https://news.example.jp/games",
      sourceText: "ゲーム承認 当局がオンラインゲーム承認件数を増やす可能性がある。",
    });

    const response = await POST(
      new Request("http://localhost/api/source-excerpt", {
        method: "POST",
        body: JSON.stringify({ sourceUrl: "https://news.example.jp/games" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetchSourceExcerpt).toHaveBeenCalledWith("https://news.example.jp/games");
    await expect(response.json()).resolves.toMatchObject({
      sourceUrl: "https://news.example.jp/games",
      sourceText: expect.stringContaining("オンラインゲーム承認件数"),
    });
  });

  it("rejects unsafe URLs without fetching", async () => {
    mockFetchSourceExcerpt.mockRejectedValue(new Error("sourceUrl IP range is not allowed"));

    const response = await POST(
      new Request("http://localhost/api/source-excerpt", {
        method: "POST",
        body: JSON.stringify({ sourceUrl: "http://127.0.0.1/admin" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockFetchSourceExcerpt).toHaveBeenCalledWith("http://127.0.0.1/admin");
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringMatching(/IP range/i) });
  });
});
