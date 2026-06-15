import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { errorHandler, requestLogger } from "@/middlewares/logger.middleware";
import * as fs from "node:fs/promises";
import { Readable } from "node:stream";
import { getLogFilePath, logger, startupLogger } from "./helpers/logger.helper";
import { activityLogRoutes } from "./modules/activity-log/activity-log.route";
import { authRoutes } from "./modules/auth/auth.route";
import { downloadRoutes } from "./modules/download/download.route";
import { torrentClient } from "./modules/download/webtorrent.client";
import { indexerManagerRoutes } from "./modules/indexer-manager/indexer-manager.route";
import { mediaRoutes } from "./modules/media/media.route";
import { movieRoutes } from "./modules/movie/movie.route";
import { subtitleRoutes } from "./modules/subtitle/subtitle.route";
import { torrentRoutes } from "./modules/torrent/torrent.route";
import { tvRoutes } from "./modules/tv/tv.route";
import { userRoutes } from "./modules/user/user.route";
import type { HonoVariables } from "./types/hono";

const startTime = Date.now();
if (!process.env.WEB_URL) throw new Error("WEB_URL is not set");

export const app = new Hono<{ Variables: HonoVariables }>()
  .use("*", requestLogger)
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
  .get("/logs/export", async (c) => {
    const fsSync = await import("node:fs");
    const filePath = getLogFilePath();
    if (!fsSync.existsSync(filePath)) return c.json({ error: "No log file found" }, 404);
    const stat = fsSync.statSync(filePath);
    c.header("Content-Type", "application/octet-stream");
    c.header("Content-Disposition", "attachment; filename=seedarr.log");
    c.header("Content-Length", stat.size.toString());
    return c.body(Readable.toWeb(fsSync.createReadStream(filePath)) as ReadableStream);
  })
  .get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

export type AppType = typeof app;

const start = async () => {
  // Create downloads directory if it doesn't exist
  const downloadsPath = process.env.DOWNLOADS_PATH || "./downloads";
  await fs.mkdir(downloadsPath, { recursive: true });
  logger.info("STARTUP", `Downloads directory: ${downloadsPath}`);

  torrentClient.initialize(downloadsPath).catch((error) => {
    logger.error("STARTUP", "WebTorrent initialization failed:", error);
  });

  if (!process.env.API_PORT) logger.warn("STARTUP", "API_PORT is not set, using default 3002");

  const port = Number.parseInt(process.env.API_PORT || "3002", 10);

  serve({
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  });

  startupLogger(startTime, port);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
