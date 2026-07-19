import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./app";
import { logger, startupLogger } from "./helpers/logger.helper";
import { torrentClient } from "./modules/download/webtorrent.client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const startTime = Date.now();
/** Docker: /app/web/dist — local prod: apps/api/../web/dist via dist-server layout */
const WEB_DIST_PATH = process.env.WEB_DIST_PATH || path.resolve(__dirname, "../web/dist");

function readFrontendIndex(): string | null {
  const indexPath = path.join(WEB_DIST_PATH, "index.html");
  if (!fs.existsSync(indexPath)) return null;
  return fs.readFileSync(indexPath, "utf-8");
}

/** Browser page loads (reload / typed URL), not XHR/fetch from the SPA. */
function isSpaDocumentRequest(method: string, headers: Headers): boolean {
  if (method !== "GET") return false;
  if (headers.get("Sec-Fetch-Dest") === "document") return true;
  const accept = headers.get("Accept") ?? "";
  return accept.startsWith("text/html");
}

function createProductionApp(): Hono {
  return new Hono()
    .use("*", async (c, next) => {
      if (!isSpaDocumentRequest(c.req.method, c.req.raw.headers)) {
        await next();
        return;
      }
      const html = readFrontendIndex();
      if (!html) return c.json({ error: "Frontend not found" }, 404);
      return c.html(html);
    })
    .route("/", app)
    .use("*", serveStatic({ root: WEB_DIST_PATH }))
    .get("*", async (c) => {
      const html = readFrontendIndex();
      if (!html) return c.json({ error: "Frontend not found" }, 404);
      return c.html(html);
    });
}

const serverApp = process.env.NODE_ENV === "production" ? createProductionApp() : app;

const start = async () => {
  if (process.env.NODE_ENV === "production") {
    const indexPath = path.join(WEB_DIST_PATH, "index.html");
    if (fs.existsSync(indexPath)) {
      logger.info("STARTUP", `Frontend: ${WEB_DIST_PATH}`);
    } else {
      logger.error("STARTUP", `Frontend not found at ${indexPath}`);
    }
  }

  const downloadsPath = process.env.DOWNLOADS_PATH || "./downloads";
  await fsPromises.mkdir(downloadsPath, { recursive: true });
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
