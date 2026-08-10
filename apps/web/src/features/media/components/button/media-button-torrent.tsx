import { Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { MagnetIcon } from "lucide-react";

import { Button, type ButtonProps } from "@/shared/ui/button";

interface MediaButtonTorrentProps extends ButtonProps {
  media: Media;
}

export function MediaButtonTorrent({ media, className, ...props }: MediaButtonTorrentProps) {
  const to = media.type === "tv" ? "/tv/$id/torrents" : "/movies/$id/torrents";

  return (
    <Button asChild icon={MagnetIcon} {...props}>
      <Link to={to} params={{ id: media.id.toString() }}>
        <Trans>Torrents</Trans>
      </Link>
    </Button>
  );
}
