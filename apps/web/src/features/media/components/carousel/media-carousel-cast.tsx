import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { UsersIcon } from "lucide-react";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { PersonCard } from "@/features/person/components/person-card";

type MediaCastPerson = {
  id: number;
  name: string;
  profile_path?: string | null;
  role?: string;
  type: "Director" | "Actor";
};

interface MediaCastCarouselProps {
  people: MediaCastPerson[];
  title?: ReactNode;
}

export function MediaCastCarousel({ people, title }: MediaCastCarouselProps) {
  if (people.length === 0) return null;

  return (
    <CarouselWrapper
      title={
        title ?? (
          <span className="flex items-center gap-2">
            <UsersIcon className="size-5" />
            <Trans>Cast & Crew</Trans>
          </span>
        )
      }
    >
      {people.map((person) => (
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
