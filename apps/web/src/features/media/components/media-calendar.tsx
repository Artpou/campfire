import { useMemo, useState } from "react";

import { Plural, Trans } from "@lingui/react/macro";
import type { Media } from "@seedarr/sdk";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";

import { MediaCard } from "@/features/media/components/card/media-card";
import { MediaTable } from "@/features/media/components/media-table";
import type { ViewMode } from "@/features/settings/stores/user-preference-store";

interface MediaCalendarProps {
  items: Media[];
  viewMode: ViewMode;
}

interface MonthGroup {
  key: string;
  label: string;
  items: Media[];
}

function activityTime(media: Media): number {
  const raw = media.activityAt ?? media.userReviewAt ?? media.progress?.updatedAt;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function groupByMonth(items: Media[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>();

  for (const item of items) {
    const time = activityTime(item);
    const date = time > 0 ? new Date(time) : new Date();
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const existing = map.get(key);
    if (existing) {
      existing.items.push(item);
    } else {
      map.set(key, {
        key,
        label: date.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
        items: [item],
      });
    }
  }

  return [...map.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function MediaCalendar({ items, viewMode }: MediaCalendarProps) {
  const groups = useMemo(() => groupByMonth(items), [items]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-10 text-center">
        <Trans>No watched media yet</Trans>
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {groups.map((group) => {
        const isCollapsed = collapsed[group.key] ?? false;
        return (
          <section key={group.key} className="space-y-4">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                icon={isCollapsed ? ChevronRightIcon : ChevronDownIcon}
                aria-label={isCollapsed ? "Expand month" : "Collapse month"}
                onClick={() => setCollapsed((prev) => ({ ...prev, [group.key]: !isCollapsed }))}
              />
              <h2 className="text-sm font-medium whitespace-nowrap capitalize">
                {group.label}{" "}
                <span className="text-muted-foreground font-normal">
                  (
                  <Plural value={group.items.length} one="# film/série vue" other="# films/séries vues" />)
                </span>
              </h2>
              <Separator className="flex-1" />
            </div>

            {!isCollapsed &&
              (viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {group.items.map((media) => (
                    <MediaCard key={`${media.type}-${media.id}`} media={media} withPreview />
                  ))}
                </div>
              ) : (
                <MediaTable media={group.items} />
              ))}
          </section>
        );
      })}
    </div>
  );
}
