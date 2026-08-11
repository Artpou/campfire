import { useMemo } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaDetailLayout } from "@/features/media/components/media-detail-layout";
import { MediaDownload } from "@/features/media/components/media-download";
import { MediaServer } from "@/features/media/components/media-server";
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

  const { tv, media, related } = data;

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

  const detailsSection = <TvDetails tv={tv} media={media} />;

  const hasActiveDownload = torrentDownloads.some((d) => d.torrent && !d.torrent.done);

  return (
    <MediaDetailLayout
      title={tv.name || tv.original_name || ""}
      backdropPath={tv.backdrop_path}
      posterPath={tv.poster_path}
      media={media}
      download={liveDownload}
      posterData={data}
      infoSection={<TvInfo tv={tv} media={media} />}
      detailsSection={detailsSection}
      downloadTabContent={torrentDownloads.length > 0 ? <MediaDownload downloads={torrentDownloads} /> : undefined}
      downloadCount={torrentDownloads.length}
      serverTabContent={
        remoteDownloads.length > 0 ? <MediaServer downloads={remoteDownloads} mediaType="tv" /> : undefined
      }
      serverCount={remoteDownloads.length}
      defaultTab={hasActiveDownload ? "downloads" : "info"}
    >
      <TvEpisodesSection tv={tv} media={media} downloads={mediaDownloads} />
      <TvCast tv={tv} />
      <TvRelated recommendedTV={related.recommendations} />
    </MediaDetailLayout>
  );
}
