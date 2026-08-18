import { Trans, useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { MagnetIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "@/shared/ui/button";

interface MediaButtonTorrentProps extends ButtonProps {
  media: Pick<Media, "id" | "type">;
  downloadId?: string;
  season?: number;
  episode?: number;
  circular?: boolean;
}

export function MediaButtonTorrent({
  media,
  downloadId,
  season,
  episode,
  className,
  circular = false,
  ...props
}: MediaButtonTorrentProps) {
  const { t } = useLingui();
  const to = media.type === "tv" ? "/tv/$id/torrents" : "/movies/$id/torrents";

  if (circular) {
    return (
      <button type="button" className={cn("cursor-pointer", className)} aria-label={t`Torrents`}>
        <span className="flex items-center justify-center size-16 rounded-full bg-primary/80 shadow-lg opacity-80 group-hover/poster:opacity-100 group-hover/poster:bg-primary group-hover/poster:scale-105 transition-all duration-300">
          <MagnetIcon className="size-8 text-white ml-1" />
        </span>
      </button>
    );
  }

  return (
    <Button asChild icon={MagnetIcon} className={cn(className)} {...props}>
      <Link to={to} params={{ id: media.id.toString() }}>
        <Trans>Torrents</Trans>
      </Link>
    </Button>
  );
}
