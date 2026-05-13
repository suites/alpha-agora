import { afterEach, describe, expect, it } from "vitest";

import { GET } from "./route";

const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

function setGoogleOAuthEnv() {
  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
}

afterEach(() => {
  restoreEnv("GOOGLE_CLIENT_ID", originalGoogleClientId);
  restoreEnv("GOOGLE_CLIENT_SECRET", originalGoogleClientSecret);
});

function restoreEnv(name: "GOOGLE_CLIENT_ID" | "GOOGLE_CLIENT_SECRET", value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe("/api/auth/google", () => {
  it("fails closed instead of creating a demo validator when Google OAuth is not configured", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;

    const response = await GET(new Request("http://localhost/api/auth/google"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ error: "Google OAuth is not configured" });
  });

  it("starts Google OAuth with a CSRF state cookie and matching state parameter", async () => {
    setGoogleOAuthEnv();

    const response = await GET(new Request("http://localhost/api/auth/google"));

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toBeTruthy();
    const redirectUrl = new URL(location!);
    const state = redirectUrl.searchParams.get("state");
    expect(state).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect(response.headers.get("set-cookie")).toContain(`alpha_agora_oauth_state=${state}`);
  });

  it("rejects a Google OAuth callback when the state cookie does not match", async () => {
    setGoogleOAuthEnv();

    const response = await GET(
      new Request("http://localhost/api/auth/google?action=callback&code=oauth-code&state=attacker-state", {
        headers: { cookie: "alpha_agora_oauth_state=legit-state" },
      }),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toContain("alpha_agora_oauth_state=; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=0");
    await expect(response.json()).resolves.toMatchObject({ error: "Google OAuth state verification failed" });
  });
});
