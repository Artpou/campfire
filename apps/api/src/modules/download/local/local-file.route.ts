import { zValidator } from "@hono/zod-validator";
import { downloadFileQueryDto, stringIdParamDto } from "@seedarr/contracts";
import { type Context, Hono } from "hono";
import { stream } from "hono/streaming";

import { pipeNodeStream } from "@/shared/helpers/stream.helper";

import { assertDownloadFileToken, getDownloadableFile, openDownloadableReadStream } from "./local-file.helper";

async function streamDownloadFile(c: Context, id: string): Promise<Response> {
  const file = await getDownloadableFile(id);

  const encodedName = encodeURIComponent(file.fileName).replace(/['()]/g, encodeURIComponent);
  c.header("Content-Type", "application/octet-stream");
  c.header("Content-Disposition", `attachment; filename="${file.fileName}"; filename*=UTF-8''${encodedName}`);
  c.header("Content-Length", String(file.size));
  c.header("X-Content-Type-Options", "nosniff");
  // Short-lived HMAC token in query is required for native browser downloads; limit Referer leakage.
  c.header("Referrer-Policy", "no-referrer");

  const opened = await openDownloadableReadStream(file);
  if (opened.cleanup) c.req.raw.signal.addEventListener("abort", opened.cleanup);
  return stream(c, async (honoStream) => {
    try {
      await pipeNodeStream(honoStream, opened.stream);
    } finally {
      opened.cleanup?.();
    }
  });
}

/**
 * Token-only file download (no session) so the browser can use its native download UI.
 * Cannot use AuthenticatedService.createRouter — auth is HMAC token, not cookie session.
 */
export const localFileRoutes = new Hono().get(
  "/:id",
  zValidator("param", stringIdParamDto),
  zValidator("query", downloadFileQueryDto),
  async (c) => {
    const { id } = c.req.valid("param");
    const { token } = c.req.valid("query");
    assertDownloadFileToken(token, id);

    return streamDownloadFile(c, id);
  },
);
