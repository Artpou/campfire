import { Trans } from "@lingui/react/macro";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Clock, ExternalLink, Play, Trash2 } from "lucide-react";

import { AppBreadcrumb } from "@/shared/components/app-breadcrumb";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";
import { Progress } from "@/shared/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { DownloadStats } from "@/features/downloads/components/download-stats";
import { DownloadStatusBadge } from "@/features/downloads/components/download-status-badge";
import { MediaCard } from "@/features/media/components/media-card";
import { useMedia } from "@/features/media/hooks/use-media";
import {
  useDeleteTorrent,
  useTorrentDownload,
} from "@/features/torrent/hooks/use-torrent-download";

export const Route = createFileRoute("/_app/downloads/$downloadId/")({
  component: DownloadDetailPage,
});

function DownloadDetailPage() {
  const { downloadId } = Route.useParams();
  const navigate = useNavigate();
  const { data: torrent } = useTorrentDownload(downloadId);
  const { data: media } = useMedia(torrent?.mediaId ?? 0);
  const deleteTorrent = useDeleteTorrent();

  const handleDelete = async () => {
    await deleteTorrent.mutateAsync(downloadId);
    navigate({ to: "/downloads" });
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

  const progress = torrent.live ? torrent.live.progress : torrent.status === "completed" ? 1 : 0;
  const downloadSpeed = torrent.live?.downloadSpeed ?? 0;
  const uploadSpeed = torrent.live?.uploadSpeed ?? 0;
  const numPeers = torrent.live?.numPeers ?? 0;
  const size = torrent.live?.length ?? torrent.size;
  const downloaded = torrent.live?.downloaded ?? 0;
  const uploaded = torrent.live?.uploaded ?? 0;
  const timeRemaining = torrent.live?.timeRemaining ?? 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
  };

  const formatTime = (ms: number) => {
    if (!Number.isFinite(ms) || ms < 0) return "∞";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <Container>
      <AppBreadcrumb
        items={[{ name: "Downloads", link: "/downloads" }, { name: media?.title || torrent.name }]}
      />

      {/* Main Content */}
      <div className="grid gap-6">
        <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Poster */}
            <div className="w-full md:w-[300px] shrink-0">
              {media && (
                <div className="w-full h-full ml-2">
                  <MediaCard media={media} />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 p-6 space-y-6">
              {/* Title and URL */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <h2 className="text-xl font-semibold flex-1">{media?.title || torrent.name}</h2>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="size-5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-md">
                        <p className="text-xs break-all">{torrent.magnetUri}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Media Description */}
                {media?.overview && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{media.overview}</p>
                )}

                {/* Metadata Badges */}
                <DownloadMetadata
                  origin={torrent.origin}
                  quality={torrent.quality}
                  language={torrent.language}
                  className="pt-2"
                />
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{(progress * 100).toFixed(1)}%</span>
                  {timeRemaining > 0 && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      <span>{formatTime(timeRemaining)}</span>
                    </div>
                  )}
                </div>
                <Progress value={progress * 100} className="h-3" />
              </div>

              {/* Stats Grid */}
              <DownloadStats
                downloadSpeed={downloadSpeed}
                uploadSpeed={uploadSpeed}
                numPeers={numPeers}
                size={size}
                downloaded={downloaded}
                uploaded={uploaded}
              />

              {/* Error */}
              {torrent.error && (
                <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-sm text-destructive">{torrent.error}</p>
                </div>
              )}

              {/* Files List */}
              {torrent.live?.files && torrent.live.files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    <Trans>Files</Trans> ({torrent.live.files.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {torrent.live.files.map((file) => (
                      <div
                        key={file.path}
                        className="text-sm flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-muted-foreground text-xs ml-2">
                          {formatBytes(file.length)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                {torrent.status === "downloading" && (
                  <Button variant="secondary" asChild>
                    <a
                      href={`/api/torrents/download/${torrent.id}/stream`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Play className="mr-2 size-4" />
                      <Trans>Preview Stream</Trans>
                    </a>
                  </Button>
                )}
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="mr-2 size-4" />
                  <Trans>Delete</Trans>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Container>
  );
}
