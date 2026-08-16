import type * as React from "react";
import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import WheelGesturesPlugin from "embla-carousel-wheel-gestures";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Button } from "@/shared/ui/button";
import { Carousel, CarouselContent, CarouselNext, CarouselPrevious } from "@/shared/ui/carousel";

type CarouselWrapperProps = Omit<React.ComponentProps<typeof Carousel>, "title"> & {
  title?: ReactNode;
  seeMoreTo?: string;
  seeMoreSearch?: Record<string, unknown>;
  children: React.ReactNode;
};

export function CarouselWrapper({ title, seeMoreTo, seeMoreSearch, children, ...props }: CarouselWrapperProps) {
  const isMobile = useIsMobile();

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
        <h2 className="text-lg font-medium">{title}</h2>
        <div className="flex items-center gap-2">
          {seeMoreTo && (
            <Button variant="outline" size={!isMobile ? "sm" : "default"} asChild>
              <Link to={seeMoreTo} search={seeMoreSearch}>
                <Trans>See more</Trans>
              </Link>
            </Button>
          )}
          {!isMobile && <CarouselPrevious className="static translate-y-0 h-8 w-8" />}
          {!isMobile && <CarouselNext className="static translate-y-0 h-8 w-8" />}
        </div>
      </div>

      <CarouselContent>{children}</CarouselContent>
    </Carousel>
  );
}
