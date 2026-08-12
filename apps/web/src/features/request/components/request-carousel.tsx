import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import type { MediaRequest } from "@seedarr/sdk";
import { BellRingIcon } from "lucide-react";

import { CarouselItem } from "@/shared/ui/carousel";
import { CarouselWrapper } from "@/shared/ui/carousel-wrapper";

import { RequestCard } from "./request-card";

interface RequestCarouselProps {
  requests: MediaRequest[];
  title?: ReactNode;
  seeMoreTo?: string;
  seeMoreSearch?: Record<string, unknown>;
}

export function RequestCarousel({ requests, title, seeMoreTo, seeMoreSearch }: RequestCarouselProps) {
  if (requests.length === 0) return null;

  return (
    <CarouselWrapper
      title={
        title ?? (
          <span className="flex items-center gap-2">
            <BellRingIcon className="size-5" />
            <Trans>Pending Requests</Trans>
          </span>
        )
      }
      seeMoreTo={seeMoreTo}
      seeMoreSearch={seeMoreSearch}
    >
      {requests.map((request) => (
        <CarouselItem
          key={request.id}
          className="!w-auto basis-[85%] sm:basis-[55%] md:basis-[42%] lg:basis-[34%] xl:basis-[28%]"
        >
          <RequestCard request={request} />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
