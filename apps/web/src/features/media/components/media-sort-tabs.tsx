import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { PopcornIcon, RadioIcon, SofaIcon, StarIcon } from "lucide-react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { isMediaSelected } from "@/features/media/helpers/discover-search.helper";

interface MediaSortTabsProps {
  value?: "home" | "cinema" | "top-rated" | "upcoming";
  type: Media["type"];
  onChange: (value: "home" | "cinema" | "top-rated" | "upcoming") => void;
}

export function MediaSortTabs({ value, type, onChange }: MediaSortTabsProps) {
  const { t } = useLingui();
  const isMobile = useIsMobile();

  const activeValue = value || "home";

  const handleChange = (value: string) => {
    if (isMediaSelected(value)) onChange(value);
  };

  const sortOptions = [
    {
      value: "home",
      icon: <SofaIcon className="text-foreground" />,
      label: msg`At Home`,
    },
    {
      value: "top-rated",
      icon: <StarIcon className="text-foreground" />,
      label: msg`Top Rated`,
    },
    ...(type === "movie" && !isMobile
      ? [
          {
            value: "cinema",
            icon: <PopcornIcon className="text-foreground" />,
            label: msg`In Cinema`,
          },
        ]
      : []),
    ...(!isMobile
      ? [
          {
            value: "upcoming",
            icon: <RadioIcon className="text-foreground" />,
            label: msg`Upcoming`,
          },
        ]
      : []),
  ];

  return (
    <Tabs value={activeValue} onValueChange={handleChange}>
      <TabsList size="lg">
        {sortOptions.map(({ value, icon, label }) => (
          <TabsTrigger key={value} value={value} size="lg">
            {icon}
            {t(label)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
