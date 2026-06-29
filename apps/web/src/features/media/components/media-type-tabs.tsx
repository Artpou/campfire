import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { FilmIcon, LayoutGridIcon, TvIcon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

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
    <Tabs
      value={value ?? "all"}
      onValueChange={(v) => navigate({ to: "/downloads", search: { type: getMediaType(v) } })}
    >
      <TabsList size="lg">
        {TAB_OPTIONS.map(({ value: val, icon: Icon, label }) => (
          <TabsTrigger key={val} value={val ?? "all"} size="lg">
            <Icon className="size-4 text-foreground" />
            <span className="font-medium">
              <Trans id={label.id} />
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
