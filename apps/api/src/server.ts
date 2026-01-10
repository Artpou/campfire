import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import * as fs from "node:fs/promises";
import { colors, logRequest } from "./helpers/logger.helper";
import { authRoutes } from "./modules/auth/auth.route";
import { downloadRoutes } from "./modules/download/download.route";
import { WebTorrentClient } from "./modules/download/webtorrent.client";
import { freeboxRoutes } from "./modules/freebox/freebox.route";
import { indexerManagerRoutes } from "./modules/indexer-manager/indexer-manager.route";
import { mediaRoutes } from "./modules/media/media.route";
import { torrentRoutes } from "./modules/torrent/torrent.route";
import { userRoutes } from "./modules/user/user.route";
import type { HonoVariables } from "./types/hono";

const startTime = Date.now();

// Store request start times
const requestTimes = new WeakMap<Request, number>();

export const app = new Hono<{ Variables: HonoVariables }>()
  .use("*", async (c, next) => {
    requestTimes.set(c.req.raw, Date.now());
    await next();
    const duration = Date.now() - (requestTimes.get(c.req.raw) || Date.now());
    // log url params

    logRequest(c.req.method, c.req.url, c.res.status, duration, c.req.query());

    if (c.res.status === 400) {
      try {
        const body = (await c.res.clone().json()) as { error?: { issues?: unknown } };
        if (body?.error?.issues) {
          console.error(
            `${colors.orange}[VALIDATION]${colors.reset}`,
            JSON.stringify(body.error.issues, null, 2),
          );
        }
      } catch {}
    }
  })
  .onError((err, c) => {
    console.error(`${colors.red}[ERROR]${colors.reset} ${c.req.method} ${c.req.url}`);
    console.error(err);
    return c.json({ error: "Internal server error" }, 500);
  })
  .use(
    "*",
    cors({
      origin: "http://localhost:3000",
      credentials: true,
      allowHeaders: ["Content-Type", "Authorization", "Cookie"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
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
  .get("/", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }));

export type AppType = typeof app;

const start = async () => {
  // Create downloads directory if it doesn't exist
  const downloadsPath = process.env.DOWNLOADS_PATH || "./downloads";
  await fs.mkdir(downloadsPath, { recursive: true });
  console.log(`[STARTUP] Downloads directory: ${downloadsPath}`);

  WebTorrentClient.initialize(downloadsPath).catch((error) => {
    console.error("[STARTUP] ✗ WebTorrent initialization failed:", error);
  });

  if (!process.env.API_PORT) {
    console.log("API_PORT is not set, using default 3002");
  }

  const port = parseInt(process.env.API_PORT || "3002", 10);
  console.log(`[STARTUP] About to listen on port ${port}`);

  serve({
    fetch: app.fetch,
    port,
  });

  console.log(`[STARTUP] Server is now listening`);

  console.log(
    `\n  ${colors.bold}${colors.yellow}🔥 HONO${colors.reset} ${colors.yellow}v4.7.9${colors.reset}  ready in ${
      Date.now() - startTime
    } ms\n`,
  );
  console.log(
    `  ${colors.bold}${colors.yellow}➜${colors.reset}  ${colors.bold}Local:${colors.reset}   ${colors.cyan}http://localhost:${colors.bold}${port}${colors.reset}${colors.cyan}/${colors.reset}\n`,
  );
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
