import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { Elysia } from "elysia";
import { helmet } from "elysia-helmet";
import { auth } from "./auth/auth.config";
import { freeboxRoutes } from "./modules/freebox/freebox.route";
import { indexerRoutes } from "./modules/indexer/indexer.route";
import { torrentRoutes } from "./modules/torrent/torrent.route";
import { userRoutes } from "./modules/user/user.route";

const startTime = Date.now();

export const app = new Elysia()
  .onAfterResponse(({ request, set }) => {
    console.log(`${request.method} ${request.url} ${set.status}`);
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
  .mount(auth.handler)
  .use(userRoutes)
  .use(freeboxRoutes)
  .use(indexerRoutes)
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
    `\n  \x1b[1m\x1b[33m🦊 ELYSIA\x1b[0m \x1b[33mv${require("elysia/package.json").version}\x1b[0m  ready in ${Date.now() - startTime} ms\n`,
  );
  console.log(
    `  \x1b[1m\x1b[33m➜\x1b[0m  \x1b[1mLocal:\x1b[0m   \x1b[36mhttp://${app.server?.hostname}:\x1b[1m${app.server?.port}\x1b[0m\x1b[36m/\x1b[0m\n`,
  );
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
