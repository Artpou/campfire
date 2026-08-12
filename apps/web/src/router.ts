import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import ms from "ms";

import { routeTree } from "./routeTree.gen";

export interface SeedarrRouterContext {
  queryClient: QueryClient;
  language: string;
}

/** At most 1 retry, and only for network/unknown errors (no HTTP status). */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (error && typeof error === "object" && "status" in error) return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ms("5m"),
      gcTime: ms("30m"),
      refetchOnWindowFocus: false,
      retry: shouldRetry,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10_000),
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
