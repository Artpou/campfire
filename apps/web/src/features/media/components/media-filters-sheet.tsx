import { useEffect, useMemo, useState } from "react";

import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { ClockIcon, FilterIcon, HashIcon, MonitorPlayIcon, RotateCcwIcon, StarIcon, TagsIcon } from "lucide-react";

import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DatePicker } from "@/shared/ui/date-picker";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Label } from "@/shared/ui/label";
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

import { FilterCombobox } from "@/features/media/components/filter-combobox";
import {
  type FilterOption,
  getRuntimePreset,
  joinFilterIds,
  optionsFromIds,
  parseLabeledOptions,
  type RuntimePreset,
  runtimePresetToFilters,
  serializeLabeledOptions,
  splitFilterIds,
} from "@/features/media/helpers/filter-options.helper";
import { getPosterUrl } from "@/features/media/helpers/media.helper";
import { genreQueries } from "@/features/media/hooks/genre.queries";
import { mediaQueries } from "@/features/media/hooks/media.queries";
import { providerQueries } from "@/features/media/hooks/provider.queries";

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

interface MediaFiltersSheetProps {
  type: Media["type"];
  value: MediaFiltersValue;
  onChange: (value: MediaFiltersValue) => void;
  dateLabel: React.ReactNode;
  runtimeLabel: React.ReactNode;
  description: React.ReactNode;
  buttonVariant?: "outline" | "secondary";
  dateInputIdPrefix?: string;
  applyLabel?: React.ReactNode;
}

const RATING_MIN = 0;
const RATING_MAX = 10;

const RUNTIME_PRESETS: { id: RuntimePreset; label: string }[] = [
  { id: "short", label: "< 90m" },
  { id: "medium", label: "90m-120m" },
  { id: "long", label: "> 120m" },
];

function countActive(value: MediaFiltersValue): number {
  let count = 0;
  if (value.with_genres) count++;
  if (value.date_gte || value.date_lte) count++;
  if (value.with_watch_providers) count++;
  if (value.with_keywords) count++;
  if (value.with_runtime_gte !== undefined || value.with_runtime_lte !== undefined) count++;
  if (value.vote_average_gte !== undefined && value.vote_average_gte > RATING_MIN) count++;
  return count;
}

function FilterSectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Label className="flex items-center gap-2">
      <Icon className="size-4 text-muted-foreground" />
      {children}
    </Label>
  );
}

export function MediaFiltersSheet({
  type,
  value,
  onChange,
  dateLabel,
  runtimeLabel,
  description,
  buttonVariant = "outline",
  dateInputIdPrefix = "date",
  applyLabel,
}: MediaFiltersSheetProps) {
  const { t } = useLingui();
  const locale = useTmdbLocale();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<MediaFiltersValue>(value);
  const [keywordQuery, setKeywordQuery] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(value);
      setKeywordQuery("");
    }
  }, [open, value]);

  const { data: genres = [] } = useQuery({
    ...genreQueries.list(type, locale),
    enabled: open,
  });
  const { data: providers = [] } = useQuery({
    ...providerQueries.list(type, locale),
    enabled: open,
  });
  const { data: keywordResults = [] } = useQuery({
    ...mediaQueries.keywords(keywordQuery),
    enabled: open && keywordQuery.trim().length >= 2,
  });

  const genreOptions = useMemo<FilterOption[]>(
    () => genres.map((genre) => ({ id: genre.id.toString(), name: genre.name })),
    [genres],
  );
  const providerOptions = useMemo<FilterOption[]>(
    () =>
      providers.map((provider) => ({
        id: provider.provider_id.toString(),
        name: provider.provider_name,
        image: getPosterUrl(provider.logo_path, "w92"),
      })),
    [providers],
  );

  const selectedGenres = useMemo(
    () => optionsFromIds(splitFilterIds(draft.with_genres), genreOptions),
    [draft.with_genres, genreOptions],
  );
  const selectedProviders = useMemo(
    () => optionsFromIds(splitFilterIds(draft.with_watch_providers), providerOptions),
    [draft.with_watch_providers, providerOptions],
  );
  const selectedKeywords = useMemo(
    () => parseLabeledOptions(draft.with_keywords, draft.with_keywords_label),
    [draft.with_keywords, draft.with_keywords_label],
  );
  const keywordItems = useMemo(() => {
    const byId = new Map(selectedKeywords.map((keyword) => [keyword.id, keyword]));
    for (const result of keywordResults) {
      byId.set(result.id.toString(), { id: result.id.toString(), name: result.name });
    }
    return [...byId.values()];
  }, [keywordResults, selectedKeywords]);

  const activeCount = countActive(value);
  const ratingGte = draft.vote_average_gte ?? RATING_MIN;
  const runtimePreset = getRuntimePreset(draft);

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
    setKeywordQuery("");
    onChange(cleared);
    setOpen(false);
  };

  const handleRuntimePreset = (preset: RuntimePreset) => {
    const next = runtimePreset === preset ? undefined : preset;
    setDraft((prev) => ({ ...prev, ...runtimePresetToFilters(next) }));
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={buttonVariant} size="icon-lg" className="relative" aria-label={t(msg`Filters`)}>
          <FilterIcon />
          {activeCount > 0 && (
            <Badge className="absolute -top-1 -right-1 size-5 rounded-full p-0 text-[10px]">{activeCount}</Badge>
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

        <div className="flex-1 space-y-8 overflow-y-auto px-4">
          <div className="grid grid-cols-2 gap-3">
            <DatePicker
              id={`${dateInputIdPrefix}-gte`}
              label={<Trans>From</Trans>}
              value={draft.date_gte}
              onChange={(next) => setDraft((prev) => ({ ...prev, date_gte: next }))}
            />
            <DatePicker
              id={`${dateInputIdPrefix}-lte`}
              label={<Trans>To</Trans>}
              value={draft.date_lte}
              onChange={(next) => setDraft((prev) => ({ ...prev, date_lte: next }))}
            />
          </div>

          <Field className="gap-3">
            <FieldLabel className="flex items-center gap-2">
              <TagsIcon className="size-4 text-muted-foreground" />
              <Trans>Genres</Trans>
            </FieldLabel>
            <FilterCombobox
              items={genreOptions}
              value={selectedGenres}
              onValueChange={(next) =>
                setDraft((prev) => ({ ...prev, with_genres: joinFilterIds(next.map((item) => item.id)) }))
              }
              placeholder={t(msg`Select genres...`)}
              emptyLabel={<Trans>No genres found.</Trans>}
            />
          </Field>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <FilterSectionLabel icon={StarIcon}>
                <Trans>Minimum rating</Trans>
              </FilterSectionLabel>
              <span className="text-xs text-muted-foreground">{ratingGte.toFixed(1)}+</span>
            </div>
            <Slider
              withTooltip
              min={RATING_MIN}
              max={RATING_MAX}
              step={0.5}
              value={[ratingGte]}
              onValueChange={(v) =>
                setDraft((prev) => ({ ...prev, vote_average_gte: v[0] === RATING_MIN ? undefined : v[0] }))
              }
            />
          </div>

          <div className="space-y-3">
            <FilterSectionLabel icon={ClockIcon}>{runtimeLabel}</FilterSectionLabel>
            <div className="flex flex-wrap gap-2">
              {RUNTIME_PRESETS.map((preset) => (
                <Button
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={runtimePreset === preset.id ? "default" : "outline"}
                  onClick={() => handleRuntimePreset(preset.id)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          <Field className="gap-3">
            <FieldLabel className="flex items-center gap-2">
              <MonitorPlayIcon className="size-4 text-muted-foreground" />
              <Trans>Streaming services</Trans>
            </FieldLabel>
            <FilterCombobox
              items={providerOptions}
              value={selectedProviders}
              onValueChange={(next) =>
                setDraft((prev) => ({
                  ...prev,
                  with_watch_providers: joinFilterIds(next.map((item) => item.id)),
                }))
              }
              placeholder={t(msg`Select streaming services...`)}
              emptyLabel={<Trans>No streaming services found.</Trans>}
            />
          </Field>

          <Field className="gap-3">
            <FieldLabel className="flex items-center gap-2">
              <HashIcon className="size-4 text-muted-foreground" />
              <Trans>Keywords</Trans>
            </FieldLabel>
            <FilterCombobox
              items={keywordItems}
              value={selectedKeywords}
              onValueChange={(next) => {
                const serialized = serializeLabeledOptions(next);
                setDraft((prev) => ({
                  ...prev,
                  with_keywords: serialized.ids,
                  with_keywords_label: serialized.labels,
                }));
              }}
              onInputValueChange={setKeywordQuery}
              filter={null}
              placeholder={t(msg`Search and add keywords...`)}
              emptyLabel={
                keywordQuery.trim().length < 2 ? (
                  <Trans>Type at least 2 characters.</Trans>
                ) : (
                  <Trans>No keyword found.</Trans>
                )
              }
            />
          </Field>
        </div>

        <SheetFooter className="flex-row gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcwIcon className="mr-2 size-4" />
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
