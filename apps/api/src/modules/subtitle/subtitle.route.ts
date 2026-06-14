import { zValidator } from "@hono/zod-validator";

import { ForbiddenError, NotFoundError } from "@/errors/error";
import { DownloadService } from "@/modules/download/download.service";
import { SubtitleService } from "@/modules/subtitle/subtitle.service";
import * as path from "node:path";
import { downloadSubtitleDto, substitlesSearchDto } from "./subtitle.dto";

const DOWNLOAD_PATH = process.env.DOWNLOADS_PATH || "./downloads";

export const subtitleRoutes = SubtitleService.createRouter()
  .get("/search", zValidator("query", substitlesSearchDto), async (c) => {
    return c.json(await c.var.service.search(c.req.valid("query")));
  })
  .post("/download", zValidator("json", downloadSubtitleDto), async (c) => {
    const { downloadId, url, language, mediaTitle } = c.req.valid("json");
    const user = c.get("user");

    // TODO: pass in the method of the service
    const download = await new DownloadService(user).get(downloadId);
    if (!download) throw new NotFoundError("Download");
    if (download.userId !== user.id && !["owner", "admin"].includes(user.role)) {
      throw new ForbiddenError("Unauthorized to add subtitles to this download");
    }

    const downloadFolderPath = path.join(DOWNLOAD_PATH, download.torrent?.name ?? "");
    const { relativePath } = await c.var.service.download(downloadFolderPath, url, language, mediaTitle);
    return c.json({ relativePath });
  });
