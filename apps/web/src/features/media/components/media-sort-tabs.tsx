import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { PopcornIcon, Radio, SofaIcon, Star } from "lucide-react";
import { SortOption } from "tmdb-ts";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const sortOptions = [
  {
    value: "4|5",
    type: "release" as const,
    icon: <SofaIcon className="text-foreground" />,
    label: msg`At Home`,
  },
  {
    value: "3",
    type: "release" as const,
    icon: <PopcornIcon className="text-foreground" />,
    label: msg`In Cinema`,
  },
  {
    value: "vote_average.desc",
    type: "sort" as const,
    icon: <Star className="text-foreground" />,
    label: msg`Top Rated`,
  },
  {
    value: "release_date.desc",
    type: "sort" as const,
    icon: <Radio className="text-foreground" />,
    label: msg`Upcoming`,
  },
];

interface MediaSortTabsProps {
  releaseValue?: string;
  onSortChange: (updates: { sort_by: SortOption }) => void;
  onReleaseChange: (updates: { with_release_type: string; release_date: { lte: string } }) => void;
}

export function MediaSortTabs({ releaseValue, onSortChange, onReleaseChange }: MediaSortTabsProps) {
  const { t } = useLingui();

  const activeValue = releaseValue || "4|5";

  const handleChange = (value: string) => {
    const option = sortOptions.find((opt) => opt.value === value);
    if (!option) return;

    if (option.type === "release") {
      const today = new Date().toISOString().split("T")[0];
      onReleaseChange({
        with_release_type: value,
        release_date: { lte: today },
      });
    } else {
      onSortChange({ sort_by: value as SortOption });
    }
  };

  return (
    <Tabs value={activeValue} onValueChange={handleChange}>
      <TabsList className="h-auto p-1">
        {sortOptions.map(({ value, icon, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {icon}
            <span className="font-medium">{t(label)}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
