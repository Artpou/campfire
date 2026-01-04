import { useMemo, useState } from "react";

import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Container } from "@/shared/ui/container";

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
      <AppBreadcrumb
        items={[
          { name: "Movies", link: "/movies" },
          { name: media.title, link: `/movies/${params.movieId}` },
          { name: "Torrents" },
        ]}
      />

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
