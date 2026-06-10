import type * as React from "react";
import { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import WheelGesturesPlugin from "embla-carousel-wheel-gestures";

import { Button } from "@/shared/ui/button";
import { Carousel, CarouselContent, CarouselNext, CarouselPrevious } from "@/shared/ui/carousel";

type CarouselWrapperProps = Omit<React.ComponentProps<typeof Carousel>, "title"> & {
  title?: ReactNode;
  seeMoreTo?: string;
  children: React.ReactNode;
};

export function CarouselWrapper({ title, seeMoreTo, children, ...props }: CarouselWrapperProps) {
  return (
    <Carousel
      {...props}
      opts={{
        align: "start",
        dragFree: true,
        ...props.opts,
      }}
      plugins={[WheelGesturesPlugin()]}
    >
      <div className="flex items-end justify-between gap-4 mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          {seeMoreTo && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={seeMoreTo}>
                <Trans>See more</Trans>
              </Link>
            </Button>
          )}
          <CarouselPrevious className="static translate-y-0 h-8 w-8" />
          <CarouselNext className="static translate-y-0 h-8 w-8" />
        </div>
      </div>

      <CarouselContent>{children}</CarouselContent>
    </Carousel>
  );
}
