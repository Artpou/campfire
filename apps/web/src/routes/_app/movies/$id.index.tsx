import { useMemo } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaDetailLayout } from "@/features/media/components/media-detail-layout";
import { MediaDownload } from "@/features/media/components/media-download";
import { MediaServer } from "@/features/media/components/media-server";
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

  const { media, movie } = data;

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

  const detailsSection = <MovieDetails movie={movie} media={media} />;

  const hasActiveDownload = torrentDownloads.some((d) => d.torrent && !d.torrent.done);

  return (
    <MediaDetailLayout
      title={movie.title || movie.original_title || ""}
      backdropPath={movie.backdrop_path}
      posterPath={movie.poster_path}
      media={media}
      download={liveDownload}
      posterData={data}
      infoSection={<MovieInfo movie={movie} media={media} />}
      detailsSection={detailsSection}
      downloadTabContent={torrentDownloads.length > 0 ? <MediaDownload downloads={torrentDownloads} /> : undefined}
      downloadCount={torrentDownloads.length}
      serverTabContent={
        remoteDownloads.length > 0 ? <MediaServer downloads={remoteDownloads} mediaType="movie" /> : undefined
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
