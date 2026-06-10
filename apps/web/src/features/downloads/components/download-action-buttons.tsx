import { Trans } from "@lingui/react/macro";
import { PlayIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface DownloadActionButtonsProps {
  id: string;
  onDelete: () => void;
  isMobile?: boolean;
}

export function DownloadActionButtons({ id, onDelete, isMobile = false }: DownloadActionButtonsProps) {
  return (
    <div className="flex gap-2">
      <Button variant="destructive" size="lg" onClick={onDelete} className={isMobile ? "" : "lg:w-auto"}>
        <Trash2Icon className="size-5" />
        {isMobile && (
          <span className="ml-2">
            <Trans>Delete</Trans>
          </span>
        )}
      </Button>
      <Button size="lg" asChild className="flex-1">
        <a href={`/downloads/${id}/play`}>
          <PlayIcon className="mr-2 size-5" />
          <Trans>Play</Trans>
        </a>
      </Button>
    </div>
  );
}
