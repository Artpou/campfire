import { useMemo } from "react";

import { Trans } from "@lingui/react/macro";
import type { TMDBTvDetails } from "@seedarr/sdk";
import { UsersIcon } from "lucide-react";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { PersonCard } from "@/features/person/components/person-card";

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

  if (castAndCrew.length === 0) return null;

  return (
    <CarouselWrapper
      title={
        <span className="flex items-center gap-2">
          <UsersIcon className="size-5" />
          <Trans>Cast & Crew</Trans>
        </span>
      }
    >
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
