import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const requestFixtures = vi.hoisted(() => ({
  lookup: vi.fn(async () => [{ address: "93.184.216.34" }]),
  responses: [] as Array<{ status: number; body?: string | Uint8Array; headers?: Record<string, string> }>,
  calls: [] as Array<{ protocol: string | undefined; hostname: string | undefined; path: string | undefined }>,
}));

function mockNodeRequest(protocol: "http:" | "https:") {
  return vi.fn((options: { hostname?: string; path?: string; lookup?: (hostname: string | undefined, options: { all: boolean }, callback: (error: Error | null, address?: string | Array<{ address: string; family: number }>, family?: number) => void) => void }, callback: (response: Readable & { statusCode?: number; headers?: Record<string, string> }) => void) => {
    requestFixtures.calls.push({ protocol, hostname: options.hostname, path: options.path });
    const listeners = new Map<string, (error?: Error) => void>();
    const request = {
      on(event: string, listener: (error?: Error) => void) {
        listeners.set(event, listener);
        return request;
      },
      end() {
        options.lookup?.(options.hostname, { all: true }, (error: Error | null, address?: string | Array<{ address: string; family: number }>) => {
          if (error) {
            listeners.get("error")?.(error);
            listeners.get("close")?.();
            return;
          }
          if (!Array.isArray(address) || address.length === 0) {
            listeners.get("error")?.(new Error("mock lookup did not return address array"));
            listeners.get("close")?.();
            return;
          }
          const fixture = requestFixtures.responses.shift() ?? { status: 200, body: "" };
          const response = Readable.from([fixture.body ?? ""]) as Readable & { statusCode?: number; headers?: Record<string, string> };
          response.statusCode = fixture.status;
          response.headers = fixture.headers ?? { "content-type": "text/plain" };
          callback(response);
          listeners.get("close")?.();
        });
      },
      destroy(error?: Error) {
        if (error) listeners.get("error")?.(error);
        listeners.get("close")?.();
      },
    };
    return request;
  });
}

vi.mock("node:dns/promises", () => ({
  lookup: requestFixtures.lookup,
}));

vi.mock("node:http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:http")>()),
  request: mockNodeRequest("http:"),
}));

vi.mock("node:https", async (importOriginal) => ({
  ...(await importOriginal<typeof import("node:https")>()),
  request: mockNodeRequest("https:"),
}));

import { assertSafeSourceUrl, fetchSourceExcerpt } from "./source-fetcher";

describe("source fetcher URL safety", () => {
  beforeEach(() => {
    requestFixtures.lookup.mockReset();
    requestFixtures.lookup.mockResolvedValue([{ address: "93.184.216.34" }]);
    requestFixtures.responses.length = 0;
    requestFixtures.calls.length = 0;
  });

  afterEach(() => {
    requestFixtures.responses.length = 0;
    requestFixtures.calls.length = 0;
  });

  it.each([
    "ftp://news.example/article",
    "http://localhost/article",
    "http://127.0.0.1/article",
    "http://10.1.2.3/article",
    "http://172.16.0.1/article",
    "http://192.168.1.8/article",
    "http://169.254.169.254/latest/meta-data",
    "http://192.0.2.1/article",
    "http://198.51.100.1/article",
    "http://203.0.113.10/article",
    "http://[::1]/article",
    "http://[::ffff:127.0.0.1]/article",
    "http://[::ffff:172.16.0.1]/article",
    "http://[::ffff:203.0.113.10]/article",
    "http://[::7f00:1]/article",
    "http://[64:ff9b::a9fe:a9fe]/article",
    "http://[100::1]/article",
    "http://[2001:db8::1]/article",
    "http://[2001:2::1]/article",
    "http://[2002:7f00:1::]/article",
    "http://[fe80::1]/article",
    "http://[ff02::1]/article",
    "http://service.internal/article",
  ])("rejects unsafe source URL %s", (sourceUrl) => {
    expect(() => assertSafeSourceUrl(sourceUrl)).toThrow(/sourceUrl/i);
  });

  it("extracts readable local-language text from a reachable HTML source", async () => {
    requestFixtures.responses.push({
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: "<html><head><script>ignore()</script></head><body><article><h1>AI 기본법</h1><p>정부가 AI 기본법 시행령과 고영향 AI 기준을 공개하는 방안을 검토하고 있다.</p></article></body></html>",
    });

    const excerpt = await fetchSourceExcerpt("https://news.example.kr/ai-policy");

    expect(excerpt.sourceUrl).toBe("https://news.example.kr/ai-policy");
    expect(excerpt.sourceText).toContain("AI 기본법");
    expect(excerpt.sourceText).not.toContain("ignore()");
  });

  it("prefers the news article body over page chrome, widgets, and related-link noise", async () => {
    requestFixtures.responses.push({
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
      body: `
        <html>
          <head><meta property="og:title" content="SK하이닉스·삼성전자, 낙폭 딛고 급반등"></head>
          <body>
            <div class="translator_widget">Translated by kakao i 한국어 English 日本語</div>
            <div class="article_view">
              <section>
                <p><strong>SK하이닉스 장중 197만3000원까지 껑충</strong></p>
                <p>SK하이닉스와 삼성전자가 장 초반 약세를 딛고 나란히 반등에 성공했다.</p>
                <p>메모리 업황 개선 기대감이 주가 하단을 떠받치는 모양새다.</p>
              </section>
            </div>
            <ul class="related_news"><li>해킹 청구서에 희비 엇갈린 통신3사…올해는 AI DC로 수익성 드라이브</li></ul>
          </body>
        </html>
      `,
    });

    const excerpt = await fetchSourceExcerpt("https://v.daum.net/v/20260513142501045");

    expect(excerpt.sourceText).toContain("SK하이닉스·삼성전자, 낙폭 딛고 급반등");
    expect(excerpt.sourceText).toContain("메모리 업황 개선 기대감");
    expect(excerpt.sourceText).not.toContain("Translated by kakao");
    expect(excerpt.sourceText).not.toContain("AI DC로 수익성 드라이브");
  });

  it("fails before generation when a source URL is unreachable", async () => {
    requestFixtures.responses.push({ status: 404, body: "missing", headers: { "content-type": "text/plain" } });

    await expect(fetchSourceExcerpt("https://news.example.kr/missing")).rejects.toThrow(/non-2xx/i);
  });

  it("rejects hostnames that resolve to private IP addresses before connecting", async () => {
    requestFixtures.lookup.mockResolvedValue([{ address: "169.254.169.254" }]);

    await expect(fetchSourceExcerpt("https://metadata-proxy.example/article")).rejects.toThrow(/IP range is not allowed/i);
    expect(requestFixtures.responses).toHaveLength(0);
  });

  it("validates redirect locations before following them", async () => {
    requestFixtures.responses.push({ status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });

    await expect(fetchSourceExcerpt("https://news.example.kr/redirect")).rejects.toThrow(/IP range is not allowed/i);
    expect(requestFixtures.calls).toHaveLength(1);
  });

  it("rejects oversized streaming responses without waiting for response.text()", async () => {
    requestFixtures.responses.push({ status: 200, body: new Uint8Array(300_000), headers: { "content-type": "text/plain" } });

    await expect(fetchSourceExcerpt("https://news.example.kr/large")).rejects.toThrow(/too large/i);
  });

  it("rejects reachable English-only pages instead of defaulting them to local language", async () => {
    requestFixtures.responses.push({
      status: 200,
      headers: { "content-type": "text/plain" },
      body: "The ministry is considering a policy update with enough readable source text.",
    });

    await expect(fetchSourceExcerpt("https://news.example.kr/english")).rejects.toThrow(/local-language/i);
  });
});
