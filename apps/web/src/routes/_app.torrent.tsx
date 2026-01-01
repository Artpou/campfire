import { useEffect } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { useAuth } from "@/features/auth/auth-store";
import { TorrentTable } from "@/features/torrent/components/torrent-table";

export interface TorrentSearchParams {
  q?: string;
  movie?: number;
  year?: string;
}

export const Route = createFileRoute("/_app/torrent")({
  component: TorrentPage,
  validateSearch: (search: Record<string, unknown>): TorrentSearchParams => {
    return {
      q: typeof search.q === "string" ? search.q : undefined,
      movie: typeof search.movie === "number" ? search.movie : undefined,
      year: typeof search.year === "string" ? search.year : undefined,
    };
  },
  beforeLoad: () => {
    const user = useAuth.getState().user;
    if (user?.role === "viewer") {
      throw redirect({ to: "/404" });
    }
  },
});

function TorrentPage() {
  const { q, movie, year } = Route.useSearch();
  const router = useRouter();

  useEffect(() => {
    if (!q) {
      router.navigate({ to: "/" });
    }
  }, [q, router]);

  if (!q) return null;

  return (
    <div className="container mx-auto p-6 pb-20">
      <div className="flex items-center gap-4 mb-4">
        {movie && (
          <Button variant="outline" size="icon" asChild>
            <Link to="/movies/$movieId" params={{ movieId: movie.toString() }}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
        )}
        <h2 className="text-xl font-semibold">
          <Trans>Search Torrents for "{q}"</Trans>
        </h2>
      </div>

      <TorrentTable movieTitle={q} releaseYear={year} />
    </div>
  );
}
