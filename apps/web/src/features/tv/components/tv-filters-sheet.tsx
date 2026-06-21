import { Trans } from "@lingui/react/macro";

import { MediaFiltersSheet, type MediaFiltersValue } from "@/features/media/components/media-filters-sheet";

export interface TvFiltersValue {
  first_air_date_gte?: string;
  first_air_date_lte?: string;
  with_original_language?: string;
  with_keywords?: string;
  with_keywords_label?: string;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  vote_average_gte?: number;
}

interface TvFiltersSheetProps {
  value: TvFiltersValue;
  onChange: (value: TvFiltersValue) => void;
}

function toGeneric(value: TvFiltersValue): MediaFiltersValue {
  return { ...value, date_gte: value.first_air_date_gte, date_lte: value.first_air_date_lte };
}

function fromGeneric(value: MediaFiltersValue): TvFiltersValue {
  const { date_gte, date_lte, ...rest } = value;
  return { ...rest, first_air_date_gte: date_gte, first_air_date_lte: date_lte };
}

export function TvFiltersSheet({ value, onChange }: TvFiltersSheetProps) {
  return (
    <MediaFiltersSheet
      value={toGeneric(value)}
      onChange={(v) => onChange(fromGeneric(v))}
      dateLabel={<Trans>First air date</Trans>}
      runtimeLabel={<Trans>Episode runtime (minutes)</Trans>}
      description={<Trans>Refine the list of TV shows by combining several criteria.</Trans>}
      buttonVariant="secondary"
      dateInputIdPrefix="first-air-date"
    />
  );
}
