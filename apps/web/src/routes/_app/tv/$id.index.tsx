import { useMemo } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaDetailLayout, type MediaDetailTab } from "@/features/media/components/media-detail-layout";
import { MediaDownload } from "@/features/media/components/media-download";
import { MediaServer } from "@/features/media/components/media-server";
import { TvCast } from "@/features/tv/components/tv-cast";
import { TvDetails } from "@/features/tv/components/tv-details";
import { TvEpisodesSection } from "@/features/tv/components/tv-episodes-section";
import { TvInfo } from "@/features/tv/components/tv-info";
import { TvRelated } from "@/features/tv/components/tv-related";
import { tvQueries } from "@/features/tv/hooks/tv.queries";

const VALID_TABS: MediaDetailTab[] = ["info", "downloads", "server"];

function validateSearch(search: Record<string, unknown>): { tab?: MediaDetailTab } {
  const tab = search.tab;
  if (typeof tab === "string" && (VALID_TABS as string[]).includes(tab)) return { tab: tab as MediaDetailTab };
  return {};
}

export const Route = createFileRoute("/_app/tv/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(tvQueries.details(params.id, countryToTmdbLocale(context.language))),
  component: TVPage,
  validateSearch,
});

function TVPage() {
  const params = Route.useParams();
  const { tab: urlTab } = Route.useSearch();
  const navigate = useNavigate();
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

  const detailsSection = <TvDetails tv={tv} />;

  const hasActiveDownload = torrentDownloads.some((d) => d.torrent && !d.torrent.done);

  const effectiveTab = useMemo(() => {
    if (urlTab === "downloads" && torrentDownloads.length === 0) return "info";
    if (urlTab === "server" && remoteDownloads.length === 0) return "info";
    return urlTab;
  }, [urlTab, torrentDownloads.length, remoteDownloads.length]);

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
      tab={effectiveTab}
      onTabChange={(t) => navigate({ to: ".", search: { tab: t === "info" ? undefined : t }, replace: true })}
    >
      <TvEpisodesSection tv={tv} media={media} downloads={mediaDownloads} />
      <TvCast tv={tv} />
      <TvRelated recommendedTV={related.recommendations} />
    </MediaDetailLayout>
  );
}
