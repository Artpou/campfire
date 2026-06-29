import { zValidator } from "@hono/zod-validator";

import { NotFoundError } from "@/errors/error";
import { tmdbRateLimiter } from "@/middlewares/rate-limiter.middleware";
import {
  tmdbDiscoverDto,
  tmdbIdDto,
  tmdbKeywordsDto,
  tmdbListDto,
  tmdbSearchDto,
  tmdbTvSeasonDto,
} from "@/modules/tmdb/tmdb.dto";
import { TVService } from "./tv.service";

export const tvRoutes = TVService.createTMDBRouter("tv")
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
    const result = await c.var.service.get(c.req.param("id"));
    if (!result) throw new NotFoundError("TV show");
    return c.json(result);
  })
  .get("/:id/trailer", zValidator("param", tmdbIdDto), zValidator("query", tmdbListDto), async (c) => {
    return c.json(await c.var.service.trailer(c.req.param("id")));
  })
  .get("/:id/season/:number", zValidator("param", tmdbTvSeasonDto), async (c) => {
    return c.json(await c.var.service.tvSeasonDetails(c.req.param("id"), Number(c.req.param("number"))));
  });
