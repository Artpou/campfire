import type { Media } from "@seedarr/sdk";
import { parseString } from "@seedarr/shared";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { useTmdbLocale } from "@/shared/hooks/use-tmdb-locale";
import { Card, CardContent } from "@/shared/ui/card";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import { Img } from "@/shared/ui/image";
import { Skeleton } from "@/shared/ui/skeleton";

import { genreQueries } from "@/features/media/hooks/genre.queries";

interface MediaCarouselCategoryProps {
  type: Media["type"];
  onValueChange?: (value: string | undefined) => void;
}

export function MediaCarouselCategory({ type, onValueChange }: MediaCarouselCategoryProps) {
  const locale = useTmdbLocale();
  const { data: genres = [], isLoading } = useQuery(genreQueries.list(type, locale));
  const search = useSearch({ strict: false });
  const withGenres = parseString("with_genres" in search ? search.with_genres : undefined);

  const selectedGenreId = withGenres ? Number.parseInt(withGenres, 10) : undefined;

  const handleGenreClick = (genreId: number) => {
    if (selectedGenreId === genreId) {
      onValueChange?.(undefined);
    } else {
      onValueChange?.(genreId.toString());
    }
  };

  if (isLoading) {
    return (
      <CarouselWrapper title="">
        {Array.from({ length: 8 }, (_, i) => `skeleton-${i}`).map((key) => (
          <CarouselItem key={key} className="xl:basis-1/4">
            <Skeleton className="h-24 w-full rounded-lg" />
          </CarouselItem>
        ))}
      </CarouselWrapper>
    );
  }

  if (!genres || genres.length === 0) return null;

  return (
    <CarouselWrapper>
      {genres.map((genre) => (
        <CarouselItem
          className={cn(" hover:border-primary", selectedGenreId === genre.id && "border-primary!")}
          key={genre.id}
        >
          <Card className="group h-24 py-0 cursor-pointer overflow-hidden" onClick={() => handleGenreClick(genre.id)}>
            <CardContent className="relative h-full p-0">
              <Img
                src={`/${type}/category/${genre.id}.jpg`}
                alt={genre.name}
                className={cn(
                  `absolute inset-0 h-full w-full object-cover transition-all duration-300`,
                  selectedGenreId !== undefined && selectedGenreId !== genre.id && "grayscale",
                )}
              />
              {selectedGenreId !== genre.id && (
                <div className="absolute inset-0 bg-linear-to-r light:from-background/50 light:via-background/50 light:to-background/50 from-background via-background/50 to-background" />
              )}

              <div className="relative flex h-full items-center justify-center">
                <h3 className="text-base font-bold drop-shadow-lg">{genre.name}</h3>
              </div>
            </CardContent>
          </Card>
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
