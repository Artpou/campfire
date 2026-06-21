import { Trans } from "@lingui/react/macro";

import { MediaFiltersSheet, type MediaFiltersValue } from "@/features/media/components/media-filters-sheet";

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

function toGeneric(value: MovieFiltersValue): MediaFiltersValue {
  return { ...value, date_gte: value.release_date_gte, date_lte: value.release_date_lte };
}

function fromGeneric(value: MediaFiltersValue): MovieFiltersValue {
  const { date_gte, date_lte, ...rest } = value;
  return { ...rest, release_date_gte: date_gte, release_date_lte: date_lte };
}

export function MovieFiltersSheet({ value, onChange }: MovieFiltersSheetProps) {
  return (
    <MediaFiltersSheet
      value={toGeneric(value)}
      onChange={(v) => onChange(fromGeneric(v))}
      dateLabel={<Trans>Release date</Trans>}
      runtimeLabel={<Trans>Runtime (minutes)</Trans>}
      description={<Trans>Refine the list of movies by combining several criteria.</Trans>}
      buttonVariant="outline"
      dateInputIdPrefix="release-date"
    />
  );
}
