import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { secureHeaders } from "hono/secure-headers";
import { stream } from "hono/streaming";

import { pipeNodeStream } from "@/shared/helpers/stream.helper";
import { errorHandler } from "@/shared/middlewares/error.middleware";
import { requestLogger } from "@/shared/middlewares/logger.middleware";
import { requestTimeout } from "@/shared/middlewares/timeout.middleware";

import { createReadStream, existsSync } from "node:fs";
import { activityRoutes } from "./modules/activity/activity.route";
import { authGuard } from "./modules/auth/auth.guard";
import { authRoutes } from "./modules/auth/auth.route";
import { downloadRoutes } from "./modules/download/download.route";
import { localFileRoutes } from "./modules/download/local/local-file.route";
import { mediaRoutes } from "./modules/media/media.route";
import { moduleRoutes } from "./modules/module/module.route";
import { movieRoutes } from "./modules/movie/movie.route";
import { personRoutes } from "./modules/person/person.route";
import { requestRoutes } from "./modules/request/request.route";
import { streamingRoutes } from "./modules/streaming/streaming.route";
import { subtitleRoutes } from "./modules/subtitle/subtitle.route";
import { torrentRoutes } from "./modules/torrent/torrent.route";
import { tvRoutes } from "./modules/tv/tv.route";
import { userRoutes } from "./modules/user/user.route";
import { UserService } from "./modules/user/user.service";
import type { HonoVariables } from "./types/hono";

if (!process.env.WEB_URL) throw new Error("WEB_URL is not set");

export const app = new Hono<{ Variables: HonoVariables }>()
  .use("*", requestLogger)
  .use("*", secureHeaders())
  .use("*", csrf({ origin: process.env.WEB_URL }))
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
  .use("*", requestTimeout)
  .route("/auth", authRoutes)
  .route("/users", userRoutes)
  .route("/media", mediaRoutes)
  .route("/modules", moduleRoutes)
  .route("/movies", movieRoutes)
  .route("/person", personRoutes)
  .route("/tv", tvRoutes)
  .route("/torrents", torrentRoutes)
  .route("/downloads", downloadRoutes)
  .route("/download-files", localFileRoutes)
  .route("/streaming", streamingRoutes)
  .route("/subtitles", subtitleRoutes)
  .route("/activity", activityRoutes)
  .route("/requests", requestRoutes)
  .get("/avatars/:userId", authGuard, async (c) => {
    const userId = c.req.param("userId");
    if (!userId) return c.notFound();
    const avatar = await new UserService().resolveAvatarFile(userId);
    if (!avatar || !existsSync(avatar.absolutePath)) return c.notFound();

    c.header("Content-Type", avatar.contentType);
    c.header("Cache-Control", "private, max-age=86400");
    const fileStream = createReadStream(avatar.absolutePath);
    return stream(c, async (honoStream) => {
      await pipeNodeStream(honoStream, fileStream);
    });
  })
  .get("/health", (c) => c.json({ status: "healthy", timestamp: new Date().toISOString() }))
  .get("/version", (c) =>
    c.json({
      version: process.env.SEEDARR_VERSION ?? "dev",
      channel: process.env.SEEDARR_CHANNEL ?? "development",
    }),
  );

export type AppType = typeof app;
