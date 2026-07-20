import { BadRequestError, NotFoundError } from "@/errors/error";
import { getDownloadsRoot, resolveWithinDownloads } from "@/helpers/path.helper";
import { srt2webvtt } from "@/helpers/subtitle.helper";
import type { Download } from "@/modules/download/download.dto";
import type { TorrentLiveData } from "@/modules/download/download.schema";
import fs from "node:fs/promises";
import * as path from "node:path";

const SUBTITLE_EXTENSIONS = /\.(srt|vtt)$/i;

export class StreamingSubtitleService {
  async listExternalSubtitles(download: Download): Promise<{ paths: string[] }> {
    const downloadsRoot = getDownloadsRoot();
    const folderPath = resolveWithinDownloads(download.torrent?.name ?? "");
    const torrentPaths = new Set(
      (download.torrent?.files ?? ([] as TorrentLiveData["files"]))
        .filter((f) => SUBTITLE_EXTENSIONS.test(f.path))
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
        if (SUBTITLE_EXTENSIONS.test(entry.name) && !torrentPaths.has(rel)) collected.push(rel);
      }
    };

    await scan(folderPath);
    return { paths: collected };
  }

  async getSubtitleVtt(download: Download, rawFilePath: string): Promise<string> {
    const filePath = decodeURIComponent(rawFilePath);
    const lower = filePath.toLowerCase();
    if (!lower.endsWith(".srt") && !lower.endsWith(".vtt")) {
      throw new BadRequestError("Only .srt and .vtt files are supported");
    }

    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "", filePath);
    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundError("Subtitle file");
    }

    const content = await this.decodeSubtitleFile(fullPath);
    return lower.endsWith(".vtt") ? content : srt2webvtt(content);
  }

  private async decodeSubtitleFile(fullPath: string): Promise<string> {
    const iconv = await import("iconv-lite");
    const buffer = await fs.readFile(fullPath);
    const utf8 = iconv.default.decode(buffer, "utf-8");
    return utf8.includes("\ufffd") ? iconv.default.decode(buffer, "win1252") : utf8;
  }
}
