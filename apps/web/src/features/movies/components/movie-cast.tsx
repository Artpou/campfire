import { useMemo } from "react";

import type { Cast, Crew, MovieDetails as TMDBMovieDetails } from "tmdb-ts";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { PersonCard } from "@/features/person/components/person-card";

interface MovieCastProps {
  movie: TMDBMovieDetails & {
    credits?: {
      cast?: Cast[];
      crew?: Crew[];
    };
  };
}

export function MovieCast({ movie }: MovieCastProps) {
  const castAndCrew = useMemo(() => {
    const directors =
      movie.credits?.crew
        ?.filter((person: Crew) => person.job === "Director")
        .map((d: Crew) => ({ ...d, role: "Director", type: "Director" as const })) || [];
    const actors =
      movie.credits?.cast
        ?.slice(0, 20)
        .map((a: Cast) => ({ ...a, role: a.character, type: "Actor" as const })) || [];
    return [...directors, ...actors];
  }, [movie.credits]);

  if (castAndCrew.length === 0) return null;

  return (
    <section className="container mx-auto px-6 md:px-12 py-8">
      <CarouselWrapper title="Cast & Crew">
        {castAndCrew.map((person) => (
          <CarouselItem
            key={`${person.id}-${person.role}`}
            className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/7 xl:basis-1/8"
          >
            <PersonCard {...person} />
          </CarouselItem>
        ))}
      </CarouselWrapper>
    </section>
  );
}
