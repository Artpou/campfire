import type * as React from "react";
import { ReactNode } from "react";

import WheelGesturesPlugin from "embla-carousel-wheel-gestures";

import { Carousel, CarouselContent, CarouselNext, CarouselPrevious } from "@/shared/ui/carousel";

type CarouselWrapperProps = Omit<React.ComponentProps<typeof Carousel>, "title"> & {
  title?: ReactNode;
  children: React.ReactNode;
};

export function CarouselWrapper({ title, children, ...props }: CarouselWrapperProps) {
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
        <div className="flex gap-2">
          <CarouselPrevious className="static translate-y-0 h-8 w-8" />
          <CarouselNext className="static translate-y-0 h-8 w-8" />
        </div>
      </div>

      <CarouselContent>{children}</CarouselContent>
    </Carousel>
  );
}
