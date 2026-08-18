import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download, Media } from "@seedarr/sdk";
import { Trash2Icon } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { DownloadModalDelete } from "@/features/downloads/components/download-modal-delete";
import { useDownloadDelete } from "@/features/downloads/hooks/download.queries";

interface DownloadButtonDeleteProps {
  media: Media;
  download: Download | null | undefined;
}

export function DownloadButtonDelete({ media, download }: DownloadButtonDeleteProps) {
  const { isAdmin } = useRole();
  const currentUser = useAuth((s) => s.user);
  const deleteDownload = useDownloadDelete();
  const [open, setOpen] = useState(false);

  if (!media.download?.id || !download) return null;

  const isOwner = download.userId === currentUser?.id;
  if (!isAdmin && !isOwner) return null;

  return (
    <>
      <Button variant="destructive" className="w-full" onClick={() => setOpen(true)} icon={Trash2Icon}>
        <Trans>Delete</Trans>
      </Button>
      <DownloadModalDelete
        open={open}
        setOpen={setOpen}
        showLibraryOnly
        pending={deleteDownload.isPending}
        onConfirm={(libraryOnly) => {
          deleteDownload.mutate({ id: download.id, dbOnly: libraryOnly }, { onSuccess: () => setOpen(false) });
        }}
      />
    </>
  );
}
