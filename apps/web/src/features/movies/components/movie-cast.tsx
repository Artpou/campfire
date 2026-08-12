import { useMemo } from "react";

import type { TMDBMovieDetails } from "@seedarr/sdk";

import { PersonCarousel } from "@/features/person/components/person-carousel";

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

  return <PersonCarousel people={castAndCrew} />;
}
