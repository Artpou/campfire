import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { ArrowRightLeftIcon, ChevronDownIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/shared/ui/button";
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
import { downloadQueries, useDownloadDelete } from "@/features/downloads/hooks/download.queries";
import { MediaSearchModal } from "@/features/media/components/modal/media-search-modal";

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
  const deleteDownload = useDownloadDelete();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showChangeMedia, setShowChangeMedia] = useState(false);

  const { data: remoteFiles, isLoading } = useQuery({
    ...downloadQueries.remoteFiles(download.id),
    enabled: Boolean(download.remoteLocation),
  });

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

        <DropDrawer>
          <DropDrawerTrigger asChild>
            <Button variant="secondary" icon={ChevronDownIcon}>
              <Trans>Actions</Trans>
            </Button>
          </DropDrawerTrigger>
          <DropDrawerContent className="min-w-48 w-auto">
            <DropDrawerGroup>
              <DropDrawerItem
                icon={<ArrowRightLeftIcon className="size-4" />}
                onSelect={() => setShowChangeMedia(true)}
              >
                <Trans>Change media</Trans>
              </DropDrawerItem>
              <DropDrawerItem
                variant="destructive"
                icon={<Trash2Icon className="size-4" />}
                disabled={deleteDownload.isPending}
                onSelect={() => setShowDeleteConfirm(true)}
              >
                <Trans>Delete</Trans>
              </DropDrawerItem>
            </DropDrawerGroup>
          </DropDrawerContent>
        </DropDrawer>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">
          <Trans>Loading remote files…</Trans>
        </p>
      ) : remoteFiles && remoteFiles.length > 0 ? (
        <DownloadFilesList files={remoteFiles} />
      ) : null}

      <div className="border-b border-border/50" />

      <DownloadModalDelete
        open={showDeleteConfirm}
        setOpen={setShowDeleteConfirm}
        showLibraryOnly
        pending={deleteDownload.isPending}
        title={<Trans>Delete Remote Files</Trans>}
        description={
          <Trans>
            This will delete the remote files. Check the option below to only unlink them from Seedarr and keep the
            files on the server.
          </Trans>
        }
        onConfirm={(libraryOnly) => {
          deleteDownload.mutate(
            { id: download.id, scope: "remote", unlink: libraryOnly },
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
