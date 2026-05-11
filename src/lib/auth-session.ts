import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "alpha_agora_session";

export interface AuthSession {
  email: string;
  name: string;
  picture?: string;
  provider: "google";
}

export async function createSessionCookie(session: AuthSession, secret = getAuthSecret()): Promise<string> {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = sign(payload, secret);
  return `${SESSION_COOKIE_NAME}=${payload}.${signature}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`;
}

export async function readSessionFromCookieHeader(cookieHeader: string | null | undefined, secret = getAuthSecret()): Promise<AuthSession | undefined> {
  if (!cookieHeader) return undefined;
  const value = parseCookie(cookieHeader, SESSION_COOKIE_NAME);
  if (!value) return undefined;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !verify(payload, signature, secret)) return undefined;

  try {
    const parsed = JSON.parse(base64UrlDecode(payload)) as Partial<AuthSession>;
    if (!parsed.email || !parsed.name || parsed.provider !== "google") return undefined;
    return { email: parsed.email, name: parsed.name, picture: parsed.picture, provider: "google" };
  } catch {
    return undefined;
  }
}

export function getAuthSecret(): string {
  return process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "alpha-agora-local-dev-secret";
}

function parseCookie(cookieHeader: string, name: string): string | undefined {
  const prefix = `${name}=`;
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function verify(payload: string, signature: string, secret: string): boolean {
  const expected = Buffer.from(sign(payload, secret));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}
