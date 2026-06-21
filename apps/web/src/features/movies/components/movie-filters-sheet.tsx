import { useEffect, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { FilterIcon, RotateCcwIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/ui/sheet";
import { Slider } from "@/shared/ui/slider";

import { mediaQueries } from "@/features/media/hooks/media.queries";

export interface MovieFiltersValue {
  release_date_gte?: string;
  release_date_lte?: string;
  with_original_language?: string;
  with_keywords?: string;
  with_keywords_label?: string;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  vote_average_gte?: number;
}

interface MovieFiltersSheetProps {
  value: MovieFiltersValue;
  onChange: (value: MovieFiltersValue) => void;
}

const RUNTIME_MIN = 0;
const RUNTIME_MAX = 400;
const RATING_MIN = 0;
const RATING_MAX = 10;

const LANGUAGES = [
  { code: "any", label: msg`Any language` },
  { code: "en", label: msg`English` },
  { code: "fr", label: msg`French` },
  { code: "es", label: msg`Spanish` },
  { code: "de", label: msg`German` },
  { code: "it", label: msg`Italian` },
  { code: "ja", label: msg`Japanese` },
  { code: "ko", label: msg`Korean` },
  { code: "zh", label: msg`Chinese` },
  { code: "pt", label: msg`Portuguese` },
  { code: "ru", label: msg`Russian` },
  { code: "hi", label: msg`Hindi` },
  { code: "ar", label: msg`Arabic` },
];

function countActive(value: MovieFiltersValue): number {
  let count = 0;
  if (value.release_date_gte || value.release_date_lte) count++;
  if (value.with_original_language) count++;
  if (value.with_keywords) count++;
  if (
    (value.with_runtime_gte !== undefined && value.with_runtime_gte > RUNTIME_MIN) ||
    (value.with_runtime_lte !== undefined && value.with_runtime_lte < RUNTIME_MAX)
  )
    count++;
  if (value.vote_average_gte !== undefined && value.vote_average_gte > RATING_MIN) count++;
  return count;
}

export function MovieFiltersSheet({ value, onChange }: MovieFiltersSheetProps) {
  const { t } = useLingui();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MovieFiltersValue>(value);
  const [keywordQuery, setKeywordQuery] = useState(value.with_keywords_label ?? "");

  useEffect(() => {
    if (open) {
      setDraft(value);
      setKeywordQuery(value.with_keywords_label ?? "");
    }
  }, [open, value]);

  const { data: keywordResults = [], isFetching: isSearchingKeywords } = useQuery({
    ...mediaQueries.keywords(keywordQuery),
    enabled: open && keywordQuery.trim().length >= 2,
  });

  const activeCount = countActive(value);

  const runtimeGte = draft.with_runtime_gte ?? RUNTIME_MIN;
  const runtimeLte = draft.with_runtime_lte ?? RUNTIME_MAX;
  const ratingGte = draft.vote_average_gte ?? RATING_MIN;

  const handleApply = () => {
    onChange(draft);
    setOpen(false);
  };

  const handleReset = () => {
    const cleared: MovieFiltersValue = {};
    setDraft(cleared);
    setKeywordQuery("");
    onChange(cleared);
    setOpen(false);
  };

  const handleSelectKeyword = (id: string, name: string) => {
    setDraft((prev) => ({ ...prev, with_keywords: id, with_keywords_label: name }));
    setKeywordQuery(name);
  };

  const handleClearKeyword = () => {
    setDraft((prev) => ({ ...prev, with_keywords: undefined, with_keywords_label: undefined }));
    setKeywordQuery("");
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon-lg" className="relative" aria-label="Filters">
          <FilterIcon />
          {activeCount > 0 && (
            <Badge className="absolute -top-1 -right-1 size-5 rounded-full p-0 text-[10px]">{activeCount}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>
            <Trans>Filters</Trans>
          </SheetTitle>
          <SheetDescription>
            <Trans>Refine the list of movies by combining several criteria.</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-6">
          <div className="space-y-2">
            <Label>
              <Trans>Release date</Trans>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="date"
                label={<Trans>From</Trans>}
                id="release-date-gte"
                value={draft.release_date_gte ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    release_date_gte: e.target.value || undefined,
                  }))
                }
              />
              <Input
                type="date"
                label={<Trans>To</Trans>}
                id="release-date-lte"
                value={draft.release_date_lte ?? ""}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    release_date_lte: e.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="original-language">
              <Trans>Original language</Trans>
            </Label>
            <Select
              value={draft.with_original_language ?? "any"}
              onValueChange={(v) =>
                setDraft((prev) => ({
                  ...prev,
                  with_original_language: v === "any" ? undefined : v,
                }))
              }
            >
              <SelectTrigger id="original-language" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {t(lang.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="keyword-search">
              <Trans>Keyword</Trans>
            </Label>
            <div className="space-y-2">
              {draft.with_keywords && draft.with_keywords_label ? (
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="rounded-full">
                    {draft.with_keywords_label}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleClearKeyword}>
                    <Trans>Remove</Trans>
                  </Button>
                </div>
              ) : (
                <>
                  <Input
                    id="keyword-search"
                    placeholder={t(msg`Search a keyword...`)}
                    value={keywordQuery}
                    onChange={(e) => setKeywordQuery(e.target.value)}
                  />
                  {keywordQuery.trim().length >= 2 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {isSearchingKeywords && keywordResults.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">
                          <Trans>Searching...</Trans>
                        </p>
                      ) : keywordResults.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-2">
                          <Trans>No keyword found.</Trans>
                        </p>
                      ) : (
                        keywordResults.map((kw) => (
                          <button
                            key={kw.id}
                            type="button"
                            onClick={() => handleSelectKeyword(kw.id.toString(), kw.name)}
                            className="w-full text-left px-2 py-1.5 text-sm hover:bg-accent cursor-pointer"
                          >
                            {kw.name}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                <Trans>Runtime (minutes)</Trans>
              </Label>
              <span className="text-xs text-muted-foreground">
                {runtimeGte} - {runtimeLte}
              </span>
            </div>
            <Slider
              withTooltip
              min={RUNTIME_MIN}
              max={RUNTIME_MAX}
              step={5}
              value={[runtimeGte, runtimeLte]}
              onValueChange={(v) =>
                setDraft((prev) => ({
                  ...prev,
                  with_runtime_gte: v[0] === RUNTIME_MIN ? undefined : v[0],
                  with_runtime_lte: v[1] === RUNTIME_MAX ? undefined : v[1],
                }))
              }
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>
                <Trans>Minimum rating</Trans>
              </Label>
              <span className="text-xs text-muted-foreground">{ratingGte.toFixed(1)}</span>
            </div>
            <Slider
              withTooltip
              min={RATING_MIN}
              max={RATING_MAX}
              step={0.5}
              value={[ratingGte]}
              onValueChange={(v) =>
                setDraft((prev) => ({
                  ...prev,
                  vote_average_gte: v[0] === RATING_MIN ? undefined : v[0],
                }))
              }
            />
          </div>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcwIcon className="mr-2 size-4" />
            <Trans>Reset</Trans>
          </Button>
          <Button onClick={handleApply} className="flex-1">
            <Trans>Apply</Trans>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
