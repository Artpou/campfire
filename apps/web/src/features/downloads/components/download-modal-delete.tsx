import { useEffect, useId, useState } from "react";

import { Trans } from "@lingui/react/macro";

import { DialogDelete } from "@/shared/components/dialog/dialog-delete";
import { Checkbox } from "@/shared/ui/checkbox";
import { Label } from "@/shared/ui/label";

interface DownloadModalDeleteProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onConfirm: (libraryOnly: boolean) => void;
  pending?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  showLibraryOnly?: boolean;
}

export function DownloadModalDelete({
  open,
  setOpen,
  onConfirm,
  pending,
  title,
  description,
  showLibraryOnly,
}: DownloadModalDeleteProps) {
  const checkboxId = useId();
  const [libraryOnly, setLibraryOnly] = useState(false);

  useEffect(() => {
    if (!open) setLibraryOnly(false);
  }, [open]);

  return (
    <DialogDelete
      open={open}
      setOpen={setOpen}
      validate={() => onConfirm(libraryOnly)}
      disabled={pending}
      title={title ?? <Trans>Delete Download</Trans>}
      description={
        description ?? <Trans>Are you sure you want to delete this download? This action cannot be undone.</Trans>
      }
      extra={
        showLibraryOnly ? (
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id={checkboxId}
              checked={libraryOnly}
              onCheckedChange={(value: boolean | "indeterminate") => setLibraryOnly(value === true)}
            />
            <Label htmlFor={checkboxId} className="text-sm cursor-pointer">
              <Trans>Remove from library only (keep files on disk)</Trans>
            </Label>
          </div>
        ) : null
      }
    />
  );
}
