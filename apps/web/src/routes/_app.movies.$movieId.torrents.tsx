import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { SeedarrLoader } from "@/shared/ui/seedarr-loader";

import { useAuth } from "@/features/auth/auth-store";
import { useMedia } from "@/features/media/hooks/use-media";
import { TorrentIndexersTable } from "@/features/torrent/components/torrent-indexers-table";
import { TorrentTable } from "@/features/torrent/components/torrent-table";
import { useIndexers } from "@/features/torrent/hooks/use-indexers";
import { useTorrents } from "@/features/torrent/hooks/use-torrent";

export const Route = createFileRoute("/_app/movies/$movieId/torrents")({
  component: MovieTorrentsPage,
  beforeLoad: () => {
    const user = useAuth.getState().user;
    if (user?.role === "viewer") {
      throw redirect({ to: "/404" });
    }
  },
});

function MovieTorrentsPage() {
  const params = Route.useParams();
  const { data: media, isLoading: isMediaLoading } = useMedia(Number(params.movieId));
  const { data: indexers, isLoading: isIndexersLoading } = useIndexers();
  const torrentQueries = useTorrents(media, indexers || []);

  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  const allTorrents = useMemo(() => {
    if (!indexers) return [];
    const torrents = torrentQueries.flatMap((query, index) => {
      if (!query.data) return [];
      const indexerId = indexers[index]?.id;
      return query.data.map((torrent) => ({ ...torrent, indexerId }));
    });

    const year = new Date(media?.release_date || "").getFullYear().toString();

    const torrentsWithYear = torrents
      .filter((torrent) => torrent.title.includes(year || ""))
      .sort((a, b) => b.seeders - a.seeders);

    const torrentsWithoutYear = torrents
      .filter((torrent) => !torrent.title.includes(year || ""))
      .sort((a, b) => b.seeders - a.seeders);

    return [...torrentsWithYear, ...torrentsWithoutYear];
  }, [torrentQueries, indexers, media]);

  const filteredTorrents = useMemo(() => {
    if (visibleIndexers.size === 0) return allTorrents;
    return allTorrents.filter((t) => t.indexerId && visibleIndexers.has(t.indexerId));
  }, [allTorrents, visibleIndexers]);

  console.log(allTorrents.map((torrent) => torrent.title));
  console.log(filteredTorrents.map((torrent) => torrent.title));

  const isLoading =
    isMediaLoading || isIndexersLoading || !torrentQueries.some((query) => !query.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center size-full">
        <SeedarrLoader />
      </div>
    );
  }

  if (!media || !indexers) return null;

  return (
    <Container>
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" asChild>
          <Link to="/movies/$movieId" params={{ movieId: params.movieId }}>
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h2 className="text-xl font-semibold">
          <Trans>Search torrents for "{media.title}"</Trans>
        </h2>
      </div>

      <div className="xl:grid xl:grid-cols-7 xl:gap-6">
        <div className="xl:col-span-5">
          <TorrentTable torrents={filteredTorrents} media={media} />
        </div>
        <div className="hidden xl:block xl:col-span-2">
          <TorrentIndexersTable
            indexers={indexers}
            torrentQueries={torrentQueries}
            onVisibilityChange={setVisibleIndexers}
          />
        </div>
      </div>
    </Container>
  );
}
