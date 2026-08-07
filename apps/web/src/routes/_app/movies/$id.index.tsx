import { useMemo } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { useRole } from "@/features/auth/hooks/use-role";
import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaDetailLayout } from "@/features/media/components/media-detail-layout";
import { MediaDownloadTab } from "@/features/media/components/media-download-tab";
import { MediaServerTab } from "@/features/media/components/media-server-tab";
import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/media.queries";
import { MovieCast } from "@/features/movies/components/movie-cast";
import { MovieDetails } from "@/features/movies/components/movie-details";
import { MovieInfo } from "@/features/movies/components/movie-info";
import { MovieRelated } from "@/features/movies/components/movie-related";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

export const Route = createFileRoute("/_app/movies/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(movieQueries.details(params.id, countryToTmdbLocale(context.language))),
  component: MoviePage,
  pendingComponent: () => <SeedarrLoaderContainer />,
});

function MoviePage() {
  const params = Route.useParams();
  const locale = useTmdbLocale();
  const { data } = useSuspenseQuery(movieQueries.details(params.id, locale));
  const { role } = useRole();

  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  const { media, movie } = data;

  const { data: mediaDownloads = [] } = useQuery({
    ...downloadQueries.byMedia(media?.id ?? 0),
    enabled: role !== "viewer" && Boolean(media?.id),
  });

  const liveDownload = useMemo(() => {
    if (!media) return null;
    if (media.download?.id) {
      return mediaDownloads.find((d) => d.id === media.download?.id) ?? media.download;
    }
    return mediaDownloads[0] ?? null;
  }, [media, mediaDownloads]);

  const torrentDownloads = useMemo(() => mediaDownloads.filter((d) => d.torrent), [mediaDownloads]);
  const remoteDownloads = useMemo(() => mediaDownloads.filter((d) => d.remoteLocation), [mediaDownloads]);

  const detailsSection = (
    <MovieDetails
      movie={movie}
      isLiked={media ? media.likes > 0 : undefined}
      isInWatchList={media ? media.watchList > 0 : undefined}
      onToggleLike={() => toggleLike.mutate(media)}
      onToggleWatchList={() => toggleWatchList.mutate(media)}
    />
  );

  const hasActiveDownload = torrentDownloads.some((d) => d.torrent && !d.torrent.done);

  return (
    <MediaDetailLayout
      title={movie.title || movie.original_title || ""}
      backdropPath={movie.backdrop_path}
      posterPath={movie.poster_path}
      media={media}
      download={liveDownload}
      posterData={data}
      infoSection={<MovieInfo movie={movie} />}
      detailsSection={detailsSection}
      downloadTabContent={torrentDownloads.length > 0 ? <MediaDownloadTab downloads={torrentDownloads} /> : undefined}
      downloadCount={torrentDownloads.length}
      serverTabContent={
        remoteDownloads.length > 0 ? <MediaServerTab downloads={remoteDownloads} mediaType="movie" /> : undefined
      }
      serverCount={remoteDownloads.length}
      defaultTab={hasActiveDownload ? "downloads" : "info"}
    >
      <MovieCast movie={movie} />
      <MovieRelated
        collection={data.collection}
        collectionMedia={data.related.collection}
        recommendedMovies={data.related.recommendations}
      />
    </MediaDetailLayout>
  );
}
