import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { stream } from "hono/streaming";

import { srt2webvtt } from "@/helpers/subtitle.helper";
import { convertMkvToMp4Stream } from "@/helpers/video.helper";
import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import type { HonoVariables } from "@/types/hono";
import { Readable } from "node:stream";
import { downloadTorrentSchema } from "./download.dto";
import { requireDownloadOwnership } from "./download.guard";
import { DownloadService } from "./download.service";
import { DownloadStreamService } from "./download-stream.service";

// Helper: Determine content type from file extension
function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase();
  if (ext.endsWith(".webm")) return "video/webm";
  if (ext.endsWith(".avi")) return "video/x-msvideo";
  if (ext.endsWith(".mov")) return "video/quicktime";
  if (ext.endsWith(".mkv")) return "video/x-matroska";
  return "video/mp4";
}

export const downloadRoutes = new Hono<{ Variables: HonoVariables }>()
  .use("*", authGuard)
  .use("*", requireRole("member"))
  .post("/", zValidator("json", downloadTorrentSchema), async (c) => {
    return c.json(await DownloadService.fromContext(c).start(c.req.valid("json")));
  })
  .get("/", async (c) => {
    return c.json(await DownloadService.fromContext(c).list());
  })
  .get("/:id", async (c) => {
    const download = await DownloadService.fromContext(c).getById(c.req.param("id"));
    if (!download) throw new Error("Download not found");
    return c.json(download);
  })
  .get("/:id/stream", async (c) => {
    const downloadPath = process.env.DOWNLOADS_PATH || "./downloads";
    const streamService = new DownloadStreamService(downloadPath);
    const result = await streamService.getStreamForDownload(c.req.param("id"));

    if (!result) return c.json({ error: "No video file available" }, 404);

    const { stream: nodeStream, fileName, size, filePath } = result;
    const isMkv = fileName.toLowerCase().endsWith(".mkv");
    const contentType = getContentType(fileName);

    return stream(c, async (honoStream) => {
      honoStream.onAbort(() => {
        // biome-ignore lint/suspicious/noExplicitAny: nodeStream is any
        (nodeStream as any).destroy?.();
      });

      // Mkv no seeking
      if (isMkv && !filePath) {
        const convertedStream = convertMkvToMp4Stream(nodeStream);
        c.header("Content-Type", "video/mp4");
        await honoStream.pipe(Readable.toWeb(convertedStream as Readable));
        return;
      }

      // File with range request (seeking possible)
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

        // Create a new disk stream for the specific range
        const fs = await import("node:fs");
        const rangeStream = fs.createReadStream(filePath, { start, end });
        await honoStream.pipe(Readable.toWeb(rangeStream));
        return;
      }

      // File without range
      c.header("Content-Type", contentType);
      c.header("Content-Length", size.toString());
      c.header("Accept-Ranges", "bytes");
      await honoStream.pipe(Readable.toWeb(nodeStream as Readable));
    });
  })
  .get("/:id/file/:filePath", async (c) => {
    const id = c.req.param("id");
    const filePath = decodeURIComponent(c.req.param("filePath"));

    const downloadPath = process.env.DOWNLOADS_PATH || "./downloads";
    const download = await DownloadService.fromContext(c).getById(id);

    if (!download) {
      return c.json({ error: "Download not found" }, 404);
    }

    // Construct full path
    const path = await import("node:path");
    const fs = await import("node:fs");
    const fullPath = path.join(downloadPath, download.savePath || download.name, filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return c.json({ error: "File not found" }, 404);
    }

    // Determine content type
    let contentType = "application/octet-stream";
    if (filePath.endsWith(".srt")) {
      contentType = "text/plain; charset=utf-8";
    } else if (filePath.endsWith(".vtt")) {
      contentType = "text/vtt; charset=utf-8";
    }

    const fileStream = fs.createReadStream(fullPath);
    const stats = fs.statSync(fullPath);

    c.header("Content-Type", contentType);
    c.header("Content-Length", stats.size.toString());

    return c.body(Readable.toWeb(fileStream as Readable));
  })
  .get("/:id/subtitles/:filePath", async (c) => {
    const id = c.req.param("id");
    const filePath = decodeURIComponent(c.req.param("filePath"));

    const downloadPath = process.env.DOWNLOADS_PATH || "./downloads";
    const download = await DownloadService.fromContext(c).getById(id);

    if (!download) {
      return c.json({ error: "Download not found" }, 404);
    }

    // Construct full path
    const path = await import("node:path");
    const fs = await import("node:fs/promises");
    const fullPath = path.join(downloadPath, filePath);
    console.log("fullPath", fullPath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return c.json({ error: "Subtitle file not found" }, 404);
    }

    // Only handle .srt files (convert to VTT)
    if (!filePath.toLowerCase().endsWith(".srt")) {
      return c.json({ error: "Only .srt files are supported" }, 400);
    }

    // Read file as buffer for encoding detection
    const iconv = await import("iconv-lite");
    const buffer = await fs.readFile(fullPath);

    // Try UTF-8 first, fallback to Windows-1252 for French accents
    let content: string;
    try {
      content = iconv.default.decode(buffer, "utf-8");
      // Check for common encoding artifacts
      if (content.includes("�") || content.includes("\ufffd")) {
        throw new Error("Invalid UTF-8");
      }
    } catch {
      // Fallback to Windows-1252 (common for French subtitles)
      content = iconv.default.decode(buffer, "win1252");
    }

    // Convert SRT to WebVTT
    const vttContent = srt2webvtt(content);

    // Set proper headers with CORS
    c.header("Content-Type", "text/vtt; charset=utf-8");
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET");
    c.header("Cache-Control", "public, max-age=3600");

    return c.text(vttContent);
  })
  // Protected routes
  .post("/:id/pause", requireDownloadOwnership, async (c) => {
    await DownloadService.fromContext(c).pause(c.req.param("id"));
    return c.json({ success: true });
  })
  .post("/:id/resume", requireDownloadOwnership, async (c) => {
    await DownloadService.fromContext(c).resume(c.req.param("id"));
    return c.json({ success: true });
  })
  .delete("/:id", requireDownloadOwnership, async (c) => {
    await DownloadService.fromContext(c).delete(c.req.param("id"));
    return c.json({ success: true });
  });

export type DownloadRoutesType = typeof downloadRoutes;
