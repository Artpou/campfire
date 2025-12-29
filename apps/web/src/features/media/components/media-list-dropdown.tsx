import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Calendar, Radio, Star, TrendingUp } from "lucide-react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

import type { MovieList, TVList } from "@/features/media/hooks/use-media";

interface MovieCategoryDropdownProps {
  type: "movie";
  value: MovieList;
  onValueChange: (value: MovieList) => void;
}

interface TVCategoryDropdownProps {
  type: "tv";
  value: TVList;
  onValueChange: (value: TVList) => void;
}

type MediaCategoryDropdownProps = MovieCategoryDropdownProps | TVCategoryDropdownProps;

export function MediaListDropdown(props: MediaCategoryDropdownProps) {
  const { value, onValueChange } = props;
  const { t } = useLingui();

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[240px] text-lg">
        <div className="flex items-center gap-2">
          <SelectValue />
        </div>
      </SelectTrigger>
      <SelectContent>
        {[
          {
            value: "popular",
            icon: <TrendingUp className="text-foreground" />,
            label: msg`Popular`,
          },
          { value: "toprated", icon: <Star className="text-foreground" />, label: msg`Top Rated` },
          {
            value: "latest",
            icon: <Calendar className="text-foreground" />,
            label: msg`Airing Today`,
          },
          { value: "airing", icon: <Radio className="text-foreground" />, label: msg`Upcoming` },
        ].map(({ value, icon, label }) => (
          <SelectItem key={value} value={value} className="text-base">
            <div className="flex items-center gap-2">
              {icon}
              <span className="font-bold">
                <span>{t(label)}</span>
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
