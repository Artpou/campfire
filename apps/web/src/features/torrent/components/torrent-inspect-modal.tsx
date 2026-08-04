import { Trans } from "@lingui/react/macro";
import type { Torrent } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2Icon, TriangleAlertIcon } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";

import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { torrentQueries } from "@/features/torrent/hooks/torrent.queries";

interface TorrentInspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  torrent: Torrent | null;
  magnetUri: string | null;
}

function detectQuality(name: string): string | null {
  const qualityMatch = name.match(/\b(4K|2160p|1440p|1080p|720p|480p)\b/i);
  return qualityMatch ? qualityMatch[1].toUpperCase() : null;
}

function detectLanguage(name: string): string | null {
  const nameLower = name.toLowerCase();

  if (nameLower.includes("multi")) return "MULTI";
  if (nameLower.includes("vostfr")) return "VOSTFR";
  if (nameLower.includes("french") || nameLower.match(/\bfr\b/)) return "FR";
  if (nameLower.includes("english") || nameLower.match(/\beng\b/)) return "EN";
  if (nameLower.includes("spanish") || nameLower.match(/\besp\b/)) return "ES";

  return null;
}

export function TorrentInspectModal({ open, onOpenChange, torrent, magnetUri }: TorrentInspectModalProps) {
  const { data: inspectData, isLoading, error } = useQuery(torrentQueries.inspect(magnetUri, torrent?.seeders));

  const name = inspectData?.name || torrent?.title;
  const _quality = name ? detectQuality(name) : null;
  const _language = name ? detectLanguage(name) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">{name || <Trans>Loading...</Trans>}</DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {error && (
          <div className="py-4 text-center">
            <p className="text-destructive">
              <Trans>Failed to fetch torrent metadata</Trans>
            </p>
            <p className="text-sm text-muted-foreground mt-2">{formatError(error)}</p>
          </div>
        )}

        {inspectData && (
          <div className="space-y-4">
            {inspectData.peersFound > 0 ? (
              <div className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                <div className="space-y-1">
                  <p className="font-medium">
                    <Trans>{inspectData.peersFound} peers connected</Trans>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <Trans>This torrent looks reachable from Seedarr.</Trans>
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="space-y-1">
                  <p className="font-medium text-destructive">
                    <Trans>No peers detected</Trans>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {inspectData.indexerSeeders != null && inspectData.indexerSeeders > 0 ? (
                      <Trans>
                        The indexer reports {inspectData.indexerSeeders} seeders, but Seedarr found no reachable peers.
                        The download will likely stall — try another release.
                      </Trans>
                    ) : (
                      <Trans>
                        Seedarr found no reachable peers. The download will likely stall — try another release.
                      </Trans>
                    )}
                  </p>
                </div>
              </div>
            )}

            {inspectData.trackers.length === 0 && (
              <p className="text-sm text-muted-foreground">
                <Trans>No trackers found in this torrent — peer discovery relies on DHT only.</Trans>
              </p>
            )}

            <DownloadFilesList files={inspectData.files} collapsible defaultExpanded />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
