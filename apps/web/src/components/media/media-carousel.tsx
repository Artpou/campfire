import { MovieCard } from "@/components/movies/movie-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface MediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

interface MediaCarouselProps {
  title: string;
  data: MediaItem[];
}

export function MediaCarousel({ title, data }: MediaCarouselProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight px-1">{title}</h2>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {data.map((item) => (
            <CarouselItem
              key={item.id}
              className="pl-4 basis-1/2 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
            >
              <div className="p-1">
                <MovieCard movie={item} />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  );
}
