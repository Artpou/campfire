import { Trans } from "@lingui/react/macro";
import type { Torrent } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";

import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
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
  const { data: inspectData, isLoading, error } = useQuery(torrentQueries.inspect(magnetUri));

  const name = inspectData?.name || torrent?.title;
  const quality = name ? detectQuality(name) : null;
  const language = name ? detectLanguage(name) : null;

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
            <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
          </div>
        )}

        {inspectData && (
          <div className="space-y-4">
            <DownloadMetadata origin={torrent?.tracker} quality={quality} language={language} />
            <DownloadFilesList files={inspectData.files} collapsible defaultExpanded />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
