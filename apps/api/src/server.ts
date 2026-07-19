import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";

import * as fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./app";
import { logger, startupLogger } from "./helpers/logger.helper";
import { torrentClient } from "./modules/download/webtorrent.client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const startTime = Date.now();
/** Docker: /app/web/dist — local prod: apps/api/../web/dist via dist-server layout */
const WEB_DIST_PATH = process.env.WEB_DIST_PATH || path.resolve(__dirname, "../web/dist");

const serverApp =
  process.env.NODE_ENV === "production"
    ? app.use("*", serveStatic({ root: WEB_DIST_PATH })).get("*", async (c) => {
        const fsSync = await import("node:fs");
        const indexPath = path.join(WEB_DIST_PATH, "index.html");
        if (!fsSync.existsSync(indexPath)) return c.json({ error: "Frontend not found" }, 404);
        const html = fsSync.readFileSync(indexPath, "utf-8");
        return c.html(html);
      })
    : app;

const start = async () => {
  const downloadsPath = process.env.DOWNLOADS_PATH || "./downloads";
  await fs.mkdir(downloadsPath, { recursive: true });
  logger.info("STARTUP", `Downloads directory: ${downloadsPath}`);

  torrentClient.initialize(downloadsPath).catch((error) => {
    logger.error("STARTUP", "WebTorrent initialization failed:", error);
  });

  if (!process.env.API_PORT) logger.warn("STARTUP", "API_PORT is not set, using default 3002");

  const port = Number.parseInt(process.env.API_PORT || "3002", 10);

  serve({
    fetch: serverApp.fetch,
    port,
    hostname: "0.0.0.0",
  });

  startupLogger(startTime, port);
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
