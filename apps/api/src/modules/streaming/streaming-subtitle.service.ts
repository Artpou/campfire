import { isSubtitleFile } from "@seedarr/shared";

import { BadRequestError, NotFoundError } from "@/shared/errors/error";
import { getDownloadsRoot, resolveWithinDownloads } from "@/shared/helpers/path.helper";

import type { Download } from "@/modules/download/download.schema";
import fs from "node:fs/promises";
import * as path from "node:path";

function contentTypeForSubtitle(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".vtt") || lower.endsWith(".srt")) return "text/vtt; charset=utf-8";
  if (lower.endsWith(".ass") || lower.endsWith(".ssa")) return "text/x-ssa; charset=utf-8";
  return "application/x-subrip; charset=utf-8";
}

/** movi-player's cue parser is VTT-oriented; normalize SubRip into WebVTT. */
function toWebVtt(content: string, filePath: string): string {
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (filePath.toLowerCase().endsWith(".vtt") || normalized.startsWith("WEBVTT")) {
    return normalized.endsWith("\n") ? normalized : `${normalized}\n`;
  }

  // SRT commas → VTT dots; pad single-digit hours (movi-player requires HH).
  const body = normalized.replace(
    /(\d{1,2}):(\d{2}):(\d{2}),(\d{3})/g,
    (_m, h: string, m: string, s: string, ms: string) => `${h.padStart(2, "0")}:${m}:${s}.${ms}`,
  );

  return `WEBVTT\n\n${body}\n`;
}

export class StreamingSubtitleService {
  async listExternalSubtitles(download: Download): Promise<{ paths: string[] }> {
    const downloadsRoot = getDownloadsRoot();
    const folderPath = resolveWithinDownloads(download.torrent?.name ?? "");
    const torrentPaths = new Set(
      (download.torrent?.files ?? [])
        .filter((f) => isSubtitleFile(f.path))
        .map((f) => path.join(download.torrent?.name ?? "", f.path).replace(/\\/g, "/")),
    );

    const collected: string[] = [];
    const scan = async (dir: string): Promise<void> => {
      let entries: import("node:fs").Dirent[];
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(full);
          continue;
        }
        const rel = path.relative(downloadsRoot, full).replace(/\\/g, "/");
        if (isSubtitleFile(entry.name) && !torrentPaths.has(rel)) collected.push(rel);
      }
    };

    await scan(folderPath);
    return { paths: collected };
  }

  /** Serve subtitle as WebVTT (SRT normalized) — movi-player parses client-side. */
  async getSubtitleFile(download: Download, rawFilePath: string): Promise<{ content: string; contentType: string }> {
    const filePath = decodeURIComponent(rawFilePath);
    if (!isSubtitleFile(filePath)) {
      throw new BadRequestError("Only .srt, .vtt, .ass and .ssa files are supported");
    }

    // External subtitle paths are already relative to DOWNLOADS_PATH (e.g. "Folder/file.ES.srt").
    // Torrent-bundled paths may be either full relative or torrent-root relative — try both.
    const candidates = [resolveWithinDownloads(filePath)];
    const torrentName = download.torrent?.name;
    if (torrentName && !filePath.startsWith(`${torrentName}/`) && filePath !== torrentName) {
      candidates.push(resolveWithinDownloads(torrentName, filePath));
    }

    let fullPath: string | null = null;
    for (const candidate of candidates) {
      try {
        await fs.access(candidate);
        fullPath = candidate;
        break;
      } catch {}
    }
    if (!fullPath) throw new NotFoundError("Subtitle file");

    const decoded = await this.decodeSubtitleFile(fullPath);
    const content = toWebVtt(decoded, filePath);
    return { content, contentType: contentTypeForSubtitle(filePath) };
  }

  private async decodeSubtitleFile(fullPath: string): Promise<string> {
    const iconv = await import("iconv-lite");
    const buffer = await fs.readFile(fullPath);
    const utf8 = iconv.default.decode(buffer, "utf-8");
    return utf8.includes("\ufffd") ? iconv.default.decode(buffer, "win1252") : utf8;
  }
}
