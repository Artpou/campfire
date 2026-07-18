import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { csrfGuard } from "@/middlewares/csrf.middleware";
import { errorHandler } from "@/middlewares/error.middleware";
import { requestLogger } from "@/middlewares/logger.middleware";
import { authGuard } from "@/modules/auth/auth.guard";
import { requireRole } from "@/modules/auth/role.guard";
import { Readable } from "node:stream";
import { getLogFilePath } from "./helpers/logger.helper";
import { activityLogRoutes } from "./modules/activity-log/activity-log.route";
import { authRoutes } from "./modules/auth/auth.route";
import { downloadRoutes } from "./modules/download/download.route";
import { indexerManagerRoutes } from "./modules/indexer-manager/indexer-manager.route";
import { mediaRoutes } from "./modules/media/media.route";
import { movieRoutes } from "./modules/movie/movie.route";
import { storageConfigRoutes } from "./modules/storage-config/storage-config.route";
import { subtitleRoutes } from "./modules/subtitle/subtitle.route";
import { torrentRoutes } from "./modules/torrent/torrent.route";
import { tvRoutes } from "./modules/tv/tv.route";
import { userRoutes } from "./modules/user/user.route";
import type { HonoVariables } from "./types/hono";

if (!process.env.WEB_URL) throw new Error("WEB_URL is not set");

export const app = new Hono<{ Variables: HonoVariables }>()
  .use("*", requestLogger)
  .use("*", secureHeaders())
  .use("*", csrfGuard)
  .onError(errorHandler)
  .use(
    "*",
    cors({
      origin: process.env.WEB_URL,
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "Cookie"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      exposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges"],
      maxAge: 600,
    }),
  )
  .route("/auth", authRoutes)
  .route("/users", userRoutes)
  .route("/indexer-manager", indexerManagerRoutes)
  .route("/media", mediaRoutes)
  .route("/movies", movieRoutes)
  .route("/tv", tvRoutes)
  .route("/torrents", torrentRoutes)
  .route("/downloads", downloadRoutes)
  .route("/subtitles", subtitleRoutes)
  .route("/activity-logs", activityLogRoutes)
  .route("/storage-config", storageConfigRoutes)
  .get("/logs/export", authGuard, requireRole("admin"), async (c) => {
    const fsSync = await import("node:fs");
    const filePath = getLogFilePath();
    if (!fsSync.existsSync(filePath)) return c.json({ error: "No log file found" }, 404);
    const stat = fsSync.statSync(filePath);
    c.header("Content-Type", "application/octet-stream");
    c.header("Content-Disposition", "attachment; filename=seedarr.log");
    c.header("Content-Length", stat.size.toString());
    return c.body(Readable.toWeb(fsSync.createReadStream(filePath)) as ReadableStream);
  })
  .get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }))
  .get("/version", (c) =>
    c.json({
      version: process.env.SEEDARR_VERSION ?? "dev",
      channel: process.env.SEEDARR_CHANNEL ?? "development",
    }),
  );

export type AppType = typeof app;
