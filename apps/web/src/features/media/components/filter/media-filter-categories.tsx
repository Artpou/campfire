import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";

import { Select } from "@/shared/components/select/select";

import { MediaCarouselCategory } from "@/features/media/components/carousel/media-carousel-category";
import { type FilterOption, joinFilterIds, splitFilterIds } from "@/features/media/helpers/filter-options.helper";
import type { MergedGenre } from "@/features/media/helpers/genre.helper";

interface MediaFilterCategoriesProps {
  type: Media["type"];
  genreScope: Media["type"] | "both";
  categoryValueMode: "id" | "name";
  genres: MergedGenre[];
  categoryOptions: FilterOption[];
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function MediaFilterCategories({
  type,
  genreScope,
  categoryValueMode,
  genres,
  categoryOptions,
  value,
  onChange,
}: MediaFilterCategoriesProps) {
  const carouselType = genreScope === "both" ? type : genreScope;

  return (
    <MediaCarouselCategory
      type={carouselType}
      genreScope={genreScope}
      genres={genres}
      valueMode={categoryValueMode}
      value={value}
      onValueChange={onChange}
      title={
        <Select
          multi
          options={categoryOptions.map((option) => ({ value: option.id, label: option.name }))}
          value={splitFilterIds(value)}
          onValueChange={(ids) => onChange(joinFilterIds(ids))}
          panelLabel={<Trans>Categories</Trans>}
          emptyLabel={<Trans>No categories found.</Trans>}
        />
      }
    />
  );
}
