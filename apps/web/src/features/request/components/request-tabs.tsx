import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react";
import type { RequestStatus } from "@seedarr/contracts";
import { BanIcon, CheckCircleIcon, ClockIcon, FilmIcon, LayoutGridIcon, TvIcon } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

const STATUS_OPTIONS = [
  { value: "all" as const, icon: LayoutGridIcon, label: msg({ id: "request-status.all", message: "All" }) },
  { value: "pending" as const, icon: ClockIcon, label: msg({ id: "request-status.pending", message: "Pending" }) },
  {
    value: "validated" as const,
    icon: CheckCircleIcon,
    label: msg({ id: "request-status.validated", message: "Validated" }),
  },
  {
    value: "cancelled" as const,
    icon: BanIcon,
    label: msg({ id: "request-status.cancelled", message: "Cancelled" }),
  },
] as const;

const TYPE_OPTIONS = [
  { value: "all" as const, icon: LayoutGridIcon, label: msg({ id: "media-type.all", message: "All" }) },
  { value: "movie" as const, icon: FilmIcon, label: msg({ id: "media-type.movies", message: "Movies" }) },
  { value: "tv" as const, icon: TvIcon, label: msg({ id: "media-type.tv-shows", message: "TV Shows" }) },
] as const;

interface RequestTabsProps {
  status?: RequestStatus;
  type?: "movie" | "tv";
  onStatusChange: (status: RequestStatus | undefined) => void;
  onTypeChange: (type: "movie" | "tv" | undefined) => void;
}

export function RequestTabs({ status, type, onStatusChange, onTypeChange }: RequestTabsProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Tabs
        value={status ?? "all"}
        onValueChange={(v) => onStatusChange(v === "all" ? undefined : (v as RequestStatus))}
      >
        <TabsList size="lg" className="w-full sm:w-fit">
          {STATUS_OPTIONS.map(({ value, icon: Icon, label }) => (
            <TabsTrigger key={value} value={value} size="lg" className="flex-1 sm:flex-none gap-2">
              <Icon className="size-4 text-foreground" />
              <span className="font-medium">
                <Trans id={label.id} />
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Tabs value={type ?? "all"} onValueChange={(v) => onTypeChange(v === "all" ? undefined : (v as "movie" | "tv"))}>
        <TabsList size="lg" className="w-full sm:w-fit">
          {TYPE_OPTIONS.map(({ value, icon: Icon, label }) => (
            <TabsTrigger key={value} value={value} size="lg" className="flex-1 sm:flex-none gap-2">
              <Icon className="size-4 text-foreground" />
              <span className="font-medium">
                <Trans id={label.id} />
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
