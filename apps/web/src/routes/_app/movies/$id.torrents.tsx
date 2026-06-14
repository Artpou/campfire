import { useMemo, useState } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Navigate } from "@tanstack/react-router";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Container } from "@/shared/ui/container";

import { movieQueries } from "@/features/movies/hooks/movie.queries";
import { TorrentIndexersTable } from "@/features/torrent/components/torrent-indexers-table";
import { TorrentTable } from "@/features/torrent/components/torrent-table";
import { indexerQueries } from "@/features/torrent/hooks/indexer.queries";
import { useTorrents } from "@/features/torrent/hooks/torrent.queries";

export const Route = createFileRoute("/_app/movies/$id/torrents")({
  component: MovieTorrentsPage,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(movieQueries.details(params.id, context.language)),
      context.queryClient.ensureQueryData(indexerQueries.list()),
    ]),
  pendingComponent: () => (
    <div className="flex items-center justify-center size-full">
      <SeedarrLoader />
    </div>
  ),
  errorComponent: () => <Navigate to="/404" replace />,
});

function MovieTorrentsPage() {
  const params = Route.useParams();
  const context = Route.useRouteContext();

  const { data: movie } = useSuspenseQuery(movieQueries.details(params.id, context.language));
  const { data: indexers } = useSuspenseQuery(indexerQueries.list());
  const { torrents, indexerStats, isLoading: isAnyTorrentLoading } = useTorrents(movie.media, indexers);

  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  const { media } = movie;

  const filteredTorrents = useMemo(() => {
    if (visibleIndexers.size === 0) return torrents;
    return torrents.filter((t) => t.indexerId && visibleIndexers.has(t.indexerId));
  }, [torrents, visibleIndexers]);

  return (
    <Container>
      <AppBreadcrumb
        items={[
          { name: "Movies", link: "/movies" },
          { name: media.title, link: `/movies/${params.id}` },
          { name: "Torrents" },
        ]}
      />

      <div className="xl:grid xl:grid-cols-7 xl:gap-6">
        <div className="xl:col-span-5">
          <TorrentTable torrents={filteredTorrents} media={media} isLoading={isAnyTorrentLoading} />
        </div>
        <div className="hidden xl:block xl:col-span-2">
          <TorrentIndexersTable
            indexers={indexers || []}
            indexerQueries={indexerStats}
            onVisibilityChange={setVisibleIndexers}
          />
        </div>
      </div>
    </Container>
  );
}
