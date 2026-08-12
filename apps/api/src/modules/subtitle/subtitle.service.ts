import type { SubtitlesSearchQuery } from "@seedarr/contracts";
import { sanitizeFileName } from "@seedarr/shared";

import { BadRequestError, ForbiddenError, NotFoundError, ServiceUnavailableError } from "@/shared/errors/error";
import {
  assertWithinDownloads,
  getDownloadsRoot,
  requireDownloadFolderName,
  resolveWithinDownloads,
} from "@/shared/helpers/path.helper";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { DownloadService } from "@/modules/download/download.service";
import type { User } from "@/modules/user/user.schema";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SubdlSearchResponse } from "./subtitle.types";

const SUBDL_API_BASE = "https://api.subdl.com/api/v1";
const SUBDL_DL_BASE = "https://dl.subdl.com";
const ALLOWED_SUBTITLE_DOMAINS = new Set(["dl.subdl.com", "api.subdl.com"]);

function getApiKey(): string {
  const key = process.env.SUBDL_API_KEY;
  if (!key) {
    throw new ServiceUnavailableError("SUBDL (missing API key)");
  }
  return key;
}

export class SubtitleService extends AuthenticatedService {
  private readonly downloadService: DownloadService;

  constructor(user: User, downloadService = new DownloadService(user)) {
    super(user);
    this.downloadService = downloadService;
  }

  async search(query: SubtitlesSearchQuery): Promise<SubdlSearchResponse> {
    const apiKey = getApiKey();
    const params = new URLSearchParams({
      api_key: apiKey,
      tmdb_id: query.tmdb_id,
      languages: query.languages,
      ...(query.type && { type: query.type }),
    });
    const url = `${SUBDL_API_BASE}/subtitles?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new ServiceUnavailableError(`SUBDL (${res.status})`);
    }
    return (await res.json()) as SubdlSearchResponse;
  }

  /** Resolve download ownership, then save subtitle into that folder. */
  async downloadForDownload(
    downloadId: string,
    url: string,
    language: string,
    mediaTitle: string,
  ): Promise<{ relativePath: string }> {
    const download = await this.downloadService.get(downloadId);
    if (download.userId !== this.user.id && !["owner", "admin"].includes(this.user.role)) {
      throw new ForbiddenError();
    }
    const downloadFolderPath = resolveWithinDownloads(requireDownloadFolderName(download));
    return this.download(downloadFolderPath, url, language, mediaTitle);
  }

  /**
   * Download a subtitle zip from SUBDL, extract .srt/.vtt, save to the download folder,
   * and return the path relative to DOWNLOADS_PATH for use in /downloads/:id/subtitles/:filePath.
   */
  async download(
    downloadFolderPath: string,
    url: string,
    language: string,
    mediaTitle: string,
  ): Promise<{ relativePath: string }> {
    assertWithinDownloads(downloadFolderPath);
    const downloadsPath = getDownloadsRoot();
    let fullZipUrl: string;
    if (url.startsWith("http")) {
      const parsed = new URL(url);
      if (!ALLOWED_SUBTITLE_DOMAINS.has(parsed.hostname)) {
        throw new BadRequestError("Subtitle URL must be from a trusted source (subdl.com)");
      }
      fullZipUrl = url;
    } else {
      fullZipUrl = `${SUBDL_DL_BASE}${url}`;
    }
    const res = await fetch(fullZipUrl);
    if (!res.ok) {
      throw new ServiceUnavailableError(`SUBDL download (${res.status})`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const unzipper = await import("unzipper");
    const dir = await unzipper.Open.buffer(buffer);
    const subtitleEntry = dir.files.find(
      (f: { path: string }) =>
        !f.path.startsWith("__MACOSX") &&
        (f.path.toLowerCase().endsWith(".srt") || f.path.toLowerCase().endsWith(".vtt")),
    );
    if (!subtitleEntry) {
      throw new NotFoundError("Subtitle file (.srt/.vtt) in archive");
    }

    const ext = subtitleEntry.path.toLowerCase().endsWith(".vtt") ? ".vtt" : ".srt";
    const safeTitle = sanitizeFileName(mediaTitle);
    const safeLang = sanitizeFileName(language).slice(0, 10);
    const fileName = `${safeTitle}.${safeLang}${ext}`;
    const destPath = path.join(downloadFolderPath, fileName);
    assertWithinDownloads(destPath);

    await fs.mkdir(downloadFolderPath, { recursive: true });
    const content = await subtitleEntry.buffer();
    await fs.writeFile(destPath, content);

    const relativePath = path.relative(downloadsPath, destPath);
    return { relativePath: relativePath.replace(/\\/g, "/") };
  }
}
