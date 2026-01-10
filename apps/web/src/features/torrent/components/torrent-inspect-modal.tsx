import { useState } from "react";

import type { Torrent, TorrentInspectResult } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";
import { ChevronDown, ChevronUp, EarthIcon } from "lucide-react";

import { formatBytes } from "@/shared/helpers/format.helper";
import { getFlagUrl } from "@/shared/helpers/lang.helper";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Skeleton } from "@/shared/ui/skeleton";

import { useTorrentInspect } from "@/features/torrent/hooks/use-torrent";

interface TorrentInspectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  torrent: Torrent | null;
  magnetUri: string | null;
}

function detectQuality(name: string): string | null {
  const qualityMatch = name.match(/\b(4K|2160p|1440p|1080p|720p|480p)\b/i);
  return qualityMatch ? qualityMatch[1].toUpperCase() : null;
}

function detectLanguages(name: string): string[] {
  const languages: string[] = [];
  const nameLower = name.toLowerCase();

  if (nameLower.includes("multi")) languages.push("MULTI");
  if (nameLower.includes("vostfr")) languages.push("VOSTFR");
  if (nameLower.includes("french") || nameLower.includes("fr")) languages.push("FR");
  if (nameLower.includes("english") || nameLower.includes("eng")) languages.push("EN");
  if (nameLower.includes("spanish") || nameLower.includes("esp")) languages.push("ES");

  return languages.length > 0 ? languages : ["Original"];
}

function getSubtitles(files: TorrentInspectResult["files"]) {
  return files.filter((file) => file.name.endsWith(".srt") || file.name.endsWith(".vtt"));
}

function getFileTypes(files: TorrentInspectResult["files"]): string[] {
  const types = new Set<string>();
  for (const file of files) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext && ["mkv", "mp4", "avi", "mov", "webm"].includes(ext)) {
      types.add(ext.toUpperCase());
    }
  }
  return Array.from(types);
}

function detectSubtitleLanguages(files: TorrentInspectResult["files"]): string[] {
  const languages = new Set<string>();
  const subtitles = getSubtitles(files);

  for (const file of subtitles) {
    const fileName = file.name.toLowerCase();
    // Try to extract language code from filename
    const match2 = fileName.match(/\.([a-z]{2})\.(srt|vtt)$/i);
    const match3 = fileName.match(/\.([a-z]{3})\.(srt|vtt)$/i);

    if (match2) languages.add(match2[1]);
    else if (match3) languages.add(match3[1]);
  }

  return Array.from(languages);
}

export function TorrentInspectModal({
  open,
  onOpenChange,
  torrent,
  magnetUri,
}: TorrentInspectModalProps) {
  const { data: inspectData, isLoading, error } = useTorrentInspect(magnetUri);
  const [showFiles, setShowFiles] = useState(false);

  const quality = torrent ? detectQuality(torrent.title) : null;
  const audioLanguages = inspectData ? detectLanguages(inspectData.name) : [];
  const subtitles = inspectData ? getSubtitles(inspectData.files) : [];
  const subtitleLanguages = inspectData ? detectSubtitleLanguages(inspectData.files) : [];
  const fileTypes = inspectData ? getFileTypes(inspectData.files) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {inspectData?.name || torrent?.title || <Trans>Loading...</Trans>}
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-4 py-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {error && (
          <div className="py-4 text-center">
            <p className="text-destructive">
              <Trans>Failed to fetch torrent metadata</Trans>
            </p>
            <p className="text-sm text-muted-foreground mt-2">{(error as Error).message}</p>
          </div>
        )}

        {inspectData && (
          <div className="space-y-4">
            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Types */}
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <Trans>Types</Trans>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {fileTypes.length > 0 ? (
                    fileTypes.map((type) => (
                      <Badge key={type} variant="secondary">
                        {type}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm">N/A</span>
                  )}
                </div>
              </Card>

              {/* Quality */}
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <Trans>Quality</Trans>
                </p>
                {quality ? (
                  <Badge variant="secondary">{quality}</Badge>
                ) : (
                  <span className="text-sm">N/A</span>
                )}
              </Card>

              {/* Subtitles */}
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <Trans>Subtitles</Trans> ({subtitles.length})
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {subtitleLanguages.length > 0 ? (
                    subtitleLanguages.map((lang) => (
                      <img
                        key={lang}
                        src={getFlagUrl(lang)}
                        alt={lang}
                        className="size-5"
                        title={lang}
                      />
                    ))
                  ) : (
                    <span className="text-sm">
                      <Trans>None</Trans>
                    </span>
                  )}
                </div>
              </Card>

              {/* Audio Languages */}
              <Card className="p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  <Trans>Audio Languages</Trans>
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {audioLanguages.map((lang) =>
                    lang === "MULTI" ? (
                      <Badge key={lang} variant="secondary" className="flex items-center gap-1">
                        <EarthIcon className="size-3" />
                        {lang}
                      </Badge>
                    ) : (
                      <Badge key={lang} variant="secondary">
                        {lang}
                      </Badge>
                    ),
                  )}
                </div>
              </Card>
            </div>

            {/* Total Size */}
            <Card className="p-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  <Trans>Total Size</Trans>
                </p>
                <p className="text-lg font-bold">{formatBytes(inspectData.totalSize)}</p>
              </div>
            </Card>

            {/* Files Toggle */}
            <Card className="p-4">
              <Button
                variant="ghost"
                className="w-full flex justify-between items-center"
                onClick={() => setShowFiles(!showFiles)}
              >
                <span className="text-sm font-semibold">
                  <Trans>Files</Trans> ({inspectData.files.length})
                </span>
                {showFiles ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              </Button>

              {showFiles && (
                <ScrollArea className="h-[300px] mt-4 border rounded-lg">
                  <div className="p-4 space-y-2">
                    {inspectData.files.map((file, index) => (
                      <div
                        key={`${file.path}-${index}`}
                        className="flex justify-between items-start gap-4 py-2 border-b last:border-b-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{file.path}</p>
                        </div>
                        <p className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                          {formatBytes(file.length)}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
