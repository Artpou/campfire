import { BadRequestError } from "@/errors/error";
import { assertPublicHttpUrl } from "@/helpers/url.helper";
import { enrichMagnetUri } from "./magnet-tracker.helper";

const MAX_REDIRECT_DEPTH = 5;

export async function resolveTorrentSource(uri: string, depth = 0): Promise<string | Buffer> {
  if (uri.startsWith("magnet:")) return enrichMagnetUri(uri);
  if (depth > MAX_REDIRECT_DEPTH) throw new BadRequestError("Too many redirects");

  await assertPublicHttpUrl(uri);

  const response = await fetch(uri, {
    redirect: "manual",
    headers: { "User-Agent": "Seedarr/1.0" },
  });

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) throw new BadRequestError("Redirect without Location header");
    if (location.startsWith("magnet:")) return enrichMagnetUri(location);

    const resolved = new URL(location, uri).toString();
    await assertPublicHttpUrl(resolved);
    return resolveTorrentSource(resolved, depth + 1);
  }

  if (!response.ok) throw new BadRequestError(`Failed to fetch .torrent file (${response.status})`);
  return Buffer.from(await response.arrayBuffer());
}
