import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeftIcon, Trash2Icon } from "lucide-react";

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
import { Button } from "@/shared/ui/button";

import { DownloadFilesList } from "@/features/downloads/components/download-files-list";
import { DownloadMetadata } from "@/features/downloads/components/download-metadata";
import { downloadQueries, useDownloadDelete } from "@/features/downloads/hooks/download.queries";
import { MediaSearchModal } from "@/features/media/components/media-search-modal";

interface MediaServerProps {
  downloads: Download[];
  mediaType?: "movie" | "tv";
}

export function MediaServer({ downloads, mediaType }: MediaServerProps) {
  if (downloads.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        <Trans>No remote files</Trans>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {downloads.map((dl) => (
        <ServerEntry key={dl.id} download={dl} mediaType={mediaType} />
      ))}
    </div>
  );
}

function ServerEntry({ download, mediaType }: { download: Download; mediaType?: "movie" | "tv" }) {
  const { t } = useLingui();
  const deleteDownload = useDownloadDelete();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangeMedia, setShowChangeMedia] = useState(false);

  const { data: remoteFiles, isLoading } = useQuery({
    ...downloadQueries.remoteFiles(download.id),
    enabled: Boolean(download.remoteLocation),
  });

  const handleDelete = () => {
    deleteDownload.mutate({ id: download.id, scope: "remote" }, { onSuccess: () => setShowDeleteConfirm(false) });
  };

  const handleUnlink = () => {
    deleteDownload.mutate(
      { id: download.id, scope: "remote", unlink: true },
      { onSuccess: () => setShowDeleteConfirm(false) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold truncate">
            {download.torrent?.name || download.remoteLocation
              ? download?.remoteLocation?.replace(/\/+$/, "").split("/").pop()
              : download.id}
          </h3>
          {download.remoteLocation && (
            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">{download.remoteLocation}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <DownloadMetadata download={download} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowChangeMedia(true)}
            aria-label={t`Change media`}
            icon={ArrowRightLeftIcon}
          />
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleteDownload.isPending}
            aria-label={t`Delete`}
            icon={Trash2Icon}
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">
          <Trans>Loading remote files…</Trans>
        </p>
      ) : remoteFiles && remoteFiles.length > 0 ? (
        <DownloadFilesList files={remoteFiles} />
      ) : null}

      <div className="border-b border-border/50" />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              <Trans>Delete Remote Files</Trans>
            </AlertDialogTitle>
            <AlertDialogDescription>
              <Trans>
                You can delete the remote files permanently or just unlink them from Seedarr (keeping files on the
                server).
              </Trans>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Trans>Cancel</Trans>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnlink}
              disabled={deleteDownload.isPending}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              <Trans>Unlink</Trans>
            </AlertDialogAction>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteDownload.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
            >
              <Trans>Delete</Trans>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
