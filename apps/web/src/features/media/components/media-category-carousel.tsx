import { useNavigate, useSearch } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/shared/ui/card";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import { Skeleton } from "@/shared/ui/skeleton";

import { useMovieGenres, useTVGenres } from "@/features/media/hooks/use-media";
import { Media } from "@/features/media/media";

interface MediaCategoryCarouselProps {
  type: Media["type"];
}

export function MediaCategoryCarousel({ type }: MediaCategoryCarouselProps) {
  const { data: movieGenres = [], isLoading: isLoadingMovies } = useMovieGenres();
  const { data: tvGenres = [], isLoading: isLoadingTV } = useTVGenres();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { genre?: string };

  const genres = type === "movie" ? movieGenres : tvGenres;
  const isLoading = type === "movie" ? isLoadingMovies : isLoadingTV;
  const selectedGenreId = search.genre ? Number.parseInt(search.genre) : undefined;

  const handleGenreClick = (genreId: number) => {
    // Toggle: if clicking the same genre, deactivate it
    if (selectedGenreId === genreId) {
      navigate({
        to: type === "movie" ? "/movies" : "/tv",
        search: {},
      });
    } else {
      navigate({
        to: type === "movie" ? "/movies" : "/tv",
        search: { genre: genreId.toString() },
      });
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
        <CarouselItem key={genre.id}>
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
              <div
                className={cn(
                  `absolute inset-0 transition-all duration-300`,
                  selectedGenreId === genre.id
                    ? "bg-linear-to-t from-primary/80 via-primary/40 to-transparent"
                    : "bg-linear-to-t from-black/80 via-black/40 to-transparent",
                )}
              />
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
