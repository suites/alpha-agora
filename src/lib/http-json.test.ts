import { describe, expect, it } from "vitest";

import { readJsonResponse } from "./http-json";

describe("readJsonResponse", () => {
  it("parses JSON response bodies", async () => {
    const body = await readJsonResponse<{ ok: boolean }>(Response.json({ ok: true }), "Request failed");

    expect(body).toEqual({ ok: true });
  });

  it("throws a useful error for empty failed responses", async () => {
    const response = new Response(null, { status: 500 });

    await expect(readJsonResponse(response, "Generate Market Card failed")).rejects.toThrow(
      "Generate Market Card failed (HTTP 500 returned an empty response)",
    );
  });

  it("throws a useful error for invalid JSON responses", async () => {
    const response = new Response("Internal Server Error", { status: 500 });

    await expect(readJsonResponse(response, "Generate Market Card failed")).rejects.toThrow(
      "Generate Market Card failed (HTTP 500 returned invalid JSON)",
    );
  });
});
