import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { helmet } from "elysia-helmet";
import { colors, logRequest } from "./helpers/logger.helper";
import { authRoutes } from "./modules/auth/auth.route";
import { freeboxRoutes } from "./modules/freebox/freebox.route";
import { indexerManagerRoutes } from "./modules/indexer-manager/indexer-manager.route";
import { mediaRoutes } from "./modules/media/media.route";
import { torrentRoutes } from "./modules/torrent/torrent.route";
import { userRoutes } from "./modules/user/user.route";

const startTime = Date.now();

// Store request start times
const requestTimes = new WeakMap<Request, number>();

export const app = new Elysia()
  .onRequest(({ request }) => {
    requestTimes.set(request, Date.now());
  })
  .onAfterResponse(({ request, set }) => {
    const startTime = requestTimes.get(request) || Date.now();
    const duration = Date.now() - startTime;
    logRequest(request.method, request.url, set.status || 200, duration);
  })
  .onError(({ code, error, request, set }) => {
    const startTime = requestTimes.get(request) || Date.now();
    const duration = Date.now() - startTime;
    logRequest(request.method, request.url, set.status || 500, duration);

    if (code === "VALIDATION") {
      error.all.forEach((err) => {
        console.error(err.summary);
      });
    } else if (code === "NOT_FOUND") {
      console.error(error.message);
    } else {
      console.error(error);
    }
  })
  .use(
    cors({
      origin: "http://localhost:3000",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
    }),
  )
  .use(helmet())
  .use(swagger())
  .use(authRoutes)
  .use(userRoutes)
  .use(freeboxRoutes)
  .use(indexerManagerRoutes)
  .use(mediaRoutes)
  .use(torrentRoutes)
  .get("/", () => ({ status: "healthy", timestamp: new Date().toISOString() }));

export type App = typeof app;

const start = async () => {
  if (!process.env.API_PORT) {
    console.log("API_PORT is not set, using default 3002");
  }

  const port = parseInt(process.env.API_PORT || "3002", 10);
  console.log(`[STARTUP] About to listen on port ${port}`);
  await app.listen(port);
  console.log(`[STARTUP] Server is now listening`);

  console.log(
    `\n  ${colors.bold}${colors.yellow}🦊 ELYSIA${colors.reset} ${
      colors.yellow
    }v${require("elysia/package.json").version}${colors.reset}  ready in ${
      Date.now() - startTime
    } ms\n`,
  );
  console.log(
    `  ${colors.bold}${colors.yellow}➜${colors.reset}  ${colors.bold}Local:${colors.reset}   ${colors.cyan}http://${app.server?.hostname}:${colors.bold}${app.server?.port}${colors.reset}${colors.cyan}/${colors.reset}\n`,
  );
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
