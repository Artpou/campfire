import { zValidator } from "@hono/zod-validator";
import { stream } from "hono/streaming";

import { BadRequestError, NotFoundError } from "@/errors/error";
import { downloadFilePathParamDto, stringIdParamDto } from "@/helpers/param.dto";
import { getDownloadsRoot, resolveWithinDownloads } from "@/helpers/path.helper";
import { pipeNodeStream, toWebStream } from "@/helpers/stream.helper";
import { srt2webvtt } from "@/helpers/subtitle.helper";
import { convertToFragmentedMp4Stream, getVideoInputFormat, shouldTranscodeForPlayback } from "@/helpers/video.helper";
import { downloadStartRateLimiter } from "@/middlewares/rate-limiter.middleware";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";
import type { Dirent } from "node:fs";
import { downloadTorrentDto, transferDownloadDto } from "./download.dto";
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
    const result = await c.var.service.start(c.req.valid("json"));
    if ("status" in result && result.status === "REMOTE_UNAVAILABLE") {
      return c.json({ status: "REMOTE_UNAVAILABLE", error: "Remote storage server is unavailable" }, 409);
    }
    return c.json(result);
  })
  .get("/:id/stream", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    const download = await c.var.service.get(getDownloadId(c));
    if (!download) throw new NotFoundError("Download");

    if (download.storageLocation === "REMOTE" && !download.torrent?.done) {
      const deleteLocal = await remoteStorageService.shouldDeleteLocalAfterTransfer();
      if (deleteLocal) {
        throw new BadRequestError("Streaming is unavailable while the file is being downloaded to remote storage");
      }
    }

    const streamService = new DownloadStreamService();
    const result = await streamService.getStreamForDownload(download);
    if (!result) throw new NotFoundError("Video file");

    const { fileName, size, filePath, torrentFile } = result;
    const contentType = getContentType(fileName);
    const useTranscodedStream = shouldTranscodeForPlayback(fileName);

    const rangeHeader = c.req.header("range");
    let range: { start: number; end: number } | undefined;

    // Headers must be set before stream() — the response body is locked once created.
    if (useTranscodedStream) {
      c.header("Content-Type", "video/mp4");
    } else if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : size - 1;

      if (Number.isNaN(start) || start >= size || end >= size || start > end || start < 0) {
        c.status(416);
        c.header("Content-Range", `bytes */${size}`);
        return c.body(null);
      }

      range = { start, end };
      c.status(206);
      c.header("Content-Range", `bytes ${start}-${end}/${size}`);
      c.header("Accept-Ranges", "bytes");
      c.header("Content-Length", String(end - start + 1));
      c.header("Content-Type", contentType);
    } else {
      c.header("Content-Type", contentType);
      c.header("Content-Length", size.toString());
      c.header("Accept-Ranges", "bytes");
    }

    return stream(c, async (honoStream) => {
      let destroyTranscode: (() => void) | undefined;
      let activeStream: NodeJS.ReadableStream | undefined;

      const cleanup = (): void => {
        destroyTranscode?.();
        if (activeStream && "destroy" in activeStream && typeof activeStream.destroy === "function") {
          activeStream.destroy();
        }
      };

      honoStream.onAbort(cleanup);

      const openSourceStream = async (): Promise<NodeJS.ReadableStream> => {
        if (torrentFile) {
          return range ? torrentFile.createReadStream(range) : torrentFile.createReadStream();
        }
        if (filePath) {
          return range
            ? (await import("node:fs")).createReadStream(filePath, range)
            : (await import("node:fs")).createReadStream(filePath);
        }
        return result.stream;
      };

      const source = await openSourceStream();
      activeStream = source;

      if (useTranscodedStream) {
        const transcoded = convertToFragmentedMp4Stream(source, getVideoInputFormat(fileName));
        destroyTranscode = transcoded.destroy;
        activeStream = transcoded.stream;
        await pipeNodeStream(honoStream, transcoded.stream);
        return;
      }

      await pipeNodeStream(honoStream, source);
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
  .post(
    "/:id/transfer",
    zValidator("param", stringIdParamDto),
    requireDownloadOwnership,
    zValidator("json", transferDownloadDto),
    async (c) => {
      const result = await c.var.service.transfer(getDownloadId(c), c.req.valid("json"));
      if ("status" in result && result.status === "ALREADY_EXISTS") {
        return c.json(
          { status: "ALREADY_EXISTS", error: "A file with this name already exists on the remote server" },
          409,
        );
      }
      return c.json(result);
    },
  )
  .delete("/:id", zValidator("param", stringIdParamDto), requireDownloadOwnership, async (c) => {
    return c.json(await c.var.service.delete(getDownloadId(c)));
  });
