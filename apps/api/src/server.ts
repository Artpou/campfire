import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";

import * as fs from "node:fs";
import * as fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app } from "./app";
import { ensureDbPragmas } from "./db/db";
import { torrentClient } from "./modules/download/webtorrent/webtorrent-manager";
import { restoreActiveTorrents, stopHealthCheck } from "./modules/download/webtorrent/webtorrent-sync";
import { logger, startupLogger } from "./shared/helpers/logger.helper";

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
function isSpaDocumentRequest(method: string, pathname: string, headers: Headers): boolean {
  if (method !== "GET") return false;
  // `/modules/subdl.webp` must not be treated as a client route — it collides with API `/modules/:id`.
  if (path.extname(pathname)) return false;
  if (headers.get("Sec-Fetch-Dest") === "document") return true;
  const accept = headers.get("Accept") ?? "";
  return accept.startsWith("text/html");
}

function createProductionApp(): Hono {
  return new Hono()
    .use("*", async (c, next) => {
      const pathname = new URL(c.req.url).pathname;
      if (!isSpaDocumentRequest(c.req.method, pathname, c.req.raw.headers)) {
        await next();
        return;
      }
      const html = readFrontendIndex();
      if (!html) return c.json({ error: "Frontend not found" }, 404);
      return c.html(html);
    })
    .use(
      "*",
      serveStatic({
        root: WEB_DIST_PATH,
        // Serve hashed Vite assets and public files (module logos, favicon) before API routes.
        onFound: (filePath, c) => {
          if (filePath.includes(`${path.sep}assets${path.sep}`) || filePath.includes("/assets/")) {
            c.header("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    )
    .route("/", app)
    .get("*", async (c) => {
      const html = readFrontendIndex();
      if (!html) return c.json({ error: "Frontend not found" }, 404);
      return c.html(html);
    });
}

const serverApp = process.env.NODE_ENV === "production" ? createProductionApp() : app;

const start = async () => {
  await ensureDbPragmas();

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

  const { getAvatarsRoot } = await import("./shared/helpers/path.helper");
  const avatarsPath = getAvatarsRoot();
  await fsPromises.mkdir(avatarsPath, { recursive: true });

  try {
    const { ensureSystemModules } = await import("./modules/module/module.seed");
    await ensureSystemModules();
  } catch (error) {
    logger.error("STARTUP", "Module migration failed:", error);
  }

  torrentClient
    .initialize()
    .then(() => {
      const resumeDisabled = process.env.RESUME_DOWNLOADS === "false";
      if (!resumeDisabled) {
        restoreActiveTorrents().catch((error) => {
          logger.error("STARTUP", "Failed to restore torrents:", error);
        });
      }
    })
    .catch((error) => {
      logger.error("STARTUP", "WebTorrent initialization failed:", error);
    });

  if (!process.env.API_PORT) logger.warn("STARTUP", "API_PORT is not set, using default 3002");

  const port = Number.parseInt(process.env.API_PORT || "3002", 10);

  serve({
    fetch: serverApp.fetch,
    port,
    hostname: "0.0.0.0",
  });

  startupLogger({ startTime, port, downloadsPath });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

let shuttingDown = false;
function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info("SHUTDOWN", `Received ${signal}, shutting down...`);
  stopHealthCheck();
  torrentClient
    .destroy()
    .then(() => {
      logger.info("SHUTDOWN", "WebTorrent destroyed, exiting");
      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
