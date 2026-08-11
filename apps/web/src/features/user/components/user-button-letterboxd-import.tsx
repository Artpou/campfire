import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import { ExternalLinkIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { FileDropzone } from "@/shared/ui/file-dropzone";

import { useImportLetterboxd } from "@/features/user/hooks/user.queries";

const MAX_ZIP_BYTES = 50 * 1024 * 1024;

interface UserButtonLetterboxdImportProps {
  onImported?: () => void;
}

export function UserButtonLetterboxdImport({ onImported }: UserButtonLetterboxdImportProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const importLetterboxd = useImportLetterboxd();

  const handleImport = () => {
    if (!file) return;
    importLetterboxd.mutate(file, {
      onSuccess: () => {
        setOpen(false);
        setFile(null);
        onImported?.();
      },
    });
  };

  return (
    <>
      <Button
        variant="default"
        onClick={() => {
          setFile(null);
          setOpen(true);
        }}
      >
        <Trans>Import</Trans>
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (importLetterboxd.isPending) return;
          setOpen(next);
          if (!next) setFile(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Trans>Import Letterboxd</Trans>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">1</span>
                <Trans>Export your data</Trans>
              </div>
              <p className="text-sm text-muted-foreground pl-8">
                <Trans>
                  Download your Letterboxd data export, then upload the .zip file below. This may take a few minutes on
                  Letterboxd’s side.
                </Trans>
              </p>
              <div className="pl-8">
                <Button variant="secondary" size="sm" asChild>
                  <a href="https://letterboxd.com/user/exportdata/" target="_blank" rel="noopener noreferrer">
                    <Trans>Open Letterboxd export page</Trans>
                    <ExternalLinkIcon className="size-4" />
                  </a>
                </Button>
              </div>
            </section>

            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">2</span>
                <Trans>Upload the zip</Trans>
              </div>
              <div className="pl-8">
                <FileDropzone
                  id="letterboxd-zip"
                  accept=".zip,application/zip,application/x-zip-compressed"
                  maxSizeBytes={MAX_ZIP_BYTES}
                  value={file}
                  onChange={setFile}
                  disabled={importLetterboxd.isPending}
                  hint={<Trans>Only .zip files, max 50MB</Trans>}
                />
              </div>
            </section>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={importLetterboxd.isPending}
              onClick={() => setOpen(false)}
            >
              <Trans>Cancel</Trans>
            </Button>
            <Button type="button" loading={importLetterboxd.isPending} disabled={!file} onClick={handleImport}>
              <Trans>Import</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
