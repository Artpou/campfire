import { t } from "@lingui/core/macro";
import type { ListMediaQuery, MediaInput, Paginate } from "@seedarr/contracts";
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

import { hasActiveDownload, isActiveDownload } from "@/features/media/helpers/media.helper";

const MOVIE_QUERY_KEY = ["movie"] as const;
const TV_QUERY_KEY = ["tv"] as const;

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
        const combined = [...movies.results, ...tvShows.results];
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

  library: (type: Media["type"], pagination: { page: number; limit: number } = { page: 1, limit: 10 }) =>
    queryOptions({
      queryKey: [...mediaQueries.key, "library", type],
      queryFn: async () => {
        const page = await unwrap(
          api.media.$get({
            query: { filter: "downloaded", type, page: pagination.page.toString(), limit: pagination.limit.toString() },
          }),
        );
        return page.results;
      },
    }),

  inProgress: (type: Media["type"], pagination: { page: number; limit: number } = { page: 1, limit: 10 }) =>
    queryOptions({
      queryKey: [...mediaQueries.key, "in-progress", type],
      queryFn: async () => {
        const data = await unwrap(
          api.media.$get({
            query: {
              filter: "in-progress",
              type,
              page: pagination.page.toString(),
              limit: pagination.limit.toString(),
            },
          }),
        );
        return data.results;
      },
    }),

  keywords: (query: string) =>
    queryOptions({
      queryKey: [...mediaQueries.key, "keywords", query],
      queryFn: () => unwrap(api.movies.keywords.$get({ query: { q: query } })),
      enabled: query.trim().length >= 2,
    }),
};

export const ACTIVE_DOWNLOAD_INTERVAL = 2000;

export function refetchMediaInterval({ state }: { state: QueryState<InfiniteData<Paginate<Media>>> }) {
  const data = state.data;
  if (!data) return false;

  const hasDownloadingMedia = hasActiveDownload(data);
  return hasDownloadingMedia ? ACTIVE_DOWNLOAD_INTERVAL : false;
}

export function refetchLibraryInterval({ state }: { state: QueryState<Media[]> }) {
  const data = state.data;
  if (!data?.length) return false;

  return data.some((media) => isActiveDownload(media.download)) ? ACTIVE_DOWNLOAD_INTERVAL : false;
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (media: MediaInput) => unwrap(api.media.like.$post({ json: media })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
      if (data.type === "movie") {
        queryClient.invalidateQueries({ queryKey: MOVIE_QUERY_KEY });
      } else {
        queryClient.invalidateQueries({ queryKey: TV_QUERY_KEY });
      }
      toast.info(data.liked ? t`Added to your likes` : t`Removed from your likes`, {
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
    mutationFn: (media: MediaInput) => unwrap(api.media.watchlist.$post({ json: media })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
      if (data.type === "movie") {
        queryClient.invalidateQueries({ queryKey: MOVIE_QUERY_KEY });
      } else {
        queryClient.invalidateQueries({ queryKey: TV_QUERY_KEY });
      }
      toast.info(data.inWatchList ? t`Added to watch list` : t`Removed from watch list`, {
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

function invalidateMediaCaches(queryClient: ReturnType<typeof useQueryClient>, type?: Media["type"]) {
  queryClient.invalidateQueries({ queryKey: mediaQueries.key });
  if (type === "movie") queryClient.invalidateQueries({ queryKey: MOVIE_QUERY_KEY });
  if (type === "tv") queryClient.invalidateQueries({ queryKey: TV_QUERY_KEY });
}

export function useUpsertReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      media,
      score,
      comment,
      watchedAt,
    }: {
      media: Media;
      score: number;
      comment?: string | null;
      watchedAt?: string;
    }) =>
      unwrap(
        api.media[":id"].review.$put({
          param: { id: media.id.toString() },
          json: { score, comment, watchedAt, media },
        }),
      ),
    onSuccess: (data) => {
      invalidateMediaCaches(queryClient, data.type);
      toast.info(t`Review saved`, { description: data.title });
    },
    onError: (error) => {
      toast.error(t`Could not save review`, { description: formatError(error) });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (media: Media) => unwrap(api.media[":id"].review.$delete({ param: { id: media.id.toString() } })),
    onSuccess: (data) => {
      invalidateMediaCaches(queryClient, data.type);
      toast.info(t`Rating removed`, { description: data.title });
    },
    onError: (error) => {
      toast.error(t`Could not remove rating`, { description: formatError(error) });
    },
  });
}
