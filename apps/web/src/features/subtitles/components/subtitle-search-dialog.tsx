import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { SubdlSubtitle } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { DownloadIcon, StarIcon, SubtitlesIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";

import { getTorrentFiles } from "@/features/downloads/helpers/downloads.helper";
import { downloadQueries } from "@/features/torrent/hooks/download.queries";
import {
  collectAddedSubtitleLanguages,
  isMatchingSubtitleRelease,
  sortSubtitlesByTitleMatch,
} from "../helpers/subtitle.helper";
import { subtitleQueries, useDownloadSubtitle } from "../hooks/subtitle.queries";

const SUBDL_LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "FR", label: "French" },
  { code: "ES", label: "Spanish" },
  { code: "DE", label: "German" },
  { code: "IT", label: "Italian" },
  { code: "PT", label: "Portuguese" },
  { code: "NL", label: "Dutch" },
  { code: "PL", label: "Polish" },
  { code: "RU", label: "Russian" },
  { code: "JA", label: "Japanese" },
  { code: "KO", label: "Korean" },
] as const;

export interface SubtitleSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tmdbId: string;
  downloadId: string;
  mediaTitle: string;
}

export function SubtitleSearchDialog({
  open,
  onOpenChange,
  tmdbId,
  downloadId,
  mediaTitle,
}: SubtitleSearchDialogProps) {
  const [language, setLanguage] = useState("EN");
  const { data, isLoading, error } = useQuery({
    ...subtitleQueries.search(tmdbId, language),
    enabled: open,
  });
  const { data: externalSubtitles } = useQuery({
    ...subtitleQueries.external(downloadId),
    enabled: open,
  });
  const { data: download } = useQuery({
    ...downloadQueries.details(downloadId),
    enabled: open,
  });
  const downloadSubtitle = useDownloadSubtitle();

  const addedLanguages = useMemo(() => {
    const torrentFileNames = download ? getTorrentFiles(download).map((file) => file.name) : [];
    return collectAddedSubtitleLanguages(mediaTitle, externalSubtitles?.paths ?? [], torrentFileNames);
  }, [download, externalSubtitles?.paths, mediaTitle]);

  const subtitles = useMemo(
    () => sortSubtitlesByTitleMatch(data?.subtitles ?? [], mediaTitle),
    [data?.subtitles, mediaTitle],
  );

  const handleDownload = (input: { downloadId: string; url: string; language: string; mediaTitle: string }): void => {
    downloadSubtitle.mutate(input, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SubtitlesIcon className="size-5" />
            <Trans>Download subtitles</Trans>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subtitle-lang">
              <Trans>Language</Trans>
            </Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="subtitle-lang" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUBDL_LANGUAGES.map(({ code, label }) => (
                  <SelectItem key={code} value={code}>
                    <span className="flex w-full items-center justify-between gap-2">
                      <span>{label}</span>
                      {addedLanguages.has(code) && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Trans>Already added</Trans>
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {error && (
            <p className="text-destructive text-sm">
              <Trans>Failed to load subtitles</Trans>: {(error as Error).message}
            </p>
          )}

          {!isLoading && !error && (
            <div className="space-y-2">
              <Label>
                <Trans>Available subtitles</Trans> ({subtitles.length})
              </Label>
              <ScrollArea className="h-[280px] rounded-md border p-2">
                <ul className="space-y-2">
                  {subtitles.length === 0 ? (
                    <li className="text-muted-foreground text-sm py-4 text-center">
                      <Trans>No subtitles found for this language.</Trans>
                    </li>
                  ) : (
                    subtitles.map((sub) => (
                      <SubtitleRow
                        key={sub.url}
                        subtitle={sub}
                        mediaTitle={mediaTitle}
                        downloadId={downloadId}
                        language={language}
                        onDownload={handleDownload}
                        isDownloading={downloadSubtitle.isPending && downloadSubtitle.variables?.url === sub.url}
                      />
                    ))
                  )}
                </ul>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubtitleRow({
  subtitle,
  mediaTitle,
  downloadId,
  language,
  onDownload,
  isDownloading,
}: {
  subtitle: SubdlSubtitle;
  mediaTitle: string;
  downloadId: string;
  language: string;
  onDownload: (input: { downloadId: string; url: string; language: string; mediaTitle: string }) => void;
  isDownloading: boolean;
}) {
  const isBestMatch = isMatchingSubtitleRelease(subtitle.release_name, mediaTitle);

  return (
    <li className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm">
      <div className="min-w-0 flex-1 flex items-start gap-2">
        {isBestMatch && <StarIcon className="mt-0.5 size-4 shrink-0 fill-primary text-primary" aria-hidden />}
        <div className="min-w-0">
          <p className="font-medium truncate" title={subtitle.release_name}>
            {subtitle.release_name}
          </p>
          <p className="text-muted-foreground text-xs">
            {subtitle.author} · {subtitle.lang}
            {subtitle.hi && (
              <span className="ml-1 inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                HI
              </span>
            )}
          </p>
        </div>
      </div>
      <Button
        variant="default"
        size="sm"
        disabled={isDownloading}
        onClick={() =>
          onDownload({
            downloadId,
            url: subtitle.url,
            language,
            mediaTitle,
          })
        }
      >
        <DownloadIcon className="size-4" />
        {isDownloading ? <Trans>Adding…</Trans> : <Trans>Add</Trans>}
      </Button>
    </li>
  );
}
