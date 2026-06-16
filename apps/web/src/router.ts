import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import ms from "ms";

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
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

export const router = createRouter({
  routeTree,
  context: { queryClient, language: "en-US" },
  scrollRestoration: true,
  getScrollRestorationKey: (location) => location.pathname,
  defaultPreloadStaleTime: 0,
});
