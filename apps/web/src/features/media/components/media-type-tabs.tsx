import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { FilmIcon, LayoutGridIcon, TvIcon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { getMediaType } from "@/features/media/helpers/media.helper";

interface MediaTypeTabsProps {
  value?: Media["type"];
}

const TAB_OPTIONS = [
  { value: "all" as const, icon: LayoutGridIcon, label: msg`All` },
  { value: "movie" as const, icon: FilmIcon, label: msg`Movies` },
  { value: "tv" as const, icon: TvIcon, label: msg`TV Shows` },
];

export function MediaTypeTabs({ value }: MediaTypeTabsProps) {
  const { t } = useLingui();
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
            <span className="font-medium">{t(label)}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
