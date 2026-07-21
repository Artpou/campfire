import { isSubtitleFile } from "@seedarr/shared";

import { BadRequestError, NotFoundError } from "@/errors/error";
import { getDownloadsRoot, resolveWithinDownloads } from "@/helpers/path.helper";
import type { Download } from "@/modules/download/download.dto";
import fs from "node:fs/promises";
import * as path from "node:path";

function contentTypeForSubtitle(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".vtt")) return "text/vtt; charset=utf-8";
  if (lower.endsWith(".ass") || lower.endsWith(".ssa")) return "text/x-ssa; charset=utf-8";
  return "application/x-subrip; charset=utf-8";
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

  /** Serve subtitle file as-is (SRT/ASS/VTT) — movi-player parses client-side. */
  async getSubtitleFile(download: Download, rawFilePath: string): Promise<{ content: string; contentType: string }> {
    const filePath = decodeURIComponent(rawFilePath);
    if (!isSubtitleFile(filePath)) {
      throw new BadRequestError("Only .srt, .vtt, .ass and .ssa files are supported");
    }

    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "", filePath);
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundError("Subtitle file");
    }

    const content = await this.decodeSubtitleFile(fullPath);
    return { content, contentType: contentTypeForSubtitle(filePath) };
  }

  private async decodeSubtitleFile(fullPath: string): Promise<string> {
    const iconv = await import("iconv-lite");
    const buffer = await fs.readFile(fullPath);
    const utf8 = iconv.default.decode(buffer, "utf-8");
    return utf8.includes("\ufffd") ? iconv.default.decode(buffer, "win1252") : utf8;
  }
}
