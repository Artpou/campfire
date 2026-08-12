import { useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { DownloadIcon, RadioIcon, SparklesIcon, StarIcon } from "lucide-react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { isMediaSelected } from "@/features/media/helpers/discover-search.helper";

interface MediaSortTabsProps {
  value?: "new" | "top-rated" | "downloaded" | "upcoming";
  type: Media["type"];
  onChange: (value: "new" | "top-rated" | "downloaded" | "upcoming") => void;
}

export function MediaSortTabs({ value, onChange }: MediaSortTabsProps) {
  const { t } = useLingui();
  const isMobile = useIsMobile();

  const activeValue = value || "new";

  const handleChange = (value: string) => {
    if (isMediaSelected(value)) onChange(value);
  };

  const sortOptions = [
    {
      value: "new" as const,
      icon: <SparklesIcon className="text-foreground" />,
      label: t`New`,
    },
    {
      value: "top-rated" as const,
      icon: <StarIcon className="text-foreground" />,
      label: t`Top Rated`,
    },
    {
      value: "downloaded" as const,
      icon: <DownloadIcon className="text-foreground" />,
      label: t`Downloaded`,
    },
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
