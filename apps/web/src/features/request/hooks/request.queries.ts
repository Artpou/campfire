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
      queryKey: [...requestQueries.key, "byType", type, "pending"],
      queryFn: async () => {
        const result = await unwrap(api.requests.$get({ query: { type, status: "pending", page: "1", limit: "20" } }));
        return result.results;
      },
    }),

  byUser: (userId: string) =>
    queryOptions({
      queryKey: [...requestQueries.key, "byUser", userId],
      queryFn: () => unwrap(api.requests.user[":id"].$get({ param: { id: userId } })),
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

export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => unwrap(api.requests[":id"].cancel.$patch({ param: { id: requestId } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestQueries.key });
      toast.info(t`Request cancelled`);
    },
    onError: (error) => {
      toast.error(t`Could not cancel request`, { description: formatError(error) });
    },
  });
}

export function useReopenRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => unwrap(api.requests[":id"].reopen.$patch({ param: { id: requestId } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestQueries.key });
      toast.info(t`Request reopened`);
    },
    onError: (error) => {
      toast.error(t`Could not reopen request`, { description: formatError(error) });
    },
  });
}

export function useDeleteRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) => unwrap(api.requests[":id"].$delete({ param: { id: requestId } })),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestQueries.key });
      toast.info(t`Request deleted`);
    },
    onError: (error) => {
      toast.error(t`Could not delete request`, { description: formatError(error) });
    },
  });
}
