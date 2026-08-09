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
      value: "home" as const,
      icon: <SofaIcon className="text-foreground" />,
      label: t`At Home`,
    },
    {
      value: "top-rated" as const,
      icon: <StarIcon className="text-foreground" />,
      label: t`Top Rated`,
    },
    ...(type === "movie" && !isMobile
      ? [
          {
            value: "cinema" as const,
            icon: <PopcornIcon className="text-foreground" />,
            label: t`In Cinema`,
          },
        ]
      : []),
    ...(!isMobile
      ? [
          {
            value: "upcoming" as const,
            icon: <RadioIcon className="text-foreground" />,
            label: t`Upcoming`,
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
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
