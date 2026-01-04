import { useState } from "react";

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

  if (!allTorrents) return null;

  // Filter torrents based on status
  const torrents =
    statusFilter === "all"
      ? allTorrents
      : statusFilter === "ready"
        ? allTorrents.filter((t) => t.status === "completed")
        : allTorrents.filter((t) => t.status === "downloading" || t.status === "queued");

  if (isLoading) {
    return (
      <Container>
        <SeedarrLoader />
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex justify-between items-center mb-6">
        <DownloadStatusTabs value={statusFilter} onValueChange={setStatusFilter} />
        <DownloadDisplayTabs value={displayMode} onValueChange={setDisplayMode} />
      </div>

      {torrents && torrents.length > 0 ? (
        displayMode === "grid" ? (
          <DownloadsGrid items={torrents} isLoading={isLoading} />
        ) : (
          <div className="space-y-4">
            {torrents.map((torrent) => (
              <DownloadCard key={torrent.id} torrent={torrent} />
            ))}
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
