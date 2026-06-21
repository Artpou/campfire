import type { ListMediaQuery } from "@seedarr/sdk";

import { getMediaType } from "@/features/media/helpers/media.helper";

export function validateDownloadsSearch(search: Record<string, unknown>): Partial<ListMediaQuery> {
  return { type: getMediaType(search.type) };
}
