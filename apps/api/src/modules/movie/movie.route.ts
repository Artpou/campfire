import { zValidator } from "@hono/zod-validator";

import { tmdbRateLimiter } from "@/middlewares/rate-limiter.middleware";
import { tmdbDiscoverDto, tmdbIdDto, tmdbKeywordsDto, tmdbListDto, tmdbSearchDto } from "@/types";
import { MovieService } from "./movie.service";

export const movieRoutes = MovieService.createTMDBRouter("movie")
  .use(tmdbRateLimiter)
  .get("/trending", zValidator("query", tmdbListDto), async (c) => {
    return c.json(await c.var.service.trending());
  })
  .get("/search", zValidator("query", tmdbSearchDto), async (c) => {
    return c.json(await c.var.service.search(c.req.valid("query")));
  })
  .get("/keywords", zValidator("query", tmdbKeywordsDto), async (c) => {
    return c.json(await c.var.service.searchKeywords(c.req.valid("query")));
  })
  .get("/discover", zValidator("query", tmdbDiscoverDto), async (c) => {
    return c.json(await c.var.service.discover(c.req.valid("query")));
  })
  .get("/genres", zValidator("query", tmdbListDto), async (c) => {
    return c.json(await c.var.service.genres());
  })
  .get("/providers", zValidator("query", tmdbListDto), async (c) => {
    return c.json(await c.var.service.providers());
  })
  .get("/:id", zValidator("param", tmdbIdDto), zValidator("query", tmdbListDto), async (c) => {
    return c.json(await c.var.service.get(c.req.param("id")));
  })
  .get("/:id/trailer", zValidator("param", tmdbIdDto), zValidator("query", tmdbListDto), async (c) => {
    return c.json(await c.var.service.trailer(c.req.param("id")));
  });
