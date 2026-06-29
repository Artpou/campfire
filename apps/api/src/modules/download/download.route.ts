import { zValidator } from "@hono/zod-validator";
import { stream } from "hono/streaming";

import { BadRequestError, NotFoundError } from "@/errors/error";
import { downloadFilePathParamDto, stringIdParamDto } from "@/helpers/param.dto";
import { getDownloadsRoot, resolveWithinDownloads } from "@/helpers/path.helper";
import { pipeNodeStream, toWebStream } from "@/helpers/stream.helper";
import { srt2webvtt } from "@/helpers/subtitle.helper";
import { convertToFragmentedMp4Stream, getVideoInputFormat, shouldTranscodeForPlayback } from "@/helpers/video.helper";
import { downloadStartRateLimiter } from "@/middlewares/rate-limiter.middleware";
import type { Dirent } from "node:fs";
import { downloadTorrentDto } from "./download.dto";
import { requireDownloadOwnership } from "./download.guard";
import type { TorrentLiveData } from "./download.schema";
import { DownloadService } from "./download.service";
import { DownloadStreamService } from "./download-stream.service";

function getDownloadId(c: { req: { valid: (target: "param") => { id: string } } }): string {
  return c.req.valid("param").id;
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
  .get("/", async (c) => {
    return c.json(await c.var.service.getMany());
  })
  .get("/stats", async (c) => {
    return c.json(await c.var.service.getStats());
  })
  .get("/:id", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    const download = await c.var.service.get(id);
    if (!download) throw new NotFoundError("Download");
    return c.json(download);
  })
  .post("/", downloadStartRateLimiter, zValidator("json", downloadTorrentDto), async (c) => {
    return c.json(await c.var.service.start(c.req.valid("json")));
  })
  .get("/:id/stream", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    const download = await c.var.service.get(getDownloadId(c));
    if (!download) throw new NotFoundError("Download");

    const streamService = new DownloadStreamService();
    const result = await streamService.getStreamForDownload(download);
    if (!result) throw new NotFoundError("Video file");

    const { stream: nodeStream, fileName, size, filePath, torrentFile } = result;
    const contentType = getContentType(fileName);
    const useTranscodedStream = shouldTranscodeForPlayback(fileName);

    return stream(c, async (honoStream) => {
      let destroyTranscode: (() => void) | undefined;

      const cleanup = (): void => {
        destroyTranscode?.();
        if ("destroy" in nodeStream && typeof nodeStream.destroy === "function") {
          nodeStream.destroy();
        }
      };

      honoStream.onAbort(cleanup);

      if (useTranscodedStream) {
        const transcoded = convertToFragmentedMp4Stream(nodeStream, getVideoInputFormat(fileName));
        destroyTranscode = transcoded.destroy;
        c.header("Content-Type", "video/mp4");
        await pipeNodeStream(honoStream, transcoded.stream);
        return;
      }

      const rangeHeader = c.req.header("range");
      if (rangeHeader && (torrentFile || filePath)) {
        const parts = rangeHeader.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

        if (start >= size || end >= size || start > end || start < 0) {
          c.status(416);
          c.header("Content-Range", `bytes */${size}`);
          return;
        }

        c.status(206);
        c.header("Content-Range", `bytes ${start}-${end}/${size}`);
        c.header("Accept-Ranges", "bytes");
        c.header("Content-Length", String(end - start + 1));
        c.header("Content-Type", contentType);

        const rangeStream = torrentFile
          ? torrentFile.createReadStream({ start, end })
          : (await import("node:fs")).createReadStream(filePath as string, { start, end });
        await pipeNodeStream(honoStream, rangeStream);
        return;
      }

      c.header("Content-Type", contentType);
      c.header("Content-Length", size.toString());
      c.header("Accept-Ranges", "bytes");
      await pipeNodeStream(honoStream, nodeStream);
    });
  })
  .get("/:id/file/:filePath", zValidator("param", downloadFilePathParamDto), async (c) => {
    const { id, filePath: rawFilePath } = c.req.valid("param");
    const download = await c.var.service.get(id);
    if (!download) throw new NotFoundError("Download");

    const filePath = decodeURIComponent(rawFilePath);
    const fs = await import("node:fs");
    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "", filePath);

    if (!fs.existsSync(fullPath)) throw new NotFoundError("File");

    let contentType = "application/octet-stream";
    if (filePath.endsWith(".srt")) contentType = "text/plain; charset=utf-8";
    else if (filePath.endsWith(".vtt")) contentType = "text/vtt; charset=utf-8";

    const stats = fs.statSync(fullPath);
    c.header("Content-Type", contentType);
    c.header("Content-Length", stats.size.toString());

    return c.body(toWebStream(fs.createReadStream(fullPath)));
  })
  .get("/:id/external-subtitles", zValidator("param", stringIdParamDto), async (c) => {
    const { id } = c.req.valid("param");
    const download = await c.var.service.get(id);
    if (!download) throw new NotFoundError("Download");

    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const downloadsRoot = getDownloadsRoot();
    const folderPath = resolveWithinDownloads(download.torrent?.name ?? "");

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
        const rel = path.relative(downloadsRoot, full).replace(/\\/g, "/");
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
  .get("/:id/subtitles/:filePath", zValidator("param", downloadFilePathParamDto), async (c) => {
    const { id, filePath: rawFilePath } = c.req.valid("param");
    const download = await c.var.service.get(id);
    if (!download) throw new NotFoundError("Download");

    const filePath = decodeURIComponent(rawFilePath);
    const lower = filePath.toLowerCase();
    if (!lower.endsWith(".srt") && !lower.endsWith(".vtt")) {
      throw new BadRequestError("Only .srt and .vtt files are supported");
    }

    const fs = await import("node:fs/promises");
    const fullPath = resolveWithinDownloads(download.torrent?.name ?? "", filePath);

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
  .post("/:id/pause", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    return c.json(await c.var.service.pause(getDownloadId(c)));
  })
  .post("/:id/resume", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    return c.json(await c.var.service.resume(getDownloadId(c)));
  })
  .delete("/:id", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    return c.json(await c.var.service.delete(getDownloadId(c)));
  });
