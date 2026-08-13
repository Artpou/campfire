import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Download, Media } from "@seedarr/sdk";
import { Trash2Icon } from "lucide-react";

import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

import { useAuth } from "@/features/auth/auth-store";
import { useRole } from "@/features/auth/hooks/use-role";
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
  const [dbOnly, setDbOnly] = useState(false);

  if (!media.download?.id || !download) return null;

  const isOwner = download.userId === currentUser?.id;
  if (!isAdmin && !isOwner) return null;

  const handleDelete = () => {
    deleteDownload.mutate({ id: download.id, dbOnly }, { onSuccess: () => setOpen(false) });
  };

  return (
    <>
      <Button variant="destructive" className="w-full" onClick={() => setOpen(true)} icon={Trash2Icon}>
        <Trans>Delete</Trans>
      </Button>
      <DialogDelete
        open={open}
        setOpen={setOpen}
        validate={handleDelete}
        disabled={deleteDownload.isPending}
        title={<Trans>Delete Download</Trans>}
        description={<Trans>Are you sure you want to delete this download? This action cannot be undone.</Trans>}
        extra={
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="db-only-single"
              checked={dbOnly}
              onCheckedChange={(v: boolean | "indeterminate") => setDbOnly(v === true)}
            />
            <Label htmlFor="db-only-single" className="text-sm cursor-pointer">
              <Trans>Remove from library only (keep files on disk)</Trans>
            </Label>
          </div>
        }
      />
    </>
  );
}
