import { useMemo, useState } from "react";

import type { Media } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { DownloadCard } from "@/features/downloads/components/download-card";
import {
  type DisplayMode,
  DownloadDisplayTabs,
} from "@/features/downloads/components/download-display-tabs";
import {
  DownloadStatusTabs,
  type StatusFilter,
} from "@/features/downloads/components/download-status-tabs";
import { DownloadsGrid } from "@/features/downloads/components/downloads-grid";
import { DownloadsSeriesGroupCard } from "@/features/downloads/components/downloads-series-group-card";
import { groupDownloads } from "@/features/downloads/helpers/download-grouping";
import { useMediasByIds } from "@/features/media/hooks/use-media";
import { useTorrentDownloads } from "@/features/torrent/hooks/use-torrent-download";

export const Route = createFileRoute("/_app/downloads/")({
  component: DownloadsPage,
  beforeLoad: () => {
    const user = useAuth.getState().user;
    if (user?.role === "viewer") {
      throw redirect({ to: "/404" });
    }
  },
});

function DownloadsPage() {
  const { isLoading, data: allTorrents } = useTorrentDownloads();
  const [displayMode, setDisplayMode] = useState<DisplayMode>("grid");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const torrents = useMemo(() => {
    if (!allTorrents) return [];
    if (statusFilter === "all") return allTorrents;
    if (statusFilter === "ready") return allTorrents.filter((t) => t.status === "completed");
    return allTorrents.filter((t) => t.status === "downloading" || t.status === "queued");
  }, [allTorrents, statusFilter]);

  const mediaIds = useMemo(() => {
    const set = new Set<number>();
    for (const t of torrents) {
      if (t.mediaId) set.add(t.mediaId);
    }
    return Array.from(set);
  }, [torrents]);

  const { data: medias } = useMediasByIds(mediaIds);

  const groupedItems = useMemo(() => {
    const mediasByTvId = new Map<number, Media>();
    if (medias) {
      for (const m of medias) {
        mediasByTvId.set(m.id, m);
      }
    }
    return groupDownloads(torrents, mediasByTvId);
  }, [torrents, medias]);

  if (isLoading) {
    return (
      <Container>
        <SeedarrLoader />
      </Container>
    );
  }

  if (!allTorrents) return null;

  return (
    <Container>
      <div className="flex justify-between items-center mb-6">
        <DownloadStatusTabs value={statusFilter} onValueChange={setStatusFilter} />
        <DownloadDisplayTabs value={displayMode} onValueChange={setDisplayMode} />
      </div>

      {groupedItems.length > 0 ? (
        displayMode === "grid" ? (
          <DownloadsGrid items={groupedItems} isLoading={isLoading} />
        ) : (
          <div className="space-y-4">
            {groupedItems.map((item) => {
              if (item.kind === "tv-group") {
                return (
                  <DownloadsSeriesGroupCard
                    key={`group-${item.mediaId}`}
                    mediaId={item.mediaId}
                    downloads={item.downloads}
                  />
                );
              }
              return <DownloadCard key={item.download.id} torrent={item.download} />;
            })}
          </div>
        )
      ) : (
        <Card>
          <div className="py-10 text-center">
            <p className="text-muted-foreground">
              <Trans>No downloads yet</Trans>
            </p>
          </div>
        </Card>
      )}
    </Container>
  );
}
