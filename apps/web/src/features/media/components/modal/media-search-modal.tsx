import { useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@uidotdev/usehooks";
import { CheckIcon, ClapperboardIcon, SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";

import { useDownloadReassignMedia } from "@/features/downloads/hooks/download.queries";
import { MediaTable } from "@/features/media/components/media-table";
import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { mediaQueries } from "@/features/media/hooks/media.queries";

interface MediaSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  downloadId: string;
  mediaId?: number;
  mediaType?: "movie" | "tv";
}

export function MediaSearchModal({ open, onOpenChange, downloadId, mediaId, mediaType }: MediaSearchModalProps) {
  const { t } = useLingui();
  const locale = useTmdbLocale();
  const reassign = useDownloadReassignMedia();

  const [query, setQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data: searchResults = [], isLoading } = useQuery({
    ...mediaQueries.search(debouncedQuery, locale),
    enabled: debouncedQuery.trim().length >= 2,
    select: (data) => (mediaType ? data.filter((item) => item.type === mediaType) : data),
  });

  const handleSave = () => {
    if (!selectedMedia) return;
    reassign.mutate(
      { id: downloadId, mediaId: selectedMedia.id },
      {
        onSuccess: () => {
          onOpenChange(false);
          setQuery("");
          setSelectedMedia(null);
        },
      },
    );
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setQuery("");
      setSelectedMedia(null);
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            <Trans>Change media</Trans>
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder={t`Search${mediaType === "tv" ? " TV shows" : mediaType === "movie" ? " movies" : ""}...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <MediaSearchResults
          results={searchResults}
          isLoading={isLoading}
          hasQuery={debouncedQuery.trim().length >= 2}
          selectedId={selectedMedia?.id}
          currentMediaId={mediaId}
          onSelect={setSelectedMedia}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            <Trans>Cancel</Trans>
          </Button>
          <Button onClick={handleSave} disabled={!selectedMedia || reassign.isPending}>
            <Trans>Save</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface MediaSearchResultsProps {
  results: Media[];
  isLoading: boolean;
  hasQuery: boolean;
  selectedId?: number;
  currentMediaId?: number;
  onSelect: (media: Media) => void;
}

function MediaSearchResults({
  results,
  isLoading,
  hasQuery,
  selectedId,
  currentMediaId,
  onSelect,
}: MediaSearchResultsProps) {
  if (!hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <SearchIcon className="size-10 opacity-20 mb-2" />
        <p className="text-sm">
          <Trans>Type to search</Trans>
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SeedarrLoader />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <SearchIcon className="size-10 opacity-20 mb-2" />
        <p className="text-sm">
          <Trans>No results found</Trans>
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto flex-1 min-h-0 max-h-[40vh] space-y-1">
      {results.map((item) => {
        const isSelected = selectedId === item.id;
        const isCurrent = currentMediaId === item.id;

        return (
          <button
            key={`${item.type}-${item.id}`}
            type="button"
            onClick={() => onSelect(item)}
            className={cn(
              "flex items-center gap-3 w-full rounded-md p-2 text-left transition-colors cursor-pointer",
              isSelected ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted",
            )}
          >
            <div className="size-12 shrink-0 rounded overflow-hidden bg-muted">
              {item.poster_path ? (
                <img src={getPosterUrl(item.poster_path, "w92")} alt={item.title} className="size-full object-cover" />
              ) : (
                <div className="size-full flex items-center justify-center">
                  <ClapperboardIcon className="size-5 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground">
                {item.release_date?.substring(0, 4)} · {item.type === "movie" ? "Movie" : "TV"}
              </p>
            </div>
            {isSelected && <CheckIcon className="size-4 text-primary shrink-0" />}
            {isCurrent && !isSelected && (
              <span className="text-xs text-muted-foreground shrink-0">
                <Trans>Current</Trans>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface MediaSearchPickerProps {
  mediaType?: "movie" | "tv";
  selectedMedia: Media | null;
  onSelect: (media: Media | null) => void;
  fileName?: string;
}

export function MediaSearchPicker({ mediaType, selectedMedia, onSelect, fileName }: MediaSearchPickerProps) {
  const { t } = useLingui();
  const locale = useTmdbLocale();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const { data: searchResults = [], isLoading } = useQuery({
    ...mediaQueries.search(debouncedQuery, locale),
    enabled: debouncedQuery.trim().length >= 2,
    select: (data) => (mediaType ? data.filter((item) => item.type === mediaType) : data),
  });

  const hasQuery = debouncedQuery.trim().length >= 2;

  return (
    <div className="space-y-4 min-h-0 flex-1 flex flex-col">
      {fileName && (
        <div className="bg-muted rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">
            <Trans>File</Trans>
          </p>
          <p className="text-sm font-mono truncate">{fileName}</p>
        </div>
      )}

      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder={t`Search${mediaType === "tv" ? " TV shows" : mediaType === "movie" ? " movies" : ""}...`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSelect(null);
          }}
          className="pl-9"
          autoFocus
        />
      </div>

      {!hasQuery ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <SearchIcon className="size-10 opacity-20 mb-2" />
          <p className="text-sm">
            <Trans>Type to search</Trans>
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <SeedarrLoader />
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 min-h-0 max-h-[40vh]">
          <MediaTable media={searchResults} selectedId={selectedMedia?.id} showActions={false} onRowClick={onSelect} />
        </div>
      )}
    </div>
  );
}
