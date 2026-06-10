import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";

import { MediaCarousel } from "@/features/media/components/media-carousel";

interface TvRelatedProps {
  recommendedTV: Media[];
}

export function TvRelated({ recommendedTV }: TvRelatedProps) {
  if (recommendedTV.length === 0) return null;

  return <MediaCarousel title={<Trans>Recommended</Trans>} data={recommendedTV} />;
}
