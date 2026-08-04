import { formatError } from "@seedarr/shared";

import { BadRequestError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import { assertSafeTorrentFetchUrl, redactUrl } from "@/shared/helpers/url.helper";

import { enrichMagnetUri } from "./magnet-tracker.helper";

const MAX_REDIRECT_DEPTH = 5;

export async function resolveTorrentSource(uri: string, depth = 0): Promise<string | Buffer> {
  if (uri.startsWith("magnet:")) return enrichMagnetUri(uri);
  if (depth > MAX_REDIRECT_DEPTH) throw new BadRequestError("Too many redirects");

  await assertSafeTorrentFetchUrl(uri);

  let response: Response;
  try {
    response = await fetch(uri, {
      redirect: "manual",
      headers: { "User-Agent": "Seedarr/1.0" },
    });
  } catch (error) {
    const message = formatError(error);
    logger.error("TORRENT", `Failed to fetch torrent from ${redactUrl(uri)}: ${message}`);
    throw new BadRequestError(`Failed to fetch .torrent file: ${message}`);
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new BadRequestError("Redirect without Location header");
    if (location.startsWith("magnet:")) return enrichMagnetUri(location);

    const resolved = new URL(location, uri).toString();
    logger.debug("TORRENT", `Following redirect to ${redactUrl(resolved)}`);
    await assertSafeTorrentFetchUrl(resolved);
    return resolveTorrentSource(resolved, depth + 1);
  }

  if (!response.ok) {
    logger.warn("TORRENT", `Torrent fetch failed (${response.status}): ${redactUrl(uri)}`);
    throw new BadRequestError(`Failed to fetch .torrent file (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
}
