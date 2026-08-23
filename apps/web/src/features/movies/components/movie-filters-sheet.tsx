import { Trans } from "@lingui/react/macro";

import { type MediaFiltersValue, MediaSheetFilter } from "@/features/media/components/sheet/media-sheet-filter";

export interface MovieFiltersValue {
  release_date_gte?: string;
  release_date_lte?: string;
  with_genres?: string;
  with_watch_providers?: string;
  with_keywords?: string;
  with_keywords_label?: string;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  vote_average_gte?: number;
}

type MediaSortValue = "new" | "top-rated" | "downloaded" | "upcoming";

interface MovieFiltersSheetProps {
  value: MovieFiltersValue;
  onChange: (value: MovieFiltersValue) => void;
  sortValue?: MediaSortValue;
  onSortChange?: (value: MediaSortValue) => void;
  showSortInSheet?: boolean;
}

function toGeneric(value: MovieFiltersValue): MediaFiltersValue {
  return {
    ...value,
    date_gte: value.release_date_gte,
    date_lte: value.release_date_lte,
  };
}

function fromGeneric(value: MediaFiltersValue): MovieFiltersValue {
  return {
    release_date_gte: value.date_gte,
    release_date_lte: value.date_lte,
    with_genres: value.with_genres,
    with_watch_providers: value.with_watch_providers,
    with_keywords: value.with_keywords,
    with_keywords_label: value.with_keywords_label,
    with_runtime_gte: value.with_runtime_gte,
    with_runtime_lte: value.with_runtime_lte,
    vote_average_gte: value.vote_average_gte,
  };
}

export function MovieFiltersSheet({
  value,
  onChange,
  sortValue,
  onSortChange,
  showSortInSheet,
}: MovieFiltersSheetProps) {
  return (
    <MediaSheetFilter
      mode="discover"
      genreScope="movie"
      categoryValueMode="id"
      type="movie"
      value={toGeneric(value)}
      onChange={(v) => onChange(fromGeneric(v))}
      runtimeLabel={<Trans>Runtime (minutes)</Trans>}
      description={<Trans>Refine the list of movies by combining several criteria.</Trans>}
      dateInputIdPrefix="release-date"
      sortValue={sortValue}
      onSortChange={onSortChange}
      showSortInSheet={showSortInSheet}
    />
  );
}
