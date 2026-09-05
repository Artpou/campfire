import { formatError } from "@seedarr/shared";

import { BadRequestError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";

import dns from "node:dns/promises";

// --- UTILS & HELPERS ---

/** Nettoie le hostname (minuscules + retrait des crochets IPv6) */
const cleanHost = (host: string) => host.toLowerCase().replace(/^\[|\]$/g, "");

export function isPrivateHost(ip: string): boolean {
  const host = cleanHost(ip);
  const mapped = host.startsWith("::ffff:") ? host.slice(7) : host;

  return (
    ["localhost", "0.0.0.0", "::1", "::", "host.docker.internal", "metadata.google.internal"].includes(mapped) ||
    mapped.startsWith("127.") ||
    mapped.startsWith("10.") ||
    mapped.startsWith("192.168.") ||
    mapped.startsWith("169.254.") ||
    mapped.startsWith("fe80:") ||
    mapped.startsWith("fc") ||
    mapped.startsWith("fd") ||
    mapped.endsWith(".local") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(mapped)
  );
}

function isMetadataEndpoint(hostname: string): boolean {
  const host = cleanHost(hostname);
  return host === "metadata.google.internal" || host.startsWith("169.254.");
}

export function redactUrl(url: string): string {
  try {
    const parsed = new URL(url);
    for (const key of [...parsed.searchParams.keys()]) {
      if (/api[_-]?key|password|token|secret|auth/i.test(key)) {
        parsed.searchParams.set(key, "***");
      }
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

/** Centralise le parsing d'URL et la validation du protocole HTTP(S) */
function parseAndValidateUrl(url: string, logContext?: string): URL {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Invalid URI scheme (${parsed.protocol})`);
    }
    if (!parsed.hostname) throw new Error("Invalid hostname");
    return parsed;
  } catch (err) {
    if (logContext) logger.warn(logContext, `Invalid URL: ${redactUrl(url)}`);
    const msg = formatError(err);
    throw new BadRequestError(`${msg}: ${redactUrl(url)}`);
  }
}

/** Centralise la résolution DNS */
async function resolveIp(hostname: string): Promise<string> {
  try {
    const { address } = await dns.lookup(hostname);
    return address;
  } catch {
    throw new BadRequestError(`Failed to resolve hostname: ${hostname}`);
  }
}

/** Block DNS rebinding: public hostnames must not resolve to private/metadata IPs. */
async function assertNoDnsRebind(parsed: URL): Promise<void> {
  const hostnameIsPrivate = isPrivateHost(parsed.hostname);
  const ip = await resolveIp(parsed.hostname);

  if (isMetadataEndpoint(ip) || ip === "169.254.169.254") {
    throw new BadRequestError(`URL resolves to cloud metadata endpoint (${parsed.hostname} -> ${ip})`);
  }

  if (!hostnameIsPrivate && isPrivateHost(ip)) {
    throw new BadRequestError(`URL resolves to a private network address (${parsed.hostname} -> ${ip})`);
  }
}

// --- FONCTIONS PRINCIPALES (ASSERTIONS) ---

export async function assertSafeIndexerUrl(url: string): Promise<void> {
  const parsed = parseAndValidateUrl(url);
  if (isMetadataEndpoint(parsed.hostname)) {
    throw new BadRequestError("Indexer URL cannot point to cloud metadata endpoints");
  }
  await assertNoDnsRebind(parsed);
}

export async function assertPublicHttpUrl(url: string): Promise<void> {
  const parsed = parseAndValidateUrl(url);

  if (isPrivateHost(parsed.hostname)) {
    logger.warn("URL", `Blocked private network URL: ${redactUrl(url)}`);
    throw new BadRequestError(`URL cannot point to private networks: ${parsed.hostname}`);
  }

  await assertNoDnsRebind(parsed);
}

export async function assertSafeTorrentFetchUrl(url: string): Promise<void> {
  const parsed = parseAndValidateUrl(url, "TORRENT");

  // Self-hosted: LAN / localhost magnet & .torrent URLs are allowed (Jackett on NAS, etc.).
  if (isMetadataEndpoint(parsed.hostname)) {
    logger.warn("TORRENT", `Blocked torrent fetch URL: ${redactUrl(url)}`);
    throw new BadRequestError(`URL cannot point to cloud metadata endpoints: ${parsed.hostname}`);
  }

  await assertNoDnsRebind(parsed);
}

/**
 * Fetch while re-validating every redirect hop (SSRF-safe).
 * Callers must pass the same assert used for the initial URL (e.g. assertPublicHttpUrl).
 */
export async function fetchFollowingRedirects(
  url: string,
  assertUrl: (nextUrl: string) => Promise<void>,
  init?: RequestInit & { maxRedirects?: number },
): Promise<Response> {
  const maxRedirects = init?.maxRedirects ?? 5;
  const { maxRedirects: _ignored, ...fetchInit } = init ?? {};
  let currentUrl = url;

  for (let depth = 0; depth <= maxRedirects; depth++) {
    await assertUrl(currentUrl);
    const response = await fetch(currentUrl, { ...fetchInit, redirect: "manual" });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new BadRequestError("Redirect without Location header");
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    return response;
  }
  throw new BadRequestError("Too many redirects");
}
