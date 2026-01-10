import { useEffect, useState } from "react";

import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { getFlagUrl } from "@/shared/helpers/lang.helper";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";

import { DownloadActionButtons } from "@/features/downloads/components/download-action-buttons";
import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { DownloadNetworkCard } from "@/features/downloads/components/download-network-card";
import { DownloadNetworkChart } from "@/features/downloads/components/download-network-chart";
import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { MediaCard } from "@/features/media/components/media-card";
import { useMedia } from "@/features/media/hooks/use-media";
import {
  useDeleteTorrent,
  usePauseTorrent,
  useResumeTorrent,
  useTorrentDownload,
} from "@/features/torrent/hooks/use-torrent-download";

export const Route = createFileRoute("/_app/downloads/$id/")({
  component: DownloadDetailPage,
});

interface NetworkDataPoint {
  time: string;
  download: number;
  upload: number;
}

function DownloadDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: torrent, isLoading } = useTorrentDownload(id, { refetchInterval: 1000 });
  const { data: media } = useMedia(torrent?.mediaId ?? 0);
  const deleteTorrent = useDeleteTorrent();
  const pauseTorrent = usePauseTorrent();
  const resumeTorrent = useResumeTorrent();

  const [networkHistory, setNetworkHistory] = useState<NetworkDataPoint[]>([]);

  useEffect(() => {
    if (torrent?.live) {
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      setNetworkHistory((prev) => {
        const newData = [
          ...prev,
          {
            time: timeStr,
            download: (torrent.live?.downloadSpeed ?? 0) / 1024 / 1024, // Convert to MB/s
            upload: (torrent.live?.uploadSpeed ?? 0) / 1024 / 1024, // Convert to MB/s
          },
        ];
        // Keep only last 30 data points
        return newData.slice(-30);
      });
    }
  }, [torrent?.live]);

  const handleDelete = async () => {
    await deleteTorrent.mutateAsync(id);
    navigate({ to: "/downloads" });
  };

  const handlePause = async () => {
    await pauseTorrent.mutateAsync(id);
  };

  const handleResume = async () => {
    await resumeTorrent.mutateAsync(id);
  };

  if (!torrent) {
    return (
      <Container>
        <div className="text-center py-10">
          <Trans>Download not found</Trans>
        </div>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container>
        <AppBreadcrumb
          items={[{ name: "Downloads", link: "/downloads" }, { name: media?.title ?? "" }]}
        />
        <SeedarrLoader className="mt-16" />
      </Container>
    );
  }

  const { downloadSpeed, uploadSpeed, numPeers, downloaded, timeRemaining } = torrent?.live || {};
  const progress = torrent.live ? torrent.live.progress : torrent.status === "completed" ? 1 : 0;
  const size = torrent.live?.length ?? torrent.size;

  return (
    <Container>
      <AppBreadcrumb
        items={[{ name: "Downloads", link: "/downloads" }, { name: media?.title || torrent.name }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Main Content (66%) */}
        <div className="lg:col-span-2 overflow-y-auto">
          <Card className="p-5 space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center lg:items-start">
              {media && (
                <div className="w-32 shrink-0">
                  <MediaCard media={media} hideInfo />
                </div>
              )}

              <div className="flex flex-col">
                <h2>{media?.title || torrent.name}</h2>

                <div className="flex items-center gap-2">
                  {media?.original_language && (
                    <img
                      src={getFlagUrl(media?.original_language)}
                      alt={media?.original_language}
                      className="size-4"
                    />
                  )}
                  <p className="text-sm text-muted-foreground">{media?.original_title}</p>
                </div>

                <p className="my-2 text-sm text-muted-foreground">{media?.overview}</p>

                <DownloadMetadata
                  origin={torrent.origin}
                  quality={torrent.quality}
                  language={torrent.language}
                />
              </div>
            </div>

            {/* Actions - Mobile Only */}
            <div className="lg:hidden">
              <DownloadActionButtons id={id} onDelete={handleDelete} isMobile={true} />
            </div>

            {torrent.status !== "completed" && (
              <DownloadProgress
                progress={progress}
                downloaded={downloaded ?? 0}
                size={size}
                timeRemaining={timeRemaining}
                onClick={torrent.status === "paused" ? handleResume : handlePause}
                isPaused={torrent.status === "paused"}
              />
            )}

            {torrent.error && (
              <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                <p className="text-sm text-destructive">{torrent.error}</p>
              </div>
            )}

            {torrent.live?.files && <DownloadFilesList files={torrent.live.files} />}
          </Card>
        </div>

        {/* Right Column - Network Stats (33%) - Desktop Only */}
        <div className="hidden lg:block space-y-4 overflow-y-auto">
          <DownloadActionButtons id={id} onDelete={handleDelete} />

          {torrent.status !== "paused" && (
            <DownloadNetworkChart data={networkHistory} status={torrent.status} />
          )}

          <div className="space-y-2">
            {torrent.status !== "completed" && (
              <DownloadNetworkCard type="download" value={downloadSpeed} />
            )}
            <DownloadNetworkCard type="upload" value={uploadSpeed} />
            <DownloadNetworkCard type="peers" value={numPeers} />
            <DownloadNetworkCard
              type="ratio"
              value={(torrent.live?.uploaded ?? 0) / (torrent.live?.downloaded ?? 0)}
            />
          </div>
        </div>
      </div>
    </Container>
  );
}
