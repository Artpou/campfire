import { zValidator } from "@hono/zod-validator";
import { downloadFileQueryDto, stringIdParamDto } from "@seedarr/contracts";
import { type Context, Hono } from "hono";
import { stream } from "hono/streaming";

import { NotFoundError, UnauthorizedError } from "@/shared/errors/error";
import { pipeNodeStream } from "@/shared/helpers/stream.helper";

import { verifyToken } from "@/modules/storage-config/crypto.helper";
import { remoteStorageService } from "@/modules/storage-config/remote-storage.service";
import { getDownloadableFile } from "./local-file.helper";

async function streamDownloadFile(c: Context, id: string): Promise<Response> {
  const { fileName, size, filePath, remotePath } = await getDownloadableFile(id);

  const encodedName = encodeURIComponent(fileName).replace(/['()]/g, encodeURIComponent);
  c.header("Content-Type", "application/octet-stream");
  c.header("Content-Disposition", `attachment; filename="${fileName}"; filename*=UTF-8''${encodedName}`);
  c.header("Content-Length", String(size));
  c.header("X-Content-Type-Options", "nosniff");

  if (filePath) {
    const fsSync = await import("node:fs");
    const localStream = fsSync.createReadStream(filePath);
    return stream(c, async (honoStream) => {
      await pipeNodeStream(honoStream, localStream);
    });
  }

  if (!remotePath) throw new NotFoundError("Downloadable file");
  const remote = await remoteStorageService.createReadStream(remotePath);
  if (!remote) throw new NotFoundError("Downloadable file");
  if (remote.cleanup) c.req.raw.signal.addEventListener("abort", remote.cleanup);
  return stream(c, async (honoStream) => {
    try {
      await pipeNodeStream(honoStream, remote.stream as NodeJS.ReadableStream);
    } finally {
      remote.cleanup?.();
    }
  });
}

/** Token-only file download (no session) so the browser can use its native download UI. */
export const localFileRoutes = new Hono().get(
  "/:id",
  zValidator("param", stringIdParamDto),
  zValidator("query", downloadFileQueryDto),
  async (c) => {
    const { id } = c.req.valid("param");
    const { token } = c.req.valid("query");
    const payload = verifyToken<{ downloadId: string; userId: string }>(token);
    if (!payload || payload.downloadId !== id || typeof payload.userId !== "string") {
      throw new UnauthorizedError("Invalid or expired download token");
    }

    return streamDownloadFile(c, id);
  },
);
