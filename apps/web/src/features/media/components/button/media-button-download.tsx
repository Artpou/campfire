import { Trans } from "@lingui/react/macro";
import type { DownloadableFile, Media } from "@seedarr/sdk";
import { formatBytes } from "@seedarr/shared";
import { DownloadIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

import { useDownloadFile } from "@/features/downloads/hooks/download.queries";

interface MediaDownloadButtonProps extends Omit<ButtonProps, "onClick"> {
  media: Media;
  videoFile: DownloadableFile;
}

export const MediaDownloadButton = ({ media, videoFile, className, ...props }: MediaDownloadButtonProps) => {
  const downloadFile = useDownloadFile();

  if (!videoFile || !media.download) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            className={cn("w-full", className)}
            onClick={() => downloadFile.mutateAsync(media?.download?.id ?? "")}
            icon={DownloadIcon}
            {...props}
          >
            <Trans>Download</Trans>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <Trans>{formatBytes(videoFile.size)}</Trans>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
