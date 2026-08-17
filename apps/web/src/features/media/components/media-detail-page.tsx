import { type ReactNode, useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download, Movie, TV } from "@seedarr/sdk";
import { DownloadIcon, ServerIcon, TvIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ResponsiveTabs } from "@/shared/components/responsive-tabs";
import { useTheme } from "@/shared/hooks/use-theme";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";

import { MediaDetails } from "@/features/media/components/media-details";
import { MediaDownload } from "@/features/media/components/media-download";
import { MediaInfo } from "@/features/media/components/media-info";
import { MediaPoster } from "@/features/media/components/media-poster";
import { MediaServer } from "@/features/media/components/media-server";
import { MediaSocialActions } from "@/features/media/components/media-social-actions";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";

export type MediaDetailTab = "info" | "downloads" | "server";

interface MediaDetailPageProps {
  data: Movie | TV;
  download?: Download | null;
  torrentDownloads?: Download[];
  remoteDownloads?: Download[];
  tab: MediaDetailTab;
  onTabChange: (tab: MediaDetailTab) => void;
  /** Type-specific content under MediaInfo (episodes, related…). */
  children?: ReactNode;
}

export function MediaDetailPage({
  data,
  download,
  torrentDownloads = [],
  remoteDownloads = [],
  tab,
  onTabChange,
  children,
}: MediaDetailPageProps) {
  const { theme } = useTheme();

  const media = data.media;
  const isMovie = "movie" in data;
  const item = isMovie ? data.movie : data.tv;
  const backdropPath = item.backdrop_path;
  const posterPath = item.poster_path;
  const mediaType = isMovie ? "movie" : "tv";
  const title =
    ("title" in item && item.title) ||
    ("name" in item && item.name) ||
    ("original_title" in item && item.original_title) ||
    ("original_name" in item && item.original_name) ||
    "";

  const showDownloads = torrentDownloads.length > 0;
  const showServer = remoteDownloads.length > 0;
  const showTabs = showDownloads || showServer;

  const tabOptions = useMemo(
    () => [
      { value: "info", label: <Trans>Info</Trans>, icon: TvIcon },
      ...(showDownloads
        ? [
            {
              value: "downloads",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Trans>Downloads</Trans>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {torrentDownloads.length}
                  </Badge>
                </span>
              ),
              icon: DownloadIcon,
            },
          ]
        : []),
      ...(showServer
        ? [
            {
              value: "server",
              label: (
                <span className="inline-flex items-center gap-1.5">
                  <Trans>Server</Trans>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                    {remoteDownloads.length}
                  </Badge>
                </span>
              ),
              icon: ServerIcon,
            },
          ]
        : []),
    ],
    [showDownloads, showServer, torrentDownloads.length, remoteDownloads.length],
  );

  const tabsControl = showTabs ? (
    <ResponsiveTabs value={tab} onValueChange={(v) => onTabChange(v as MediaDetailTab)} options={tabOptions} />
  ) : null;

  return (
    <div>
      <div className="relative w-full pb-8 pt-6">
        <div
          className="absolute inset-0 bg-cover w-full h-[50vh] bg-center -z-10 filter"
          style={{
            backgroundImage: `url(${getBackdropUrl(backdropPath) || getPosterUrl(posterPath)})`,
          }}
        >
          <div
            className={cn(
              "absolute inset-0 bg-linear-to-b from-background to-background",
              theme === "dark" ? " via-background/85" : " via-background/70",
            )}
          />
        </div>

        <Container className="relative flex flex-col gap-6">
          <div className="lg:hidden">{tabsControl}</div>

          <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 gap-8 items-start">
            <aside className="lg:col-span-1">
              <MediaPoster data={data} download={download ?? media?.download} />
            </aside>

            <div className="lg:col-span-3 xl:col-span-4 flex">
              <div className="flex flex-col gap-3 min-w-0 w-full">
                {tabsControl && <div className="hidden lg:block">{tabsControl}</div>}
                {media && (
                  <div className="flex xl:hidden ">
                    <MediaSocialActions media={media} />
                  </div>
                )}
                {(!showTabs || tab === "info") && (
                  <div className="flex flex-col gap-6">
                    <div className="flex">
                      <MediaInfo data={data} />
                      <aside className="hidden xl:flex flex-col gap-6 min-w-56 ml-6">
                        {media && <MediaSocialActions media={media} />}
                        <div>
                          <p className="sr-only">{title}</p>
                          <MediaDetails data={data} />
                        </div>
                      </aside>
                    </div>
                    {children}
                  </div>
                )}
                {showTabs && tab === "downloads" && showDownloads && (
                  <Card className="p-4">
                    <MediaDownload downloads={torrentDownloads} />
                  </Card>
                )}
                {showTabs && tab === "server" && showServer && (
                  <Card className="p-4 w-full">
                    <MediaServer downloads={remoteDownloads} mediaType={mediaType} />
                  </Card>
                )}
              </div>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
}
