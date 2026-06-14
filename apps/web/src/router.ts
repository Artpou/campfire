import { MutationCache, QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import ms from "ms";
import { toast } from "sonner";

import { routeTree } from "./routeTree.gen";

export interface SeedarrRouterContext {
  queryClient: QueryClient;
  language: string;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ms("5m"),
      gcTime: ms("30m"),
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
  mutationCache: new MutationCache({
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred");
    },
  }),
});

export const router = createRouter({
  routeTree,
  context: { queryClient, language: "en-US" },
  scrollRestoration: true,
  getScrollRestorationKey: (location) => location.pathname,
  defaultPreloadStaleTime: 0,
});
