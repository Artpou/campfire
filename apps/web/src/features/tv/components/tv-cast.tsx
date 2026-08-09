import { useMemo } from "react";

import type { TMDBTvDetails } from "@seedarr/sdk";

import { MediaCastCarousel } from "@/features/media/components/carousel/media-carousel-cast";

interface TvCastProps {
  tv: TMDBTvDetails;
}

export function TvCast({ tv }: TvCastProps) {
  const castAndCrew = useMemo(() => {
    const creators =
      tv.created_by?.map((c) => ({
        id: c.id,
        name: c.name,
        profile_path: c.profile_path,
        role: "Creator",
        type: "Director" as const,
      })) || [];
    const actors =
      tv.credits?.cast?.slice(0, 20).map((a) => ({ ...a, role: a.character, type: "Actor" as const })) || [];
    return [...creators, ...actors];
  }, [tv.created_by, tv.credits]);

  return <MediaCastCarousel people={castAndCrew} />;
}
