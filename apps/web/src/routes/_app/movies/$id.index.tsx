import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { SeedarrLoaderContainer } from "@/shared/components/seedarr-loader-container";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { MediaDetailLayout } from "@/features/media/components/media-detail-layout";
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

  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  const { media, movie } = data;

  const detailsSection = (
    <MovieDetails
      movie={movie}
      isLiked={media ? media.likes > 0 : undefined}
      isInWatchList={media ? media.watchList > 0 : undefined}
      onToggleLike={() => toggleLike.mutate(media)}
      onToggleWatchList={() => toggleWatchList.mutate(media)}
    />
  );

  return (
    <MediaDetailLayout
      title={movie.title ?? ""}
      backdropPath={movie.backdrop_path}
      posterPath={movie.poster_path}
      media={media}
      posterData={data}
      downloadId={media?.download?.id}
      infoSection={<MovieInfo movie={movie} />}
      detailsSection={detailsSection}
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
