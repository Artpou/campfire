import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import {
  AlertCircleIcon,
  ArrowRightLeftIcon,
  ChevronDownIcon,
  MegaphoneIcon,
  RefreshCwIcon,
  ServerIcon,
  Trash2Icon,
} from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  DropDrawer,
  DropDrawerContent,
  DropDrawerGroup,
  DropDrawerItem,
  DropDrawerTrigger,
} from "@/shared/ui/dropdrawer";

import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { DownloadModalDelete } from "@/features/downloads/components/download-modal-delete";
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
import { MediaSearchModal } from "@/features/media/components/modal/media-search-modal";
import { useStorageModule } from "@/features/module/hooks/use-module";

interface MediaDownloadProps {
  downloads: Download[];
  mediaType?: "movie" | "tv";
}

export function MediaDownload({ downloads, mediaType }: MediaDownloadProps) {
  if (downloads.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {downloads.map((dl) => (
        <DownloadEntry key={dl.id} download={dl} mediaType={mediaType} />
      ))}
    </div>
  );
}

function DownloadEntry({ download, mediaType }: { download: Download; mediaType?: "movie" | "tv" }) {
  const { t } = useLingui();
  const deleteTorrent = useDownloadDelete();
  const recheckTorrent = useDownloadRecheck();
  const reannounce = useDownloadReannounce();
  const transfer = useDownloadTransfer();
  const { isEnabled: storageRemoteEnabled } = useStorageModule();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangeMedia, setShowChangeMedia] = useState(false);

  const status = getDownloadStatus(download);
  const torrentFiles = getTorrentFiles(download);
  const hasTorrentFiles = torrentFiles.length > 0;
  const { downloadSpeed, uploadSpeed, numPeers } = download.torrent ?? {};
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isActive =
    Boolean(download.torrent && !download.torrent.done && !isPaused) || Boolean(download.torrent?.transferring);
  const hasActiveTorrentSession = isActive || isPaused;
  const showProgress = isActive || isPaused;
  const canTransfer =
    Boolean(download.torrent?.done && !download.remoteLocation && !download.torrent?.transferring) &&
    storageRemoteEnabled;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">{download.torrent?.name || download.id}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <DownloadMetadata download={download} />
            {status === "failed" && (
              <Badge variant="destructive" className="text-xs">
                <Trans>Failed</Trans>
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <DropDrawer>
            <DropDrawerTrigger asChild>
              <Button variant="secondary" icon={ChevronDownIcon}>
                <Trans>Actions</Trans>
              </Button>
            </DropDrawerTrigger>
            <DropDrawerContent>
              <DropDrawerGroup>
                {hasActiveTorrentSession && !isCompleted && (
                  <DropDrawerItem
                    icon={<RefreshCwIcon className="size-4" />}
                    disabled={recheckTorrent.isPending}
                    onSelect={() => recheckTorrent.mutate(download.id)}
                  >
                    <Trans>Recheck</Trans>
                  </DropDrawerItem>
                )}
                {hasActiveTorrentSession && !isPaused && (
                  <DropDrawerItem
                    icon={<MegaphoneIcon className="size-4" />}
                    disabled={reannounce.isPending}
                    onSelect={() => reannounce.mutate(download.id)}
                  >
                    <Trans>Reannounce</Trans>
                  </DropDrawerItem>
                )}
                {canTransfer && (
                  <DropDrawerItem
                    icon={<ServerIcon className="size-4" />}
                    disabled={transfer.isPending}
                    onSelect={() => transfer.mutate(download.id)}
                  >
                    <Trans>Transfer</Trans>
                  </DropDrawerItem>
                )}
                <DropDrawerItem
                  icon={<ArrowRightLeftIcon className="size-4" />}
                  onSelect={() => setShowChangeMedia(true)}
                >
                  <Trans>Change media</Trans>
                </DropDrawerItem>
              </DropDrawerGroup>
            </DropDrawerContent>
          </DropDrawer>
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

      <div className="border-b border-border/50" />

      <DownloadModalDelete
        open={showDeleteConfirm}
        setOpen={setShowDeleteConfirm}
        showLibraryOnly
        pending={deleteTorrent.isPending}
        description={
          <Trans>
            This will stop the torrent and delete local files. If a remote copy exists, it will not be affected.
          </Trans>
        }
        onConfirm={(libraryOnly) => {
          deleteTorrent.mutate(
            { id: download.id, scope: "torrent", dbOnly: libraryOnly },
            { onSuccess: () => setShowDeleteConfirm(false) },
          );
        }}
      />

      <MediaSearchModal
        open={showChangeMedia}
        onOpenChange={setShowChangeMedia}
        downloadId={download.id}
        mediaId={download.mediaId ?? undefined}
        mediaType={mediaType}
      />
    </div>
  );
}
