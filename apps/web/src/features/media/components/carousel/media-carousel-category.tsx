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
  /** Emit genre TMDB id (discover) or genre name (local media list). */
  valueMode?: "id" | "name";
  /** Controlled selected value; falls back to URL `with_genres` when omitted. */
  value?: string;
  onValueChange?: (value: string | undefined) => void;
}

export function MediaCarouselCategory({ type, valueMode = "id", value, onValueChange }: MediaCarouselCategoryProps) {
  const locale = useTmdbLocale();
  const { data: genres = [], isLoading } = useQuery(genreQueries.list(type, locale));
  const search = useSearch({ strict: false });
  const withGenres = value ?? parseString("with_genres" in search ? search.with_genres : undefined);

  const selectedId = valueMode === "id" && withGenres ? Number.parseInt(withGenres, 10) : undefined;
  const selectedName = valueMode === "name" ? withGenres : undefined;

  const handleGenreClick = (genre: { id: number; name: string }) => {
    const next = valueMode === "name" ? genre.name : genre.id.toString();
    const isSelected = valueMode === "name" ? selectedName === genre.name : selectedId === genre.id;
    onValueChange?.(isSelected ? undefined : next);
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
      {genres.map((genre) => {
        const isSelected = valueMode === "name" ? selectedName === genre.name : selectedId === genre.id;
        return (
          <CarouselItem className={cn(" hover:border-primary", isSelected && "border-primary!")} key={genre.id}>
            <Card className="group h-24 py-0 cursor-pointer overflow-hidden" onClick={() => handleGenreClick(genre)}>
              <CardContent className="relative h-full p-0">
                <Img
                  src={`/${type}/category/${genre.id}.jpg`}
                  alt={genre.name}
                  className={cn(
                    `absolute inset-0 h-full w-full object-cover transition-all duration-300`,
                    withGenres && !isSelected && "grayscale",
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
