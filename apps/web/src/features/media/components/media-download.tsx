import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { formatBytes } from "@seedarr/shared";
import { AlertCircleIcon, MegaphoneIcon, RefreshCwIcon, ServerIcon, Trash2Icon } from "lucide-react";

import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { DownloadProgress } from "@/features/downloads/components/download-progress";
import { DownloadNetworkCard } from "@/features/downloads/components/network/download-network-card";
import { DownloadNetworkChart } from "@/features/downloads/components/network/download-network-chart";
import { getDownloadStatus, getTorrentFiles } from "@/features/downloads/helpers/downloads.helper";
import {
  useDownloadDelete,
  useDownloadReannounce,
  useDownloadRecheck,
  useDownloadTransfer,
} from "@/features/downloads/hooks/download.queries";
import { useStorageModule } from "@/features/module/hooks/use-module";

interface MediaDownloadProps {
  downloads: Download[];
}

export function MediaDownload({ downloads }: MediaDownloadProps) {
  if (downloads.length === 0) {
    return null;
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
  const transfer = useDownloadTransfer();
  const { isEnabled: storageRemoteEnabled } = useStorageModule();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const status = getDownloadStatus(download);
  const torrentFiles = getTorrentFiles(download);
  const hasTorrentFiles = torrentFiles.length > 0;
  const { downloadSpeed, uploadSpeed, numPeers } = download.torrent ?? {};
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isActive =
    Boolean(download.torrent && !download.torrent.done && !isPaused) || Boolean(download.torrent?.transferring);
  const hasActiveTorrentSession = isActive || isPaused;
  const totalSize = download.torrent?.length ?? 0;
  const showProgress = isActive || isPaused;
  const canTransfer =
    Boolean(download.torrent?.done && !download.remoteLocation && !download.torrent?.transferring) &&
    storageRemoteEnabled;

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
            <DownloadMetadata download={download} />
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
              icon={RefreshCwIcon}
            >
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
              icon={MegaphoneIcon}
            >
              <span className="hidden sm:inline">
                <Trans>Reannounce</Trans>
              </span>
            </Button>
          )}
          {canTransfer && (
            <Button
              variant="secondary"
              onClick={() => transfer.mutate(download.id)}
              disabled={transfer.isPending}
              aria-label={t`Transfer`}
              icon={ServerIcon}
            >
              <span className="hidden sm:inline">
                <Trans>Transfer</Trans>
              </span>
            </Button>
          )}
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteTorrent.isPending}
            aria-label={t`Delete`}
            icon={Trash2Icon}
          />
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
            <DownloadFilesList files={torrentFiles} />
          </Card>
        )}
      </div>

      {/* Separator between entries */}
      <div className="border-b border-border/50" />

      <DialogDelete
        open={showDeleteConfirm}
        setOpen={setShowDeleteConfirm}
        validate={handleDelete}
        disabled={deleteTorrent.isPending}
        title={<Trans>Delete Download</Trans>}
        description={
          <Trans>
            This will stop the torrent and delete local files. If a remote copy exists, it will not be affected.
          </Trans>
        }
      />
    </div>
  );
}
