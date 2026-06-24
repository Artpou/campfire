import { zValidator } from "@hono/zod-validator";
import { stream } from "hono/streaming";

import { paginationDto } from "@/shared/pagination.dto";

import { BadRequestError, NotFoundError } from "@/errors/error";
import { srt2webvtt } from "@/helpers/subtitle.helper";
import { convertMkvToMp4Stream } from "@/helpers/video.helper";
import { downloadStartRateLimiter } from "@/middlewares/rate-limiter.middleware";
import type { Dirent } from "node:fs";
import { Readable } from "node:stream";
import { downloadTorrentDto } from "./download.dto";
import { requireDownloadOwnership } from "./download.guard";
import type { TorrentLiveData } from "./download.schema";
import { DownloadService } from "./download.service";
import { DownloadStreamService } from "./download-stream.service";

const DOWNLOAD_PATH = process.env.DOWNLOADS_PATH || "./downloads";

function requireDownloadId(c: { req: { param: (name: string) => string | undefined } }): string {
  const id = c.req.param("id");
  if (!id) throw new BadRequestError("Missing download id");
  return id;
}

function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase();
  if (ext.endsWith(".webm")) return "video/webm";
  if (ext.endsWith(".avi")) return "video/x-msvideo";
  if (ext.endsWith(".mov")) return "video/quicktime";
  if (ext.endsWith(".mkv")) return "video/x-matroska";
  return "video/mp4";
}

export const downloadRoutes = DownloadService.createRouter()
  .get("/", zValidator("query", paginationDto), async (c) => {
    return c.json(await c.var.service.getMany(c.req.valid("query")));
  })
  .get("/stats", async (c) => {
    return c.json(await c.var.service.getStats());
  })
  .get("/:id", async (c) => {
    const download = await c.var.service.get(c.req.param("id"));
    if (!download) throw new NotFoundError("Download");
    return c.json(download);
  })
  .post("/", downloadStartRateLimiter, zValidator("json", downloadTorrentDto), async (c) => {
    return c.json(await c.var.service.start(c.req.valid("json")));
  })
  .get("/:id/stream", requireDownloadOwnership, async (c) => {
    const download = await c.var.service.get(requireDownloadId(c));
    if (!download) throw new NotFoundError("Download");

    const streamService = new DownloadStreamService(DOWNLOAD_PATH);
    const result = await streamService.getStreamForDownload(download);
    if (!result) throw new NotFoundError("Video file");

    const { stream: nodeStream, fileName, size, filePath } = result;
    const isMkv = fileName.toLowerCase().endsWith(".mkv");
    const contentType = getContentType(fileName);

    return stream(c, async (honoStream) => {
      honoStream.onAbort(() => {
        if ("destroy" in nodeStream && typeof nodeStream.destroy === "function") {
          nodeStream.destroy();
        }
      });

      if (isMkv && !filePath) {
        const convertedStream = convertMkvToMp4Stream(nodeStream);
        c.header("Content-Type", "video/mp4");
        await honoStream.pipe(Readable.toWeb(convertedStream as Readable));
        return;
      }

      const rangeHeader = c.req.header("range");
      if (filePath && rangeHeader) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

        if (start >= size || end >= size || start > end || start < 0) {
          c.status(416);
          c.header("Content-Range", `bytes */${size}`);
          return;
        }

        const chunkSize = end - start + 1;
        c.status(206);
        c.header("Content-Range", `bytes ${start}-${end}/${size}`);
        c.header("Accept-Ranges", "bytes");
        c.header("Content-Length", chunkSize.toString());
        c.header("Content-Type", contentType);

        const fs = await import("node:fs");
        const rangeStream = fs.createReadStream(filePath, { start, end });
        await honoStream.pipe(Readable.toWeb(rangeStream));
        return;
      }

      c.header("Content-Type", contentType);
      c.header("Content-Length", size.toString());
      c.header("Accept-Ranges", "bytes");
      await honoStream.pipe(Readable.toWeb(nodeStream as Readable));
    });
  })
  .get("/:id/file/:filePath", async (c) => {
    const download = await c.var.service.get(c.req.param("id"));
    if (!download) throw new NotFoundError("Download");

    const filePath = decodeURIComponent(c.req.param("filePath"));
    const path = await import("node:path");
    const fs = await import("node:fs");
    const baseDir = path.resolve(DOWNLOAD_PATH, download.torrent?.name ?? "");
    const fullPath = path.resolve(baseDir, filePath);

    if (!fullPath.startsWith(baseDir + path.sep)) throw new BadRequestError("Invalid file path");
    if (!fs.existsSync(fullPath)) throw new NotFoundError("File");

    let contentType = "application/octet-stream";
    if (filePath.endsWith(".srt")) contentType = "text/plain; charset=utf-8";
    else if (filePath.endsWith(".vtt")) contentType = "text/vtt; charset=utf-8";

    const stats = fs.statSync(fullPath);
    c.header("Content-Type", contentType);
    c.header("Content-Length", stats.size.toString());

    return c.body(Readable.toWeb(fs.createReadStream(fullPath) as Readable));
  })
  .get("/:id/external-subtitles", async (c) => {
    const download = await c.var.service.get(c.req.param("id"));
    if (!download) throw new NotFoundError("Download");

    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const folderPath = path.join(DOWNLOAD_PATH, download.torrent?.name ?? "");

    const torrentFiles = (download.torrent?.files ?? []) as TorrentLiveData["files"];
    const torrentPaths = new Set(
      torrentFiles
        .filter((f) => /\.(srt|vtt)$/i.test(f.path))
        .map((f) => path.join(download.torrent?.name ?? "", f.path).replace(/\\/g, "/")),
    );

    const collected: string[] = [];
    async function scan(dir: string): Promise<void> {
      let entries: Dirent[];
      try {
        entries = (await fs.readdir(dir, { withFileTypes: true })) as Dirent[];
      } catch {
        return;
      }
      for (const e of entries) {
        const full = path.join(dir, e.name);
        const rel = path.relative(DOWNLOAD_PATH, full).replace(/\\/g, "/");
        if (e.isDirectory()) {
          await scan(full);
        } else if (/\.(srt|vtt)$/i.test(e.name) && !torrentPaths.has(rel)) {
          collected.push(rel);
        }
      }
    }

    await scan(folderPath);
    return c.json({ paths: collected });
  })
  .get("/:id/subtitles/:filePath", async (c) => {
    const download = await c.var.service.get(c.req.param("id"));
    if (!download) throw new NotFoundError("Download");

    const filePath = decodeURIComponent(c.req.param("filePath"));
    const lower = filePath.toLowerCase();
    if (!lower.endsWith(".srt") && !lower.endsWith(".vtt")) {
      throw new BadRequestError("Only .srt and .vtt files are supported");
    }

    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const downloadFolder = path.resolve(DOWNLOAD_PATH, download.torrent?.name ?? "");
    const fullPath = path.resolve(downloadFolder, filePath);

    if (!fullPath.startsWith(downloadFolder + path.sep)) throw new BadRequestError("Invalid file path");

    try {
      await fs.access(fullPath);
    } catch {
      throw new NotFoundError("Subtitle file");
    }

    const iconv = await import("iconv-lite");
    const buffer = await fs.readFile(fullPath);

    let content: string;
    try {
      content = iconv.default.decode(buffer, "utf-8");
      if (content.includes("\ufffd")) throw new Error("Invalid UTF-8");
    } catch {
      content = iconv.default.decode(buffer, "win1252");
    }

    const vttContent = lower.endsWith(".vtt") ? content : srt2webvtt(content);

    c.header("Content-Type", "text/vtt; charset=utf-8");
    c.header("Access-Control-Allow-Origin", process.env.WEB_URL || "");
    c.header("Access-Control-Allow-Methods", "GET");
    c.header("Cache-Control", "public, max-age=3600");

    return c.text(vttContent);
  })
  .post("/:id/pause", requireDownloadOwnership, async (c) => {
    return c.json(await c.var.service.pause(requireDownloadId(c)));
  })
  .post("/:id/resume", requireDownloadOwnership, async (c) => {
    return c.json(await c.var.service.resume(requireDownloadId(c)));
  })
  .delete("/:id", requireDownloadOwnership, async (c) => {
    return c.json(await c.var.service.delete(requireDownloadId(c)));
  });
