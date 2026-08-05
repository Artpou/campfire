import type { ListMediaQuery } from "@seedarr/contracts";

import { getMediaType } from "@/features/media/helpers/media.helper";

export function validateDownloadsSearch(search: Record<string, unknown>): Partial<ListMediaQuery> {
  return { type: getMediaType(search.type) };
}
