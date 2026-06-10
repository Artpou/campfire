import type { Media } from "@seedarr/sdk";
import { useSearch } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import { Skeleton } from "@/shared/ui/skeleton";

import { useGenres } from "@/features/media/hooks/use-genres";

interface MediaCategoryCarouselProps {
  type: Media["type"];
  onValueChange?: (value: string | undefined) => void;
}

export function MediaCategoryCarousel({ type, onValueChange }: MediaCategoryCarouselProps) {
  const { data: genres = [], isLoading } = useGenres(type);
  const search = useSearch({ strict: false }) as { with_genres?: string };

  const selectedGenreId = search.with_genres ? Number.parseInt(search.with_genres, 10) : undefined;

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
        <CarouselItem className={cn(selectedGenreId === genre.id && "border-primary!")} key={genre.id}>
          <Card className="group h-24 py-0 cursor-pointer overflow-hidden" onClick={() => handleGenreClick(genre.id)}>
            <CardContent className="relative h-full p-0">
              <img
                src={`/${type}/category/${genre.id}.jpg`}
                alt={genre.name}
                className={cn(
                  `absolute inset-0 h-full w-full object-cover transition-all duration-300`,
                  selectedGenreId !== undefined && selectedGenreId !== genre.id && "grayscale",
                )}
              />
              {selectedGenreId !== genre.id && (
                <div className="absolute inset-0 bg-linear-to-r from-background via-background/50 to-background" />
              )}

              <div className="relative flex h-full items-center justify-center">
                <h3 className="text-base font-bold  drop-shadow-lg">{genre.name}</h3>
              </div>
            </CardContent>
          </Card>
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
