import { describe, expect, it } from "vitest";

import { createSessionCookie, readSessionFromCookieHeader, type AuthSession } from "./auth-session";

describe("auth session", () => {
  it("round-trips a signed Google identity cookie without exposing secrets", async () => {
    const session: AuthSession = {
      email: "validator@example.com",
      name: "Validator Lee",
      picture: "https://example.com/avatar.png",
      provider: "google",
    };

    const cookie = await createSessionCookie(session, "test-secret");
    const parsed = await readSessionFromCookieHeader(cookie, "test-secret");

    expect(parsed).toMatchObject({ email: session.email, name: session.name, provider: "google" });
    expect(cookie).not.toContain("test-secret");
  });

  it("rejects tampered cookies", async () => {
    const cookie = await createSessionCookie(
      { email: "validator@example.com", name: "Validator Lee", provider: "google" },
      "test-secret",
    );

    const parsed = await readSessionFromCookieHeader(cookie.replace("alpha_agora_session=", "alpha_agora_session=x"), "test-secret");
    expect(parsed).toBeUndefined();
  });
});
