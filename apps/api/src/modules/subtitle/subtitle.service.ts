import type { SubtitlesSearchQuery } from "@seedarr/contracts";
import { MAX_ZIP_BYTES, sanitizeFileName } from "@seedarr/shared";

import { BadRequestError, ForbiddenError, NotFoundError, ServiceUnavailableError } from "@/shared/errors/error";
import { logger } from "@/shared/helpers/logger.helper";
import {
  assertWithinDownloads,
  getDownloadsRoot,
  requireDownloadFolderName,
  resolveWithinDownloads,
} from "@/shared/helpers/path.helper";
import { AuthenticatedService } from "@/shared/services/authenticated.service";

import { downloadRepository } from "@/modules/download/download.repository";
import { moduleRepository } from "@/modules/module/module.repository";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { SubdlSearchResponse } from "./subtitle.types";

const SUBDL_API_BASE = "https://api.subdl.com/api/v1";
const SUBDL_DL_BASE = "https://dl.subdl.com";
const ALLOWED_SUBTITLE_DOMAINS = new Set(["dl.subdl.com", "api.subdl.com"]);

async function readCappedArrayBuffer(res: Response, maxBytes: number): Promise<Buffer> {
  const contentLength = Number(res.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new BadRequestError(`Subtitle archive is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  if (buffer.length > maxBytes) {
    throw new BadRequestError(`Subtitle archive is too large (max ${Math.round(maxBytes / (1024 * 1024))}MB)`);
  }
  return buffer;
}

async function getSubdlApiKey(): Promise<string> {
  const row = await moduleRepository.findByType("subdl");
  const config = row?.config as { apiKey?: string } | undefined;
  const moduleKey = config?.apiKey?.trim();
  const key = moduleKey || process.env.SUBDL_API_KEY;
  if (!key) {
    throw new ServiceUnavailableError("SUBDL (missing API key — configure in Settings → Modules)");
  }
  if (row && !row.enabled) {
    throw new ServiceUnavailableError("SUBDL module is disabled");
  }
  return key;
}

export class SubtitleService extends AuthenticatedService {
  async search(query: SubtitlesSearchQuery): Promise<SubdlSearchResponse> {
    const apiKey = await getSubdlApiKey();
    const params = new URLSearchParams({
      api_key: apiKey,
      tmdb_id: query.tmdb_id,
      languages: query.languages,
      ...(query.type && { type: query.type }),
    });
    const url = `${SUBDL_API_BASE}/subtitles?${params.toString()}`;
    logger.debug("SUBTITLE", `SUBDL search tmdb=${query.tmdb_id} langs=${query.languages}`);
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
    const download = await downloadRepository.get(downloadId);
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
    const buffer = await readCappedArrayBuffer(res, MAX_ZIP_BYTES);

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
    logger.info("SUBTITLE", `Saved ${language} subtitle to ${relativePath.replace(/\\/g, "/")}`);
    return { relativePath: relativePath.replace(/\\/g, "/") };
  }
}
