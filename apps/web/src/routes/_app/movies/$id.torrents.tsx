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
      context.queryClient.ensureQueryData(indexerQueries.list({ withDisabled: false })),
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
  const { data: managers } = useSuspenseQuery(indexerQueries.list({ withDisabled: false }));
  const { torrents, sources, indexerStats, isLoading } = useTorrents(movie.media, managers);

  const [visibleSources, setVisibleSources] = useState<Set<string>>(new Set());

  const filteredTorrents = useMemo(() => {
    if (visibleSources.size === 0) return torrents;
    return torrents.filter((torrent) => torrent.indexerId && visibleSources.has(torrent.indexerId));
  }, [torrents, visibleSources]);

  const { media } = movie;

  return (
    <Container>
      <AppBreadcrumb
        items={[
          { name: "Movies", link: "/movies" },
          { name: media.title, link: `/movies/${params.id}` },
          { name: "Torrents" },
        ]}
      />

      {sources.length > 1 ? (
        <div className="xl:grid xl:grid-cols-7 xl:gap-6">
          <div className="xl:col-span-5">
            <TorrentTable torrents={filteredTorrents} media={media} isLoading={isLoading} />
          </div>
          <div className="hidden xl:block xl:col-span-2">
            <TorrentIndexersTable
              sources={sources}
              indexerStats={indexerStats}
              onVisibilityChange={setVisibleSources}
            />
          </div>
        </div>
      ) : (
        <TorrentTable torrents={filteredTorrents} media={media} isLoading={isLoading} />
      )}
    </Container>
  );
}
