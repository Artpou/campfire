import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { toast } from "sonner";

import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

import { MediaSearchPicker } from "@/features/media/components/modal/media-search-modal";
import { useManualSync } from "@/features/settings/hooks/remote-sync.queries";

interface SyncError {
  name: string;
  path: string;
  type: "movie" | "tv";
}

interface ManualSyncWizardProps {
  files: SyncError[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualSyncWizard({ files, open, onOpenChange }: ManualSyncWizardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const manualSync = useManualSync();

  const currentFile = files[currentIndex];
  const isLast = currentIndex >= files.length - 1;
  const progress = `${currentIndex + 1} / ${files.length}`;

  const handleClose = () => {
    setCurrentIndex(0);
    setSelectedMedia(null);
    onOpenChange(false);
  };

  const goToNext = () => {
    setSelectedMedia(null);
    if (isLast) {
      handleClose();
      toast.success(`Manual sync complete`);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    goToNext();
  };

  const handleSave = () => {
    if (!selectedMedia || !currentFile) return;
    manualSync.mutate(
      { remotePath: currentFile.path, mediaId: selectedMedia.id, type: currentFile.type },
      { onSuccess: goToNext },
    );
  };

  if (!currentFile) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            <Trans>Manual sync</Trans>
            <span className="text-sm text-muted-foreground font-normal ml-2">({progress})</span>
          </DialogTitle>
        </DialogHeader>

        <MediaSearchPicker
          key={currentIndex}
          mediaType={currentFile.type}
          selectedMedia={selectedMedia}
          onSelect={setSelectedMedia}
          fileName={currentFile.name}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <Trans>Cancel</Trans>
          </Button>
          <Button variant="secondary" onClick={handleSkip}>
            <Trans>Skip</Trans>
          </Button>
          <Button onClick={handleSave} disabled={!selectedMedia || manualSync.isPending}>
            <Trans>Save</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
