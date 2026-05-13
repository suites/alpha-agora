import { randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { createSessionCookie, readSessionFromCookieHeader, SESSION_COOKIE_NAME, type AuthSession } from "../../../../lib/auth-session";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const OAUTH_STATE_COOKIE_NAME = "alpha_agora_oauth_state";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");

  if (action === "callback") return handleGoogleCallback(request);
  if (action === "logout") return handleLogout(request);
  if (action === "session") return handleSession(request);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = googleRedirectUri(request);
  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 503 });
  }

  const state = randomBytes(32).toString("base64url");
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("prompt", "select_account");
  authUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authUrl);
  response.headers.append("Set-Cookie", buildOauthStateCookie(state, request));
  return response;
}

async function handleGoogleCallback(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!isValidOauthState(request.headers.get("cookie"), state)) {
    const response = NextResponse.json({ error: "Google OAuth state verification failed" }, { status: 400 });
    response.headers.append("Set-Cookie", clearOauthStateCookie(request));
    return response;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!code || !clientId || !clientSecret) {
    return NextResponse.json({ error: "Google OAuth is not configured" }, { status: 400 });
  }

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: googleRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.json({ error: "Google OAuth token exchange failed" }, { status: 502 });
  }

  const tokens = (await tokenResponse.json()) as { id_token?: string };
  const session = parseGoogleIdToken(tokens.id_token);
  if (!session) {
    return NextResponse.json({ error: "Google identity token missing required profile fields" }, { status: 502 });
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.append("Set-Cookie", await createSessionCookie(session));
  return response;
}

async function handleLogout(request: Request) {
  const response = NextResponse.redirect(new URL("/", request.url));
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return response;
}

async function handleSession(request: Request) {
  const session = await readSessionFromCookieHeader(request.headers.get("cookie"));
  return NextResponse.json({ authenticated: Boolean(session), session });
}

function googleRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/auth/google?action=callback`;
}

function buildOauthStateCookie(state: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${OAUTH_STATE_COOKIE_NAME}=${state}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=600${secure}`;
}

function clearOauthStateCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${OAUTH_STATE_COOKIE_NAME}=; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

function isValidOauthState(cookieHeader: string | null, state: string | null): boolean {
  if (!state) return false;
  const cookieState = parseCookie(cookieHeader, OAUTH_STATE_COOKIE_NAME);
  return cookieState === state;
}

function parseCookie(cookieHeader: string | null, name: string): string | undefined {
  const prefix = `${name}=`;
  return cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

function parseGoogleIdToken(idToken: string | undefined): AuthSession | undefined {
  if (!idToken) return undefined;
  const [, payload] = idToken.split(".");
  if (!payload) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AuthSession> & {
      email_verified?: boolean;
    };
    if (!parsed.email || !parsed.name) return undefined;
    return { email: parsed.email, name: parsed.name, picture: parsed.picture, provider: "google" };
  } catch {
    return undefined;
  }
}
