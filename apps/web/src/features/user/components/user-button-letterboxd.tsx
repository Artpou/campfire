import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";
import { MAX_ZIP_BYTES } from "@seedarr/shared";
import { ExternalLinkIcon, FolderArchiveIcon, RefreshCwIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { FileDropzone } from "@/shared/ui/file-dropzone";

import { useModule } from "@/features/module/hooks/use-module";
import { useImportLetterboxd, useSyncLetterboxd } from "@/features/user/hooks/user.queries";

interface UserButtonLetterboxdProps {
  user: User;
  variant?: "default" | "card";
  className?: string;
}

export function UserButtonLetterboxd({ user, variant = "default", className }: UserButtonLetterboxdProps) {
  const { isAvailable, isLoading } = useModule("letterboxd");
  const syncLetterboxd = useSyncLetterboxd();
  const importLetterboxd = useImportLetterboxd();
  const connected = Boolean(user.letterboxdUsername);
  const [importOpen, setImportOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  if (isLoading || !isAvailable) return null;

  const handleImport = () => {
    if (!file) return;
    importLetterboxd.mutate(file, {
      onSuccess: () => {
        setImportOpen(false);
        setFile(null);
      },
    });
  };

  const actions = (
    <div className="flex items-center gap-2 shrink-0">
      <Button
        size="sm"
        onClick={() => {
          setFile(null);
          setImportOpen(true);
        }}
        icon={FolderArchiveIcon}
      >
        <Trans>Import</Trans>
      </Button>
      {connected && (
        <Button
          variant="secondary"
          size="sm"
          loading={syncLetterboxd.isPending}
          onClick={() => syncLetterboxd.mutate()}
          icon={RefreshCwIcon}
        >
          <Trans>Sync</Trans>
        </Button>
      )}
    </div>
  );

  return (
    <>
      {variant === "card" ? (
        <div className={cn("border-border space-y-4 rounded-xl border p-4", className)}>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <img src="/profile/letterboxd.png" alt="" className="size-4 rounded-full" />
            Letterboxd
          </h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            <Trans>Import your Letterboxd export to sync ratings and watched films into Seedarr.</Trans>
          </p>
          {connected && (
            <p className="text-muted-foreground text-xs">
              <Trans>Connected as {user.letterboxdUsername}</Trans>
            </p>
          )}
          {actions}
        </div>
      ) : (
        <Card className={cn("flex flex-row items-center gap-3 py-2 px-6", className)}>
          <img src="/profile/letterboxd.png" alt="Letterboxd" className="size-6 rounded-full shrink-0" />
          <span className="text-sm font-medium truncate">Letterboxd</span>
          <div className="ml-auto">{actions}</div>
        </Card>
      )}

      <Dialog
        open={importOpen}
        onOpenChange={(next) => {
          if (importLetterboxd.isPending) return;
          setImportOpen(next);
          if (!next) setFile(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              <Trans>Import Letterboxd</Trans>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <section className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="flex size-6 items-center justify-center rounded-full bg-muted text-xs">1</span>
                <Trans>Export your data</Trans>
              </div>
              <div className="pl-8 space-y-2 text-sm text-muted-foreground">
                <p>
                  <Trans>From Letterboxd settings, request a data export and download the zip when ready.</Trans>
                </p>
                <a
                  href="https://letterboxd.com/settings/data/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  letterboxd.com/settings/data
                  <ExternalLinkIcon className="size-3.5" />
                </a>
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
              variant="secondary"
              disabled={importLetterboxd.isPending}
              onClick={() => setImportOpen(false)}
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
