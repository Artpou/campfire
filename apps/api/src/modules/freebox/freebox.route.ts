import { Elysia, t } from "elysia";

import { freeboxService } from "./freebox.service";

export const freeboxRoutes = new Elysia({ prefix: "/freebox" }).get(
  "/files",
  async ({ query, set }) => {
    try {
      const path = query.path || "/";
      const files = await freeboxService.listFiles(path);
      return { path, files };
    } catch (error) {
      console.error("Failed to connect to Freebox:", error);
      set.status = 500;
      return { error: "Failed to connect to Freebox" };
    }
  },
  {
    query: t.Object({
      path: t.Optional(t.String()),
    }),
  },
);
