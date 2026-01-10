import { Media } from "@basement/api/types";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { PopcornIcon, Radio, SofaIcon, Star } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

export type MediaSelected = "home" | "cinema" | "top-rated" | "upcoming";

interface MediaSortTabsProps {
  value?: MediaSelected;
  type: Media["type"];
  onChange: (value: MediaSelected) => void;
}

export function MediaSortTabs({ value, type, onChange }: MediaSortTabsProps) {
  const { t } = useLingui();

  const activeValue = value || "home";

  const handleChange = (value: string) => {
    onChange(value as MediaSelected);
  };

  const sortOptions = [
    {
      value: "home",
      icon: <SofaIcon className="text-foreground" />,
      label: msg`At Home`,
    },
    ...(type === "movie"
      ? [
          {
            value: "cinema",
            icon: <PopcornIcon className="text-foreground" />,
            label: msg`In Cinema`,
          },
        ]
      : []),
    {
      value: "top-rated",
      icon: <Star className="text-foreground" />,
      label: msg`Top Rated`,
    },
    {
      value: "upcoming",
      icon: <Radio className="text-foreground" />,
      label: msg`Upcoming`,
    },
  ];

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
