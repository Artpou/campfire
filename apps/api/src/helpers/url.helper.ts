import { BadRequestError } from "@/errors/error";
import dns from "node:dns/promises";

export function isPrivateHost(ip: string): boolean {
  const host = ip.toLowerCase().replace(/^\[|\]$/g, "");

  const mapped = host.startsWith("::ffff:") ? host.slice(7) : host;

  if (
    mapped === "localhost" ||
    mapped.startsWith("127.") ||
    mapped === "0.0.0.0" ||
    mapped === "::1" ||
    mapped === "::" ||
    mapped === "host.docker.internal" ||
    mapped === "metadata.google.internal" ||
    mapped.startsWith("10.") ||
    mapped.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(mapped) ||
    mapped.endsWith(".local") ||
    mapped.startsWith("169.254.") ||
    mapped.startsWith("fe80:") ||
    mapped.startsWith("fc") ||
    mapped.startsWith("fd")
  ) {
    return true;
  }

  return false;
}

async function assertResolvedIpIsPublic(hostname: string): Promise<void> {
  try {
    const { address } = await dns.lookup(hostname);
    if (isPrivateHost(address)) {
      throw new BadRequestError("URL resolves to a private network address");
    }
  } catch (error) {
    if (error instanceof BadRequestError) throw error;
    throw new BadRequestError("Failed to resolve hostname");
  }
}

function isMetadataEndpoint(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "metadata.google.internal" || host === "169.254.169.254";
}

export function assertSafeIndexerUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestError("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestError("Invalid indexer URL scheme");
  }

  if (!parsed.hostname) {
    throw new BadRequestError("Invalid indexer URL hostname");
  }

  if (isMetadataEndpoint(parsed.hostname)) {
    throw new BadRequestError("Indexer URL cannot point to cloud metadata endpoints");
  }
}

export async function assertPublicHttpUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestError("Invalid URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestError("Invalid torrent URI scheme");
  }

  if (isPrivateHost(parsed.hostname)) {
    throw new BadRequestError("URL cannot point to private networks");
  }

  await assertResolvedIpIsPublic(parsed.hostname);
}
