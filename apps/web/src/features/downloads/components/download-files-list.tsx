import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { TorrentInspectFile } from "@seedarr/sdk";
import { formatBytes, SUBTITLE_EXTENSIONS, VIDEO_EXTENSIONS } from "@seedarr/shared";
import { ChevronDownIcon, ChevronUpIcon, FileIcon, VideoIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Flag } from "@/shared/components/flag";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";

import { DownloadMetadata } from "@/features/downloads/components/download-metadata";

interface DownloadFilesListProps {
  className?: string;
  files: TorrentInspectFile[];
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  availableOnServer?: boolean;
  origin?: string | null;
  quality?: string | null;
  language?: string | null;
}

type FileType = "video" | "subtitle" | "other";

function getFileType(fileName: string): FileType {
  const ext = fileName.toLowerCase().split(".").pop() || "";

  if (VIDEO_EXTENSIONS.test(ext)) return "video";
  if (SUBTITLE_EXTENSIONS.test(ext)) return "subtitle";
  return "other";
}

function getVideoType(files: TorrentInspectFile[]): string {
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext && VIDEO_EXTENSIONS.test(ext)) {
      return ext.toUpperCase();
    }
  }
  return "";
}

function sortFiles(files: TorrentInspectFile[]): TorrentInspectFile[] {
  const typeOrder: Record<FileType, number> = { video: 1, subtitle: 2, other: 3 };

  return [...files].sort((a, b) => {
    const typeA = getFileType(a.name);
    const typeB = getFileType(b.name);
    return typeOrder[typeA] - typeOrder[typeB];
  });
}

export function DownloadFilesList({
  className,
  files,
  title,
  defaultExpanded = true,
  availableOnServer: _availableOnServer = false,
  origin,
  quality,
  language,
}: DownloadFilesListProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!files || files.length === 0) return null;

  const sortedFiles = sortFiles(files);
  const totalSize = files.reduce((acc, file) => acc + file.length, 0);
  const subtitleCount = files.filter((file) => getFileType(file.name) === "subtitle").length;
  const videoType = getVideoType(files);

  function getFileIcon(type: FileType, fileName: string) {
    switch (type) {
      case "video":
        return <VideoIcon className="size-4" />;
      case "subtitle":
        return <Flag lang={fileName.split(".")?.[0]?.toLowerCase()} />;
      default:
        return <FileIcon className="size-4" />;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileIcon className="size-6" />
          <h2 className="text-lg font-semibold">
            {title || <Trans>Files</Trans>} ({files.length})
          </h2>
          <div className="flex items-center gap-1">
            {videoType.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {videoType}
              </Badge>
            )}
            <DownloadMetadata origin={origin} quality={quality} language={language} className="contents" />
            {subtitleCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Trans>{subtitleCount} subtitles</Trans>
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{formatBytes(totalSize)}</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}
          </Button>
        </div>
      </div>
      <div className={cn("overflow-y-auto space-y-1 pr-2 max-h-80", className)}>
        {sortedFiles.map((file) => {
          const fileType = getFileType(file.name);
          return (
            <div
              key={file.path}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
            >
              {getFileIcon(fileType, file.name)}
              <span className="truncate flex-1 text-sm">{file.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
