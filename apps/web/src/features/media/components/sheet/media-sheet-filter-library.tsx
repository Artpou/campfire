import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";

import { type MediaFiltersValue, MediaSheetFilter } from "@/features/media/components/sheet/media-sheet-filter";

export interface LibraryFiltersValue {
  with_genres?: string;
  release_date_gte?: string;
  release_date_lte?: string;
  with_runtime_gte?: number;
  with_runtime_lte?: number;
  vote_average_gte?: number;
}

interface LibraryFiltersSheetProps {
  genreScope: Media["type"] | "both";
  type: Media["type"];
  value: LibraryFiltersValue;
  onChange: (value: LibraryFiltersValue) => void;
}

function toGeneric(value: LibraryFiltersValue): MediaFiltersValue {
  return {
    with_genres: value.with_genres,
    date_gte: value.release_date_gte,
    date_lte: value.release_date_lte,
    with_runtime_gte: value.with_runtime_gte,
    with_runtime_lte: value.with_runtime_lte,
    vote_average_gte: value.vote_average_gte,
  };
}

function fromGeneric(value: MediaFiltersValue): LibraryFiltersValue {
  return {
    with_genres: value.with_genres,
    release_date_gte: value.date_gte,
    release_date_lte: value.date_lte,
    with_runtime_gte: value.with_runtime_gte,
    with_runtime_lte: value.with_runtime_lte,
    vote_average_gte: value.vote_average_gte,
  };
}

export function LibraryFiltersSheet({ genreScope, type, value, onChange }: LibraryFiltersSheetProps) {
  return (
    <MediaSheetFilter
      mode="library"
      genreScope={genreScope}
      categoryValueMode="name"
      type={type}
      value={toGeneric(value)}
      onChange={(next) => onChange(fromGeneric(next))}
      description={<Trans>Filter your library by category and other criteria.</Trans>}
      dateInputIdPrefix="release-date"
      runtimeLabel={<Trans>Runtime (minutes)</Trans>}
    />
  );
}
