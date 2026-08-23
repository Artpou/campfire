import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download, Media } from "@seedarr/sdk";
import { Trash2Icon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/shared/ui/button";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
import { DownloadModalDelete } from "@/features/downloads/components/download-modal-delete";
import { useDownloadDelete } from "@/features/downloads/hooks/download.queries";

interface DownloadButtonDeleteProps extends Omit<ButtonProps, "onClick"> {
  media: Media;
  download: Download | null | undefined;
}

export function DownloadButtonDelete({ media, download, className, ...props }: DownloadButtonDeleteProps) {
  const { isAdmin } = useRole();
  const currentUser = useAuth((s) => s.user);
  const deleteDownload = useDownloadDelete();
  const [open, setOpen] = useState(false);

  if (!media.download?.id || !download) return null;

  const isOwner = download.userId === currentUser?.id;
  if (!isAdmin && !isOwner) return null;

  return (
    <>
      <Button
        variant="destructive"
        className={cn("w-full", className)}
        onClick={() => setOpen(true)}
        icon={Trash2Icon}
        {...props}
      >
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
