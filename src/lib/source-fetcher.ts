import { lookup } from "node:dns/promises";
import { request as requestHttp } from "node:http";
import { request as requestHttps } from "node:https";
import type { IncomingMessage, RequestOptions } from "node:http";
import { isIP } from "node:net";

const MAX_SOURCE_BYTES = 256_000;
const EXCERPT_CHARS = 8_000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;
const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain", "application/xhtml+xml"];
const LOCAL_LANGUAGE_RE = /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g;
const MIN_LOCAL_LANGUAGE_CHARS = 6;

export interface SourceExcerpt {
  sourceUrl: string;
  sourceText: string;
}

type SourceResponse = Pick<IncomingMessage, "headers" | "statusCode" | typeof Symbol.asyncIterator> & {
  destroy?: () => void;
};

export function assertSafeSourceUrl(sourceUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(sourceUrl);
  } catch {
    throw new Error("sourceUrl must be a valid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("sourceUrl must use http or https");
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("sourceUrl hostname is not allowed");
  }
  if (hostname.endsWith(".local") || hostname.endsWith(".internal") || hostname.endsWith(".lan")) {
    throw new Error("sourceUrl hostname is not allowed");
  }

  assertPublicIpLiteral(hostname);

  return parsed;
}

export function assertLocalLanguageSourceText(sourceText: string): void {
  const localLanguageChars = sourceText.match(LOCAL_LANGUAGE_RE)?.length ?? 0;
  if (localLanguageChars < MIN_LOCAL_LANGUAGE_CHARS) {
    throw new Error("sourceUrl did not contain enough local-language source text");
  }
}

export async function fetchSourceExcerpt(sourceUrl: string): Promise<SourceExcerpt> {
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);

  try {
    let currentUrl = await assertResolvedSafeSourceUrl(sourceUrl);

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const response = await requestSourceUrl(currentUrl, timeoutSignal);

      if (isRedirect(response.statusCode ?? 0)) {
        if (redirectCount === MAX_REDIRECTS) {
          throw new Error("sourceUrl redirected too many times");
        }
        const location = firstHeader(response.headers.location);
        if (!location) {
          throw new Error("sourceUrl redirect did not include a location");
        }
        currentUrl = await assertResolvedSafeSourceUrl(new URL(location, currentUrl).toString());
        continue;
      }

      const statusCode = response.statusCode ?? 0;
      if (statusCode < 200 || statusCode >= 300) {
        throw new Error(`sourceUrl returned non-2xx status ${statusCode}`);
      }

      const contentLength = firstHeader(response.headers["content-length"]);
      if (contentLength && Number(contentLength) > MAX_SOURCE_BYTES) {
        throw new Error("sourceUrl response is too large");
      }

      const contentType = firstHeader(response.headers["content-type"])?.split(";")[0]?.trim().toLowerCase() ?? "";
      if (contentType && !ALLOWED_CONTENT_TYPES.includes(contentType)) {
        throw new Error(`sourceUrl content-type ${contentType} is not supported`);
      }

      const body = await readBodyWithLimit(response);
      const sourceText = extractReadableText(body, contentType);
      if (sourceText.length < 20) {
        throw new Error("sourceUrl did not contain enough readable source text");
      }
      assertLocalLanguageSourceText(sourceText);

      return { sourceUrl: currentUrl.toString(), sourceText };
    }

    throw new Error("sourceUrl redirected too many times");
  } catch (error) {
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      throw new Error("sourceUrl fetch timed out");
    }
    throw error;
  }
}

function requestSourceUrl(url: URL, signal: AbortSignal): Promise<SourceResponse> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new Error("sourceUrl fetch timed out"));
      return;
    }

    const requestOptions: RequestOptions = {
      protocol: url.protocol,
      hostname: url.hostname.replace(/^\[/, "").replace(/\]$/, ""),
      port: url.port,
      path: `${url.pathname}${url.search}`,
      method: "GET",
      headers: sourceRequestHeaders(url),
      lookup: validatedLookup,
    };
    const request = url.protocol === "https:"
      ? requestHttps(requestOptions, resolve)
      : requestHttp(requestOptions, resolve);

    const abort = () => request.destroy(new Error("sourceUrl fetch timed out"));
    signal.addEventListener("abort", abort, { once: true });
    request.on("error", reject);
    request.on("close", () => signal.removeEventListener("abort", abort));
    request.end();
  });
}

function sourceRequestHeaders(url: URL): Record<string, string> {
  return {
    accept: "text/html, text/plain;q=0.9, application/xhtml+xml;q=0.8",
    host: url.host,
    "user-agent": "AlphaAgoraSourceFetcher/1.0",
  };
}

function validatedLookup(hostname: string, options: unknown, callback: (error: Error | null, address: string, family: number) => void): void {
  void options;
  lookup(hostname, { all: true, verbatim: true })
    .then((addresses) => {
      if (addresses.length === 0) throw new Error("sourceUrl hostname could not be resolved");
      for (const { address } of addresses) assertPublicIpLiteral(address);
      const selected = addresses[0];
      callback(null, selected.address, selected.family ?? isIP(selected.address));
    })
    .catch((error) => callback(error instanceof Error ? error : new Error("sourceUrl hostname could not be resolved"), "", 0));
}

function firstHeader(value: string | string[] | number | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  if (typeof value === "number") return String(value);
  return value;
}

async function assertResolvedSafeSourceUrl(sourceUrl: string): Promise<URL> {
  const parsed = assertSafeSourceUrl(sourceUrl);
  const hostname = parsed.hostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (isIP(hostname) === 0) {
    let addresses: Array<{ address: string }>;
    try {
      addresses = await lookup(hostname, { all: true, verbatim: true });
    } catch {
      throw new Error("sourceUrl hostname could not be resolved");
    }

    if (addresses.length === 0) {
      throw new Error("sourceUrl hostname could not be resolved");
    }

    for (const { address } of addresses) {
      assertPublicIpLiteral(address);
    }
  }

  return parsed;
}

async function readBodyWithLimit(response: SourceResponse): Promise<string> {
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";

  for await (const chunk of response) {
    const value = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    bytesRead += value.byteLength;
    if (bytesRead > MAX_SOURCE_BYTES) {
      response.destroy?.();
      throw new Error("sourceUrl response is too large");
    }
    body += decoder.decode(value, { stream: true });
  }

  body += decoder.decode();
  return body;
}

function extractReadableText(body: string, contentType: string): string {
  const text = contentType === "text/html" || contentType === "application/xhtml+xml"
    ? body
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
        .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
        .replace(/<[^>]+>/g, " ")
    : body;

  return decodeBasicEntities(text).replace(/\s+/g, " ").trim().slice(0, EXCERPT_CHARS);
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

function assertPublicIpLiteral(hostnameOrAddress: string): void {
  const ipVersion = isIP(hostnameOrAddress);
  if (ipVersion === 4 && isPrivateIpv4(hostnameOrAddress)) {
    throw new Error("sourceUrl IP range is not allowed");
  }
  if (ipVersion === 6 && isPrivateIpv6(hostnameOrAddress)) {
    throw new Error("sourceUrl IP range is not allowed");
  }
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  const [first, second] = parts;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0) ||
    (first === 192 && second === 88 && parts[2] === 99) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && parts[2] === 100) ||
    (first === 203 && second === 0 && parts[2] === 113) ||
    first >= 224
  );
}

function isPrivateIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  const dottedMappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (dottedMappedIpv4) return isPrivateIpv4(dottedMappedIpv4);
  const hexMappedIpv4 = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (hexMappedIpv4) {
    const high = Number.parseInt(hexMappedIpv4[1], 16);
    const low = Number.parseInt(hexMappedIpv4[2], 16);
    const mappedIpv4 = `${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`;
    return isPrivateIpv4(mappedIpv4);
  }

  const firstBlock = Number.parseInt(normalized.split(":")[0] || "0", 16);
  const secondBlock = Number.parseInt(normalized.split(":")[1] || "0", 16);
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized === "0:0:0:0:0:0:0:1" ||
    normalized.startsWith("::") ||
    (firstBlock >= 0x0064 && firstBlock <= 0x0064 && secondBlock === 0xff9b) ||
    firstBlock === 0x0100 ||
    (firstBlock === 0x2001 && secondBlock <= 0x01ff) ||
    (firstBlock === 0x2001 && secondBlock === 0x0002) ||
    (firstBlock === 0x2001 && secondBlock === 0x0db8) ||
    firstBlock === 0x2002 ||
    (firstBlock >= 0xfc00 && firstBlock <= 0xfdff) ||
    (firstBlock >= 0xfe80 && firstBlock <= 0xfebf) ||
    (firstBlock >= 0xff00 && firstBlock <= 0xffff)
  );
}
