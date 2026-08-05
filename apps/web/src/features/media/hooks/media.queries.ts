import { t } from "@lingui/core/macro";
import type { ListMediaQuery, Paginate } from "@seedarr/contracts";
import type { Media } from "@seedarr/sdk";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import {
  type InfiniteData,
  infiniteQueryOptions,
  type QueryState,
  queryOptions,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import { toPaginationQuery } from "@/shared/helpers/pagination.helper";

function isActiveDownload(download: Media["download"]): boolean {
  if (!download?.torrent) return false;
  if (download.torrent.transferring) return true;
  return !download.torrent.done && !download.torrent.paused;
}

export const mediaQueries = {
  key: ["media"] as const,
  list: (query: ListMediaQuery) =>
    infiniteQueryOptions({
      queryKey: [...mediaQueries.key, "list", query],
      queryFn: async (pagination: { pageParam?: number; limit?: number }) => {
        return await unwrap(api.media.$get({ query: toPaginationQuery(query, pagination) }));
      },
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
    }),

  details: (id: number) =>
    queryOptions({
      queryKey: [...mediaQueries.key, id],
      queryFn: () => unwrap(api.media[":id"].$get({ param: { id: id.toString() } })),
    }),

  search: (query: string, locale: string) =>
    queryOptions({
      queryKey: [...mediaQueries.key, "search", query, locale],
      queryFn: async () => {
        const [movies, tvShows] = await Promise.all([
          unwrap(api.movies.search.$get({ query: { q: query, locale } })),
          unwrap(api.tv.search.$get({ query: { q: query, locale } })),
        ]);
        const combined = [...movies, ...tvShows];
        return combined.sort((a, b) => {
          if (a.download && !b.download) return -1;
          if (!a.download && b.download) return 1;
          return 0;
        });
      },
    }),

  trending: (type: Media["type"], locale: string) =>
    queryOptions({
      queryKey: [...mediaQueries.key, "trending", type, locale],
      queryFn: async () =>
        type === "movie"
          ? await unwrap(api.movies.trending.$get({ query: { locale } }))
          : await unwrap(api.tv.trending.$get({ query: { locale } })),
    }),

  library: (type: Media["type"]) =>
    queryOptions({
      queryKey: [...mediaQueries.key, "library", type],
      queryFn: async () => {
        const page = await unwrap(api.media.$get({ query: { filter: "downloaded", type, page: "1", limit: "10" } }));
        return page.results;
      },
    }),

  keywords: (query: string) =>
    queryOptions({
      queryKey: [...mediaQueries.key, "keywords", query],
      queryFn: () => unwrap(api.movies.keywords.$get({ query: { q: query } })),
      enabled: query.trim().length >= 2,
    }),
};

export function refetchMediaInterval({ state }: { state: QueryState<InfiniteData<Paginate<Media>>> }) {
  const data = state.data;
  if (!data) return false;

  const hasDownloadingMedia = data.pages.some(({ results }) =>
    results?.some((media: Media) => isActiveDownload(media.download)),
  );

  return hasDownloadingMedia ? 2000 : false;
}

export function refetchLibraryInterval({ state }: { state: QueryState<Media[]> }) {
  const data = state.data;
  if (!data?.length) return false;

  return data.some((media) => isActiveDownload(media.download)) ? 2000 : false;
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (media: Media) => unwrap(api.media[":id"].like.$post({ param: { id: media.id.toString() } })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
      toast.success(data.likes > 0 ? t`Added to your likes` : t`Removed from your likes`, {
        description: data.title,
      });
    },
    onError: (error) => {
      toast.error(t`Could not update likes`, {
        description: formatError(error),
      });
    },
  });
}

export function useToggleWatchList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (media: Media) => unwrap(api.media[":id"].watchlist.$post({ param: { id: media.id.toString() } })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
      toast.success(data.watchList > 0 ? t`Added to watch list` : t`Removed from watch list`, {
        description: data.title,
      });
    },
    onError: (error) => {
      toast.error(t`Could not update watch list`, {
        description: formatError(error),
      });
    },
  });
}
