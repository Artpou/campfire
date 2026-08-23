import { useEffect, useMemo, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { FilterIcon, RotateCcwIcon } from "lucide-react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Button } from "@/shared/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";

import { MediaFilterCategories } from "@/features/media/components/filter/media-filter-categories";
import { MediaFilterDateRange } from "@/features/media/components/filter/media-filter-date-range";
import { MediaFilterKeywords } from "@/features/media/components/filter/media-filter-keywords";
import { MediaFilterProviders } from "@/features/media/components/filter/media-filter-providers";
import { MediaFilterRating } from "@/features/media/components/filter/media-filter-rating";
import { MediaFilterRuntime } from "@/features/media/components/filter/media-filter-runtime";
import { MediaSortTabs } from "@/features/media/components/tabs/media-tabs-sort";
import type { FilterOption } from "@/features/media/helpers/filter-options.helper";
import { genresForScope } from "@/features/media/helpers/genre.helper";
import { genreQueries } from "@/features/media/hooks/genre.queries";

export interface MediaFiltersValue {
  date_gte?: string;
  date_lte?: string;
  with_genres?: string;
  with_watch_providers?: string;
  with_keywords?: string;
  with_keywords_label?: string;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  vote_average_gte?: number;
}

type MediaSortValue = "new" | "top-rated" | "downloaded" | "upcoming";

interface MediaSheetFilterProps {
  mode?: "discover" | "library";
  genreScope: Media["type"] | "both";
  categoryValueMode?: "id" | "name";
  type: Media["type"];
  value: MediaFiltersValue;
  onChange: (value: MediaFiltersValue) => void;
  runtimeLabel?: React.ReactNode;
  description: React.ReactNode;
  dateInputIdPrefix?: string;
  applyLabel?: React.ReactNode;
  sortValue?: MediaSortValue;
  onSortChange?: (value: MediaSortValue) => void;
  showSortInSheet?: boolean;
}

const RATING_MIN = 0;

function countActive(value: MediaFiltersValue, mode: "discover" | "library"): number {
  let count = 0;
  if (value.with_genres) count++;
  if (value.date_gte || value.date_lte) count++;
  if (mode === "discover" && value.with_watch_providers) count++;
  if (mode === "discover" && value.with_keywords) count++;
  if (value.with_runtime_gte !== undefined || value.with_runtime_lte !== undefined) count++;
  if (value.vote_average_gte !== undefined && value.vote_average_gte > RATING_MIN) count++;
  return count;
}

export function MediaSheetFilter({
  mode = "discover",
  genreScope,
  categoryValueMode = "id",
  type,
  value,
  onChange,
  runtimeLabel,
  description,
  dateInputIdPrefix = "date",
  applyLabel,
  sortValue,
  onSortChange,
  showSortInSheet = false,
}: MediaSheetFilterProps) {
  const { t } = useLingui();
  const locale = useTmdbLocale();
  const isMobile = useIsMobile();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MediaFiltersValue>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const needsMovieGenres = genreScope === "movie" || genreScope === "both";
  const needsTvGenres = genreScope === "tv" || genreScope === "both";

  const { data: movieGenres = [] } = useQuery({
    ...genreQueries.list("movie", locale),
    enabled: open && needsMovieGenres,
  });
  const { data: tvGenres = [] } = useQuery({
    ...genreQueries.list("tv", locale),
    enabled: open && needsTvGenres,
  });

  const mergedGenres = useMemo(
    () => genresForScope(genreScope, movieGenres, tvGenres),
    [genreScope, movieGenres, tvGenres],
  );

  const categoryOptions = useMemo<FilterOption[]>(
    () =>
      mergedGenres.map((genre) => ({
        id: categoryValueMode === "name" ? genre.name : genre.id,
        name: genre.name,
      })),
    [categoryValueMode, mergedGenres],
  );

  const providerType = genreScope === "both" ? type : genreScope;
  const activeCount = countActive(value, mode);

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleReset = () => {
    const cleared: MediaFiltersValue = {
      date_gte: undefined,
      date_lte: undefined,
      with_genres: undefined,
      with_watch_providers: undefined,
      with_keywords: undefined,
      with_keywords_label: undefined,
      with_runtime_gte: undefined,
      with_runtime_lte: undefined,
      vote_average_gte: undefined,
    };
    setDraft({});
    onChange(cleared);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="secondary"
          size={isMobile ? "icon-lg" : "lg"}
          className="relative shrink-0"
          aria-label={t(msg`Filters`)}
          icon={FilterIcon}
        >
          <span className="hidden lg:inline">
            <Trans>Filters</Trans>
          </span>
          {activeCount > 0 && (
            <span
              className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground"
              aria-hidden
            >
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>
            <Trans>Filters</Trans>
          </SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-4">
          {showSortInSheet && sortValue && onSortChange ? (
            <MediaSortTabs value={sortValue} type={type} onChange={onSortChange} className="w-full" />
          ) : null}

          <MediaFilterCategories
            type={type}
            genreScope={genreScope}
            categoryValueMode={categoryValueMode}
            genres={mergedGenres}
            categoryOptions={categoryOptions}
            value={draft.with_genres}
            onChange={(next) => setDraft((prev) => ({ ...prev, with_genres: next }))}
          />

          <MediaFilterDateRange
            idPrefix={dateInputIdPrefix}
            value={{ date_gte: draft.date_gte, date_lte: draft.date_lte }}
            onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
          />

          <MediaFilterRating
            value={draft.vote_average_gte}
            onChange={(next) => setDraft((prev) => ({ ...prev, vote_average_gte: next }))}
          />

          <MediaFilterRuntime
            label={runtimeLabel ?? <Trans>Runtime (minutes)</Trans>}
            value={{
              with_runtime_gte: draft.with_runtime_gte,
              with_runtime_lte: draft.with_runtime_lte,
            }}
            onChange={(next) => setDraft((prev) => ({ ...prev, ...next }))}
          />

          {mode === "discover" && (
            <>
              <MediaFilterProviders
                type={providerType}
                value={draft.with_watch_providers}
                onChange={(next) => setDraft((prev) => ({ ...prev, with_watch_providers: next }))}
                enabled={open}
              />
              <MediaFilterKeywords
                value={draft.with_keywords}
                valueLabels={draft.with_keywords_label}
                onChange={(ids, labels) =>
                  setDraft((prev) => ({ ...prev, with_keywords: ids, with_keywords_label: labels }))
                }
                enabled={open}
              />
            </>
          )}
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="secondary" onClick={handleReset} className="flex-1" icon={RotateCcwIcon}>
            <Trans>Reset</Trans>
          </Button>
          <Button onClick={handleApply} className="flex-1">
            {applyLabel ?? <Trans>Show</Trans>}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
