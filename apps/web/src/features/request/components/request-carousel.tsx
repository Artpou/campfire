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
}

export function RequestCarousel({ requests, title, seeMoreTo }: RequestCarouselProps) {
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
    >
      {requests.map((request) => (
        <CarouselItem key={request.id} className="basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 xl:basis-1/7">
          <RequestCard request={request} />
        </CarouselItem>
      ))}
    </CarouselWrapper>
  );
}
