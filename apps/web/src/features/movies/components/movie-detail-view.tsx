import { useMemo } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaCarouselCast } from "@/features/media/components/carousel/media-carousel-cast";
import { type MediaDetailTab, MediaDetailView } from "@/features/media/components/media-detail-view";
import { MovieRelated } from "@/features/movies/components/movie-related";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

export interface MovieDetailViewProps {
  movieId: string;
  urlTab?: MediaDetailTab;
}

export function MovieDetailView({ movieId, urlTab }: MovieDetailViewProps) {
  const navigate = useNavigate();
  const locale = useTmdbLocale();
  const { data } = useSuspenseQuery(movieQueries.details(movieId, locale));
  const { media } = data;

  const { data: mediaDownloads = [] } = useQuery(downloadQueries.byMedia(media));

  const liveDownload = useMemo(() => {
    if (!media) return null;
    if (media.download?.id) {
      return mediaDownloads.find((d) => d.id === media.download?.id) ?? media.download;
    }
    return mediaDownloads[0] ?? null;
  }, [media, mediaDownloads]);

  const torrentDownloads = useMemo(() => mediaDownloads.filter((d) => d.torrent), [mediaDownloads]);
  const remoteDownloads = useMemo(() => mediaDownloads.filter((d) => d.remoteLocation), [mediaDownloads]);
  const hasActiveDownload = torrentDownloads.some((d) => d.torrent && !d.torrent.done);

  const tab = useMemo((): MediaDetailTab => {
    if (urlTab === "downloads" && torrentDownloads.length === 0) return "info";
    if (urlTab === "server" && remoteDownloads.length === 0) return "info";
    if (urlTab) return urlTab;
    return hasActiveDownload ? "downloads" : "info";
  }, [urlTab, torrentDownloads.length, remoteDownloads.length, hasActiveDownload]);

  return (
    <MediaDetailView
      data={data}
      download={liveDownload}
      torrentDownloads={torrentDownloads}
      remoteDownloads={remoteDownloads}
      tab={tab}
      onTabChange={(t) => navigate({ to: ".", search: { tab: t }, replace: true })}
    >
      <MediaCarouselCast data={data} />
      <MovieRelated
        collection={data.collection}
        collectionMedia={data.related.collection}
        recommendedMovies={data.related.recommendations}
      />
    </MediaDetailView>
  );
}
