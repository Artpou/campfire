import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { MagnetIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface MediaButtonTorrentProps {
  media: Media;
}

export function MediaButtonTorrent({ media }: MediaButtonTorrentProps) {
  return (
    <Button className="w-full" asChild>
      {media.type === "tv" ? (
        <Link to="/tv/$id/torrents" params={{ id: media.id.toString() }}>
          <MagnetIcon className="size-3" />
          <Trans>Torrents</Trans>
        </Link>
      ) : (
        <Link to="/movies/$id/torrents" params={{ id: media.id.toString() }}>
          <MagnetIcon className="size-3" />
          <Trans>Torrents</Trans>
        </Link>
      )}
    </Button>
  );
}
