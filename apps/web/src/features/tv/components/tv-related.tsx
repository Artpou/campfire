import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";

import { MediaCarousel } from "@/features/media/components/media-carousel";

interface TvRelatedProps {
  recommendedTV: Media[];
}

export function TvRelated({ recommendedTV }: TvRelatedProps) {
  if (recommendedTV.length === 0) return null;

  return (
    <MediaCarousel
      title={
        <span className="flex items-center gap-2">
          <Trans>Recommended</Trans>
        </span>
      }
      data={recommendedTV}
    />
  );
}
