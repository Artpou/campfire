import { useLingui } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { DownloadIcon, RadioIcon, SparklesIcon, StarIcon } from "lucide-react";

import { ResponsiveTabs } from "@/shared/components/responsive-tabs";

import { isMediaSelected } from "@/features/media/helpers/discover-search.helper";

interface MediaSortTabsProps {
  value?: "new" | "top-rated" | "downloaded" | "upcoming";
  type: Media["type"];
  onChange: (value: "new" | "top-rated" | "downloaded" | "upcoming") => void;
}

export function MediaSortTabs({ value, onChange }: MediaSortTabsProps) {
  const { t } = useLingui();

  const activeValue = value || "new";

  const handleChange = (next: string) => {
    if (isMediaSelected(next)) onChange(next);
  };

  const sortOptions = [
    {
      value: "new",
      icon: SparklesIcon,
      label: t`New`,
    },
    {
      value: "top-rated",
      icon: StarIcon,
      label: t`Top Rated`,
    },
    {
      value: "downloaded",
      icon: DownloadIcon,
      label: t`Downloaded`,
    },
    {
      value: "upcoming",
      icon: RadioIcon,
      label: t`Upcoming`,
    },
  ];

  return <ResponsiveTabs value={activeValue} onValueChange={handleChange} options={sortOptions} />;
}
