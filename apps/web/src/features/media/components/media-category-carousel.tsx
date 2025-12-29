import { useNavigate } from "@tanstack/react-router";

import { Card, CardContent } from "@/shared/ui/card";
import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";
import { Skeleton } from "@/shared/ui/skeleton";

import { Media, useMovieGenres, useTVGenres } from "@/features/media/hooks/use-media";

interface MediaCategoryCarouselProps {
  type: Media["type"];
}

export function MediaCategoryCarousel({ type }: MediaCategoryCarouselProps) {
  const { data: movieGenres = [], isLoading: isLoadingMovies } = useMovieGenres();
  const { data: tvGenres = [], isLoading: isLoadingTV } = useTVGenres();
  const navigate = useNavigate();

  const genres = type === "movie" ? movieGenres : tvGenres;
  const isLoading = type === "movie" ? isLoadingMovies : isLoadingTV;

  const handleGenreClick = (genreId: number) => {
    navigate({
      to: type === "movie" ? "/movies" : "/tv",
      search: { genre: genreId.toString() },
    });
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
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-transparent" />
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
