import { useMemo } from "react";

import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { countryToTmdbLocale } from "@/shared/helpers/i18n.helper";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";

import { downloadQueries } from "@/features/downloads/hooks/download.queries";
import { MediaCarouselCast } from "@/features/media/components/carousel/media-carousel-cast";
import { MediaDetailPage, type MediaDetailTab } from "@/features/media/components/media-detail-page";
import { TvEpisodesSection } from "@/features/tv/components/tv-episodes-section";
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
  const hasActiveDownload = torrentDownloads.some((d) => d.torrent && !d.torrent.done);

  const tab = useMemo((): MediaDetailTab => {
    if (urlTab === "downloads" && torrentDownloads.length === 0) return "info";
    if (urlTab === "server" && remoteDownloads.length === 0) return "info";
    if (urlTab) return urlTab;
    return hasActiveDownload ? "downloads" : "info";
  }, [urlTab, torrentDownloads.length, remoteDownloads.length, hasActiveDownload]);

  return (
    <MediaDetailPage
      data={data}
      download={liveDownload}
      torrentDownloads={torrentDownloads}
      remoteDownloads={remoteDownloads}
      tab={tab}
      onTabChange={(t) => navigate({ to: ".", search: { tab: t }, replace: true })}
    >
      <TvEpisodesSection tv={tv} media={media} downloads={mediaDownloads} />
      <MediaCarouselCast data={data} />
      <TvRelated recommendedTV={related.recommendations} />
    </MediaDetailPage>
  );
}
