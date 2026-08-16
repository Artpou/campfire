import { useMemo } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaDetailLayout, type MediaDetailTab } from "@/features/media/components/media-detail-layout";
import { MediaDownload } from "@/features/media/components/media-download";
import { MediaServer } from "@/features/media/components/media-server";
import { MovieCast } from "@/features/movies/components/movie-cast";
import { MovieDetails } from "@/features/movies/components/movie-details";
import { MovieInfo } from "@/features/movies/components/movie-info";
import { MovieRelated } from "@/features/movies/components/movie-related";
import { movieQueries } from "@/features/movies/hooks/movie.queries";

const VALID_TABS: MediaDetailTab[] = ["info", "downloads", "server"];

function validateSearch(search: Record<string, unknown>): { tab?: MediaDetailTab } {
  const tab = search.tab;
  if (typeof tab === "string" && (VALID_TABS as string[]).includes(tab)) return { tab: tab as MediaDetailTab };
  return {};
}

export const Route = createFileRoute("/_app/movies/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(movieQueries.details(params.id, countryToTmdbLocale(context.language))),
  component: MoviePage,
  validateSearch,
});

function MoviePage() {
  const params = Route.useParams();
  const { tab: urlTab } = Route.useSearch();
  const navigate = useNavigate();
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

  const detailsSection = <MovieDetails movie={movie} />;

  const hasActiveDownload = torrentDownloads.some((d) => d.torrent && !d.torrent.done);

  const effectiveTab = useMemo(() => {
    if (urlTab === "downloads" && torrentDownloads.length === 0) return "info";
    if (urlTab === "server" && remoteDownloads.length === 0) return "info";
    return urlTab;
  }, [urlTab, torrentDownloads.length, remoteDownloads.length]);

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
      tab={effectiveTab}
      onTabChange={(t) => navigate({ to: ".", search: { tab: t === "info" ? undefined : t }, replace: true })}
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
