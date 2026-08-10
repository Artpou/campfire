import { t } from "@lingui/core/macro";
import type { ListRequestsQuery, MediaInput } from "@seedarr/contracts";
import { api, unwrap } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { infiniteQueryOptions, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { toPaginationQuery } from "@/shared/helpers/pagination.helper";

import { mediaQueries } from "@/features/media/hooks/media.queries";

export const requestQueries = {
  key: ["requests"] as const,

  list: (query: ListRequestsQuery) =>
    infiniteQueryOptions({
      queryKey: [...requestQueries.key, "list", query],
      queryFn: async (pagination: { pageParam?: number }) => {
        return await unwrap(api.requests.$get({ query: toPaginationQuery(query, pagination) }));
      },
      getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
      initialPageParam: 1,
    }),

  mine: () =>
    queryOptions({
      queryKey: [...requestQueries.key, "mine"],
      queryFn: () => unwrap(api.requests.mine.$get()),
    }),

  byType: (type: "movie" | "tv") =>
    queryOptions({
      queryKey: [...requestQueries.key, "byType", type],
      queryFn: async () => {
        const result = await unwrap(api.requests.$get({ query: { type, page: "1", limit: "20" } }));
        return result.results;
      },
    }),
};

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (media: MediaInput) => unwrap(api.requests.$post({ json: media })),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: requestQueries.key });
      queryClient.invalidateQueries({ queryKey: mediaQueries.key });
      toast.success(t`Request submitted`, { description: data.media.title });
    },
    onError: (error) => {
      toast.error(t`Could not submit request`, { description: formatError(error) });
    },
  });
}

export function useDismissRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => unwrap(api.requests[":id"].dismiss.$patch({ param: { id: requestId } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestQueries.key });
      toast.success(t`Request dismissed`);
    },
    onError: (error) => {
      toast.error(t`Could not dismiss request`, { description: formatError(error) });
    },
  });
}
