import { useMemo } from "react";

import type { Movie, TV } from "@seedarr/sdk";

import { PersonCarousel } from "@/features/person/components/person-carousel";

interface MediaCastProps {
  data: Movie | TV;
}

export function MediaCarouselCast({ data }: MediaCastProps) {
  const people = useMemo(() => {
    if ("movie" in data) {
      const directors =
        data.movie.credits?.crew
          ?.filter((person) => person.job === "Director")
          .map((d) => ({ ...d, role: "Director", type: "Director" as const })) || [];
      const actors =
        data.movie.credits?.cast?.slice(0, 20).map((a) => ({ ...a, role: a.character, type: "Actor" as const })) || [];
      return [...directors, ...actors];
    }

    const creators =
      data.tv.created_by?.map((c) => ({
        id: c.id,
        name: c.name,
        profile_path: c.profile_path,
        role: "Creator",
        type: "Director" as const,
      })) || [];
    const actors =
      data.tv.credits?.cast?.slice(0, 20).map((a) => ({ ...a, role: a.character, type: "Actor" as const })) || [];
    return [...creators, ...actors];
  }, [data]);

  if (people.length === 0) return null;
  return <PersonCarousel people={people} />;
}
