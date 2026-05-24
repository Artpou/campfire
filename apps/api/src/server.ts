import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { errorHandler, requestLogger } from "@/middlewares/logger.middleware";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { startupLogger } from "./helpers/logger.helper";
import { authRoutes } from "./modules/auth/auth.route";
import { downloadRoutes } from "./modules/download/download.route";
import { WebTorrentClient } from "./modules/download/webtorrent.client";
import { freeboxRoutes } from "./modules/freebox/freebox.route";
import { indexerManagerRoutes } from "./modules/indexer-manager/indexer-manager.route";
import { mediaRoutes } from "./modules/media/media.route";
import { plexRoutes } from "./modules/plex/plex.route";
import { subtitleRoutes } from "./modules/subtitle/subtitle.route";
import { torrentRoutes } from "./modules/torrent/torrent.route";
import { userRoutes } from "./modules/user/user.route";
import type { HonoVariables } from "./types/hono";

const startTime = Date.now();

// Store request start times

export const app = new Hono<{ Variables: HonoVariables }>()
  .use("*", requestLogger)
  .onError(errorHandler)
  .use(
    "*",
    cors({
      origin: process.env.NODE_ENV === "production" ? "*" : "http://localhost:3000",
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "Cookie"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      exposeHeaders: ["Content-Length", "Content-Range", "Accept-Ranges"],
      maxAge: 600,
    }),
  )
  .route("/auth", authRoutes)
  .route("/users", userRoutes)
  .route("/freebox", freeboxRoutes)
  .route("/indexer-manager", indexerManagerRoutes)
  .route("/media", mediaRoutes)
  .route("/torrents", torrentRoutes)
  .route("/downloads", downloadRoutes)
  .route("/subtitles", subtitleRoutes)
  .route("/plex", plexRoutes)
  .get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }))
  .use(
    "/*",
    serveStatic({
      root: path.join(process.cwd(), "../web/dist"),
      rewriteRequestPath: (reqPath) => reqPath.replace(/^\//, ""),
    }),
  )
  .get("/*", async (c) => {
    // Catch-all for SPA routing - serve index.html for non-API routes
    const indexPath = path.join(process.cwd(), "../web/dist/index.html");
    try {
      const indexContent = await fs.readFile(indexPath, "utf-8");
      return c.html(indexContent);
    } catch {
      return c.notFound();
    }
  });

export type AppType = typeof app;

const start = async () => {
  // Create downloads directory if it doesn't exist
  const downloadsPath = process.env.DOWNLOADS_PATH || "./downloads";
  await fs.mkdir(downloadsPath, { recursive: true });
  console.log(`[STARTUP] Downloads directory: ${downloadsPath}`);

  WebTorrentClient.initialize(downloadsPath).catch((error) => {
    console.error("[STARTUP] ✗ WebTorrent initialization failed:", error);
  });

  if (!process.env.API_PORT) console.log("API_PORT is not set, using default 3002");

  const port = parseInt(process.env.API_PORT || "3002", 10);
  console.log(`[STARTUP] About to listen on port ${port}`);

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
