import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { MediaDetailLayout } from "@/features/media/components/media-detail-layout";
import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/media.queries";
import { TvCast } from "@/features/tv/components/tv-cast";
import { TvDetails } from "@/features/tv/components/tv-details";
import { TvEpisodesSection } from "@/features/tv/components/tv-episodes-section";
import { TvInfo } from "@/features/tv/components/tv-info";
import { TvRelated } from "@/features/tv/components/tv-related";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

export const Route = createFileRoute("/_app/tv/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(tvQueries.details(params.id, countryToTmdbLocale(context.language))),
  component: TVPage,
  pendingComponent: () => (
    <div className="flex items-center justify-center size-full">
      <SeedarrLoader />
    </div>
  ),
});

function TVPage() {
  const params = Route.useParams();
  const locale = useTmdbLocale();
  const { data } = useSuspenseQuery(tvQueries.details(params.id, locale));

  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  const { tv, media, related } = data;

  const detailsSection = (
    <TvDetails
      tv={tv}
      isLiked={media ? media.likes > 0 : undefined}
      isInWatchList={media ? media.watchList > 0 : undefined}
      onToggleLike={() => media && toggleLike.mutate(media)}
      onToggleWatchList={() => media && toggleWatchList.mutate(media)}
    />
  );

  return (
    <MediaDetailLayout
      title={tv.name ?? ""}
      backdropPath={tv.backdrop_path}
      posterPath={tv.poster_path}
      media={media}
      posterData={data}
      posterType="tv"
      infoSection={<TvInfo tv={tv} />}
      detailsSection={detailsSection}
    >
      <TvEpisodesSection tv={tv} media={data.media} />
      <TvCast tv={tv} />
      <TvRelated recommendedTV={related.recommendations} />
    </MediaDetailLayout>
  );
}
