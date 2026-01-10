import type { Media } from "@basement/api/types";
import { useSearch } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import { Skeleton } from "@/shared/ui/skeleton";

import { useMovieGenres } from "@/features/movies/hooks/use-movie";
import { useTVGenres } from "@/features/tv/hook/use-tv";

interface MediaCategoryCarouselProps {
  type: Media["type"];
  onValueChange?: (value: string | undefined) => void;
}

export function MediaCategoryCarousel({ type, onValueChange }: MediaCategoryCarouselProps) {
  const { data: movieGenres = [], isLoading: isLoadingMovies } = useMovieGenres();
  const { data: tvGenres = [], isLoading: isLoadingTV } = useTVGenres();
  const search = useSearch({ from: type === "movie" ? "/_app/movies/" : "/_app/tv" });

  const genres = type === "movie" ? movieGenres : tvGenres;
  const isLoading = type === "movie" ? isLoadingMovies : isLoadingTV;
  const selectedGenreId = search.with_genres ? Number.parseInt(search.with_genres, 10) : undefined;

  const handleGenreClick = (genreId: number) => {
    // Toggle: if clicking the same genre, deactivate it
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
            <Skeleton className="h-32 w-full rounded-lg" />
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
          className={cn(selectedGenreId === genre.id && "border-primary!")}
          key={genre.id}
        >
          <Card
            className="group h-32 py-0 cursor-pointer overflow-hidden"
            onClick={() => handleGenreClick(genre.id)}
          >
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
                <div className="absolute inset-0 bg-linear-to-r from-[oklch(0.22_0.004_240/0.9)] via-[oklch(0.22_0.004_240/0.25)] to-[oklch(0.22_0.004_240/0.9)]" />
              )}

              <div className="relative flex h-full items-center justify-center">
                <h3 className="text-lg font-bold text-white drop-shadow-lg">{genre.name}</h3>
              </div>
            </CardContent>
          </Card>
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
