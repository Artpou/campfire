import { useMemo, useState } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { redirectIfNotRole } from "@/shared/helpers/role.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Container } from "@/shared/ui/container";

import { MediaCardHorizontal } from "@/features/media/components/card/media-card-horizontal";
import { useIndexerModules } from "@/features/module/hooks/use-module";
import { movieQueries } from "@/features/movies/hooks/movie.queries";
import { TorrentIndexersTable } from "@/features/torrent/components/torrent-indexers-table";
import { TorrentTable } from "@/features/torrent/components/torrent-table";
import { useTorrents } from "@/features/torrent/hooks/torrent.queries";

export const Route = createFileRoute("/_app/movies/$id/torrents")({
  component: MovieTorrentsPage,
  beforeLoad: ({ context, params }) => {
    redirectIfNotRole(context, "member", { to: "/movies/$id", params: { id: params.id } });
  },
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(movieQueries.details(params.id, countryToTmdbLocale(context.language))),
});

function MovieTorrentsPage() {
  const params = Route.useParams();

  const locale = useTmdbLocale();
  const { data: movie } = useSuspenseQuery(movieQueries.details(params.id, locale));
  const { indexers: managers, hasIndexers } = useIndexerModules();
  const { torrents, sources, indexerStats, isLoading } = useTorrents(movie.media, managers);

  const [visibleSources, setVisibleSources] = useState<Set<string>>(new Set());

  const filteredTorrents = useMemo(() => {
    if (visibleSources.size === 0) return torrents;
    return torrents.filter((torrent) => torrent.indexerId && visibleSources.has(torrent.indexerId));
  }, [torrents, visibleSources]);

  const { media } = movie;

  return (
    <Container>
      <MediaCardHorizontal media={media} withOverview withSocialActions />

      {sources.length > 1 ? (
        <div className="xl:grid xl:grid-cols-7 xl:gap-6">
          <div className="xl:col-span-5">
            <TorrentTable torrents={filteredTorrents} media={media} isLoading={isLoading} hasIndexers={hasIndexers} />
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
        <TorrentTable torrents={filteredTorrents} media={media} isLoading={isLoading} hasIndexers={hasIndexers} />
      )}
    </Container>
  );
}
