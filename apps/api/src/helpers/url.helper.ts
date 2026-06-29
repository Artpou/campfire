import { BadRequestError } from "@/errors/error";

export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (
    host === "localhost" ||
    host.startsWith("127.") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "host.docker.internal" ||
    host === "metadata.google.internal" ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.endsWith(".local") ||
    host.startsWith("169.254.") ||
    host.startsWith("fe80:") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return true;
  }

  return false;
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

export function assertPublicHttpUrl(url: string): void {
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
}
