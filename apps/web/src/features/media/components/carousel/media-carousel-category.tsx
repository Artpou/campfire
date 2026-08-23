import type { ReactNode } from "react";

import type { Media } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Card, CardContent } from "@/shared/ui/card";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import { Img } from "@/shared/ui/image";
import { Skeleton } from "@/shared/ui/skeleton";

import {
  categoryImagePath,
  isGenreInSelection,
  type MergedGenre,
  toggleGenreSelection,
} from "@/features/media/helpers/genre.helper";
import { genreQueries } from "@/features/media/hooks/genre.queries";

interface MediaCarouselCategoryProps {
  type: Media["type"];
  genreScope?: Media["type"] | "both";
  genres?: MergedGenre[];
  valueMode?: "id" | "name";
  value?: string;
  onValueChange?: (value: string | undefined) => void;
  title?: ReactNode;
}

export function MediaCarouselCategory({
  type,
  genreScope,
  genres: genresProp,
  valueMode = "id",
  value,
  onValueChange,
  title,
}: MediaCarouselCategoryProps) {
  const locale = useTmdbLocale();
  const scope = genreScope ?? type;
  const isControlled = onValueChange !== undefined;
  const { data: fetchedGenres = [], isLoading } = useQuery({
    ...genreQueries.list(type, locale),
    enabled: !genresProp && !isControlled,
  });

  const genres: MergedGenre[] =
    genresProp ??
    fetchedGenres.map((genre) => ({
      id: genre.id.toString(),
      name: genre.name,
      movieId: type === "movie" ? genre.id : undefined,
      tvId: type === "tv" ? genre.id : undefined,
    }));

  const withGenres = value;

  const handleGenreClick = (genre: MergedGenre) => {
    onValueChange?.(toggleGenreSelection(genre, valueMode, withGenres));
  };

  if (!genresProp && isLoading) {
    return (
      <CarouselWrapper className="sm:mt-2" title={title}>
        {Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map((key) => (
          <CarouselItem key={key} className="xl:basis-1/4">
            <Skeleton className="h-24 w-full rounded-lg" />
          </CarouselItem>
        ))}
      </CarouselWrapper>
    );
  }

  if (!genres || genres.length === 0) return null;

  const hasSelection = Boolean(withGenres);

  return (
    <CarouselWrapper className="sm:mt-2" title={title}>
      {genres.map((genre) => {
        const isSelected = isGenreInSelection(genre, valueMode, withGenres);
        return (
          <CarouselItem className={cn("hover:border-primary", isSelected && "border-primary!")} key={genre.id}>
            <Card className="group h-24 cursor-pointer overflow-hidden py-0" onClick={() => handleGenreClick(genre)}>
              <CardContent className="relative h-full p-0">
                <Img
                  src={categoryImagePath(genre, scope)}
                  alt={genre.name}
                  className={cn(
                    "absolute inset-0 h-full w-full object-cover transition-all duration-300",
                    hasSelection && !isSelected && "grayscale",
                  )}
                />
                {!isSelected && (
                  <div className="absolute inset-0 bg-linear-to-r light:from-background/50 light:via-background/50 light:to-background/50 from-background via-background/50 to-background" />
                )}

                <div className="relative flex h-full items-center justify-center">
                  <h3 className="text-base font-bold drop-shadow-lg">{genre.name}</h3>
                </div>
              </CardContent>
            </Card>
          </CarouselItem>
        );
      })}
    </CarouselWrapper>
  );
}
