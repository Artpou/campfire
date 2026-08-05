import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { formatBytes } from "@seedarr/shared";
import { AlertCircleIcon, MegaphoneIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { DownloadNetworkCard } from "@/features/downloads/components/download-network-card";
import { DownloadNetworkChart } from "@/features/downloads/components/download-network-chart";
import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { getDownloadStatus, getTorrentFiles } from "@/features/downloads/helpers/downloads.helper";
import {
  useDownloadDelete,
  useDownloadReannounce,
  useDownloadRecheck,
} from "@/features/downloads/hooks/download.queries";

interface MediaDownloadTabProps {
  downloads: Download[];
}

export function MediaDownloadTab({ downloads }: MediaDownloadTabProps) {
  if (downloads.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        <Trans>No downloads yet</Trans>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {downloads.map((dl) => (
        <DownloadEntry key={dl.id} download={dl} />
      ))}
    </div>
  );
}

function DownloadEntry({ download }: { download: Download }) {
  const { t } = useLingui();
  const deleteTorrent = useDownloadDelete();
  const recheckTorrent = useDownloadRecheck();
  const reannounce = useDownloadReannounce();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const status = getDownloadStatus(download);
  const torrentFiles = getTorrentFiles(download);
  const hasTorrentFiles = torrentFiles.length > 0;
  const { downloadSpeed, uploadSpeed, numPeers } = download.torrent ?? {};
  const metadata = { origin: download.origin, quality: download.quality, language: download.language };

  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isActive =
    Boolean(download.torrent && !download.torrent.done && !isPaused) || Boolean(download.torrent?.transferring);
  const hasActiveTorrentSession = isActive || isPaused;
  const totalSize = download.torrent?.length ?? 0;
  const showProgress = isActive || isPaused;

  const handleDelete = () => {
    deleteTorrent.mutate({ id: download.id, scope: "torrent" }, { onSuccess: () => setShowDeleteConfirm(false) });
  };

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{download.torrent?.name || download.id}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <DownloadMetadata {...metadata} />
            {totalSize > 0 && <span className="text-xs text-muted-foreground">{formatBytes(totalSize)}</span>}
            {status === "failed" && (
              <Badge variant="destructive" className="text-xs">
                <Trans>Failed</Trans>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {hasActiveTorrentSession && !isCompleted && (
            <Button
              variant="secondary"
              onClick={() => recheckTorrent.mutate(download.id)}
              disabled={recheckTorrent.isPending}
              aria-label={t`Force recheck`}
            >
              <RefreshCwIcon className="size-3.5" />
              <span className="hidden sm:inline">
                <Trans>Recheck</Trans>
              </span>
            </Button>
          )}
          {hasActiveTorrentSession && !isPaused && (
            <Button
              variant="secondary"
              onClick={() => reannounce.mutate(download.id)}
              disabled={reannounce.isPending}
              aria-label={t`Force reannounce`}
            >
              <MegaphoneIcon className="size-3.5" />
              <span className="hidden sm:inline">
                <Trans>Reannounce</Trans>
              </span>
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteTorrent.isPending}
            aria-label={t`Delete`}
          >
            <Trash2Icon className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {download.error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircleIcon className="size-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{download.error}</p>
        </div>
      )}

      {showProgress && (
        <Card className="p-4 gap-0">
          <DownloadProgress download={download} size="lg" />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <DownloadNetworkChart download={download} />
          <div className="grid grid-cols-2 gap-2">
            {!isCompleted && <DownloadNetworkCard type="download" value={downloadSpeed} />}
            <DownloadNetworkCard type="upload" value={uploadSpeed} />
            <DownloadNetworkCard type="peers" value={numPeers} />
          </div>
        </div>
        {hasTorrentFiles && (
          <Card className="p-4 gap-0">
            <DownloadFilesList files={torrentFiles} {...metadata} />
          </Card>
        )}
      </div>

      {/* Separator between entries */}
      <div className="border-b border-border/50" />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Delete Download</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                This will stop the torrent and delete local files. If a remote copy exists, it will not be affected.
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteTorrent.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              <Trans>Delete</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
