import type { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/features/downloads/hooks/download.queries", () => ({
  downloadQueries: {
    details: (id: string) => ({ queryKey: ["download", id] }),
  },
}));

vi.mock("@/features/media/hooks/media.queries", () => ({
  mediaQueries: {
    details: (id: number) => ({ queryKey: ["media", id] }),
  },
}));

const { Route } = await import("@/routes/_app/downloads/$id.index");
const beforeLoad = Route.options.beforeLoad;

describe("downloads/$id beforeLoad", () => {
  it("redirects to movie detail when media is a movie", async () => {
    const ensureQueryData = vi
      .fn()
      .mockResolvedValueOnce({ id: "dl-1", mediaId: 42 })
      .mockResolvedValueOnce({ id: 42, type: "movie" });

    await expect(
      beforeLoad?.({
        params: { id: "dl-1" },
        context: { queryClient: { ensureQueryData } as unknown as QueryClient },
      } as never),
    ).rejects.toMatchObject({
      options: { to: "/movies/$id", params: { id: "42" } },
    });
  });

  it("redirects to tv detail when media is a tv show", async () => {
    const ensureQueryData = vi
      .fn()
      .mockResolvedValueOnce({ id: "dl-2", mediaId: 7 })
      .mockResolvedValueOnce({ id: 7, type: "tv" });

    await expect(
      beforeLoad?.({
        params: { id: "dl-2" },
        context: { queryClient: { ensureQueryData } as unknown as QueryClient },
      } as never),
    ).rejects.toMatchObject({
      options: { to: "/tv/$id", params: { id: "7" } },
    });
  });

  it("redirects to downloads list when mediaId is missing", async () => {
    const ensureQueryData = vi.fn().mockResolvedValueOnce({ id: "dl-3", mediaId: null });

    await expect(
      beforeLoad?.({
        params: { id: "dl-3" },
        context: { queryClient: { ensureQueryData } as unknown as QueryClient },
      } as never),
    ).rejects.toMatchObject({ options: { to: "/downloads" } });
  });
});
