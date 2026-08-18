import { useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { Media, Person } from "@seedarr/sdk";
import { ClapperboardIcon } from "lucide-react";

import { ResponsiveTabs } from "@/shared/components/responsive-tabs";

import { MediaGrid } from "@/features/media/components/media-grid";

type FilmographyTab = "all" | "acting" | string;

interface PersonFilmographyProps {
  filmography: Person["filmography"];
  departments: string[];
}

function dedupeMedia(items: Media[]): Media[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.type}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function PersonFilmography({ filmography, departments }: PersonFilmographyProps) {
  const [activeTab, setActiveTab] = useState<FilmographyTab>("all");

  const items = useMemo(() => {
    if (activeTab === "all") {
      return dedupeMedia([...filmography.cast, ...filmography.crew]);
    }
    if (activeTab === "acting") {
      return filmography.cast;
    }
    return dedupeMedia(filmography.crew.filter((item) => item.department === activeTab));
  }, [activeTab, filmography]);

  const hasContent = filmography.cast.length > 0 || filmography.crew.length > 0;
  if (!hasContent) return null;

  const options = [
    { value: "all", label: <Trans>All</Trans> },
    ...(filmography.cast.length > 0
      ? [{ value: "acting", label: <Trans>Acting ({filmography.cast.length})</Trans> }]
      : []),
    ...departments.map((department) => {
      const count = filmography.crew.filter((c) => c.department === department).length;
      return { value: department, label: `${department} (${count})` };
    }),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ClapperboardIcon className="size-5" />
          <Trans>Filmography</Trans>
        </h2>
        <ResponsiveTabs value={activeTab} onValueChange={setActiveTab} options={options} className="md:w-auto" />
      </div>

      <MediaGrid items={items} showType />
    </div>
  );
}
