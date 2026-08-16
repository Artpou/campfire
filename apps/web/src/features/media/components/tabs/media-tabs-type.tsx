import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { FilmIcon, LayoutGridIcon, TvIcon } from "lucide-react";

import { ResponsiveTabs } from "@/shared/components/responsive-tabs";

import { getMediaType } from "@/features/media/helpers/media.helper";

interface MediaTypeTabsProps {
  value?: Media["type"];
}

const TAB_OPTIONS = [
  { value: "all" as const, icon: LayoutGridIcon, label: msg({ id: "media-type.all", message: "All" }) },
  { value: "movie" as const, icon: FilmIcon, label: msg({ id: "media-type.movies", message: "Movies" }) },
  { value: "tv" as const, icon: TvIcon, label: msg({ id: "media-type.tv-shows", message: "TV Shows" }) },
] as const;

export function MediaTypeTabs({ value }: MediaTypeTabsProps) {
  const navigate = useNavigate();

  return (
    <ResponsiveTabs
      value={value ?? "all"}
      onValueChange={(v) =>
        navigate({
          to: "/downloads",
          search: (prev) => ({ ...prev, type: getMediaType(v) }),
          resetScroll: false,
        })
      }
      options={TAB_OPTIONS.map(({ value: val, icon, label }) => ({
        value: val ?? "all",
        icon,
        label: <Trans id={label.id} />,
      }))}
    />
  );
}
