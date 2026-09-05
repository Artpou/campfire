import { relations } from "drizzle-orm";

import { download } from "@/modules/download/download.schema";
import { media, userLikes, userReviews, userWatchList, watchProgress } from "./media.schema";

/** Cross-table relations — separate file to avoid circular import with download.schema. */
export const mediaRelations = relations(media, ({ many }) => ({
  likes: many(userLikes),
  watchList: many(userWatchList),
  reviews: many(userReviews),
  progress: many(watchProgress),
  downloads: many(download),
}));
