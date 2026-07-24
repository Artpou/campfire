import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";

import { MediaCarousel } from "@/features/media/components/media-carousel";

interface PersonKnownForProps {
  knownFor: Media[];
}

export function PersonKnownFor({ knownFor }: PersonKnownForProps) {
  return <MediaCarousel title={<Trans>Known for</Trans>} data={knownFor} />;
}
