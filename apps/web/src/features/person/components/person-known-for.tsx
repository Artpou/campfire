import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { SparklesIcon } from "lucide-react";

import { MediaCarousel } from "@/features/media/components/carousel/media-carousel";

interface PersonKnownForProps {
  knownFor: Media[];
}

export function PersonKnownFor({ knownFor }: PersonKnownForProps) {
  return (
    <MediaCarousel
      title={
        <span className="flex items-center gap-2">
          <SparklesIcon className="size-5" />
          <Trans>Known for</Trans>
        </span>
      }
      data={knownFor}
      showType
    />
  );
}
