import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { TMDBMovieDetails } from "@seedarr/sdk";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { PersonCard } from "@/features/person/components/person-card";

interface MovieCastProps {
  movie: TMDBMovieDetails;
}

export function MovieCast({ movie }: MovieCastProps) {
  const castAndCrew = useMemo(() => {
    const directors =
      movie.credits?.crew
        ?.filter((person) => person.job === "Director")
        .map((d) => ({ ...d, role: "Director", type: "Director" as const })) || [];
    const actors =
      movie.credits?.cast?.slice(0, 20).map((a) => ({ ...a, role: a.character, type: "Actor" as const })) || [];
    return [...directors, ...actors];
  }, [movie.credits]);

  if (castAndCrew.length === 0) return null;

  return (
    <CarouselWrapper title={<Trans>Cast & Crew</Trans>}>
      {castAndCrew.map((person) => (
        <CarouselItem
          key={`${person.id}-${person.role}`}
          className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/7 xl:basis-1/8"
        >
          <PersonCard {...person} />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
