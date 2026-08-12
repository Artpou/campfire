import { type ReactNode, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media, Movie, TV } from "@seedarr/sdk";
import { DownloadIcon, InfoIcon, ServerIcon, TvIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { MediaPoster } from "@/features/media/components/media-poster";
import { MediaSocialActions } from "@/features/media/components/media-social-actions";
import { getBackdropUrl, getPosterUrl } from "@/features/media/helpers/media.helper";
import { useToggleLike, useToggleWatchList } from "@/features/media/hooks/media.queries";

export type MediaDetailTab = "info" | "downloads" | "server";

type MediaDetailLayoutProps = {
  title: string;
  backdropPath?: string | null;
  posterPath?: string | null;
  media: Media | undefined;
  download?: Media["download"] | null;
  posterData: Movie | TV;
  infoSection: ReactNode;
  detailsSection: ReactNode;
  children: ReactNode;
  downloadTabContent?: ReactNode;
  downloadCount?: number;
  serverTabContent?: ReactNode;
  serverCount?: number;
  defaultTab?: MediaDetailTab;
  tab?: MediaDetailTab;
  onTabChange?: (tab: MediaDetailTab) => void;
};

export function MediaDetailLayout({
  title,
  backdropPath,
  posterPath,
  media,
  download,
  posterData,
  infoSection,
  detailsSection,
  children,
  downloadTabContent,
  downloadCount = 0,
  serverTabContent,
  serverCount = 0,
  defaultTab = "info",
  tab,
  onTabChange,
}: MediaDetailLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const toggleLike = useToggleLike();
  const toggleWatchList = useToggleWatchList();

  const _handleToggleLike = () => {
    media && toggleLike.mutate(media);
  };

  const _handleToggleWatchList = () => {
    media && toggleWatchList.mutate(media);
  };

  const showTabs = downloadCount > 0 || serverCount > 0;

  return (
    <div>
      <div className="relative w-full pb-6 pt-6 dark">
        <div
          className="absolute inset-0 bg-cover bg-center -z-10 filter"
          style={{
            backgroundImage: `url(${getBackdropUrl(backdropPath) || getPosterUrl(posterPath)})`,
          }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-background via-background/75 to-background" />
        </div>

        <Container className="flex flex-col lg:flex-row gap-8 items-center lg:items-start relative">
          <div className="xl:hidden fixed mt-20 top-0 right-4 lg:right-8 z-10">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <div className="flex flex-col gap-3">
                  <Button size="icon-lg" variant="outline" rounded icon={InfoIcon} />
                </div>
              </SheetTrigger>
              <SheetContent side="right" className="w-[350px] sm:w-[400px]">
                <SheetHeader>
                  <SheetTitle>{title}</SheetTitle>
                </SheetHeader>
                <div className="mx-4">{detailsSection}</div>
              </SheetContent>
            </Sheet>
            {media && <MediaSocialActions media={media} className="mt-2 flex flex-col" />}
          </div>

          <div className="lg:w-1/4 max-w-[250px] justify-items-center">
            <MediaPoster data={posterData} download={download ?? media?.download} />
          </div>
          <div className="lg:w-3/4">{infoSection}</div>
          <div className="hidden xl:block w-[300px]">{detailsSection}</div>
        </Container>
      </div>

      {showTabs ? (
        <Container className="pt-2">
          <Tabs
            defaultValue={tab ? undefined : defaultTab}
            value={tab}
            onValueChange={onTabChange ? (v) => onTabChange(v as MediaDetailTab) : undefined}
          >
            <TabsList size="lg">
              <TabsTrigger value="info" size="lg">
                <TvIcon />
                <Trans>Info</Trans>
              </TabsTrigger>
              {downloadCount > 0 && downloadTabContent && (
                <TabsTrigger value="downloads" size="lg">
                  <DownloadIcon />
                  <Trans>Downloads</Trans>
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {downloadCount}
                  </Badge>
                </TabsTrigger>
              )}
              {serverCount > 0 && serverTabContent && (
                <TabsTrigger value="server" size="lg">
                  <ServerIcon />
                  <Trans>Server</Trans>
                  <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0">
                    {serverCount}
                  </Badge>
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="info">
              <div className="flex flex-col gap-6 pt-4">
                <div className="w-full flex flex-col gap-6">{children}</div>
              </div>
            </TabsContent>

            {downloadCount > 0 && downloadTabContent && (
              <TabsContent value="downloads">
                <div className="pt-4">{downloadTabContent}</div>
              </TabsContent>
            )}

            {serverCount > 0 && serverTabContent && (
              <TabsContent value="server">
                <div className="pt-4">{serverTabContent}</div>
              </TabsContent>
            )}
          </Tabs>
        </Container>
      ) : (
        <Container className="flex flex-col gap-6 pt-6">
          <div className="w-full flex flex-col gap-6">{children}</div>
        </Container>
      )}
    </div>
  );
}
