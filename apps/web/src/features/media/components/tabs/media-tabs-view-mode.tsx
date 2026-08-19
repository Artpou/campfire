import { LayoutGridIcon, ListIcon } from "lucide-react";

import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import {
  useUserPreferences,
  type ViewMode,
  type ViewModeScope,
} from "@/features/settings/stores/user-preference-store";

const VIEW_OPTIONS: { value: ViewMode; icon: typeof LayoutGridIcon }[] = [
  { value: "grid", icon: LayoutGridIcon },
  { value: "list", icon: ListIcon },
];

export function MediaTabsViewMode({ scope }: { scope: ViewModeScope }) {
  const isMobile = useIsMobile();
  const viewMode = useUserPreferences((s) => s.viewModes[scope]);
  const setViewMode = useUserPreferences((s) => s.setViewMode);

  if (isMobile) return null;

  return (
    <Tabs value={viewMode} onValueChange={(v) => setViewMode(scope, v as ViewMode)}>
      <TabsList size="lg">
        {VIEW_OPTIONS.map(({ value, icon: Icon }) => (
          <TabsTrigger key={value} value={value} size="lg">
            <Icon className="size-4 text-foreground" />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
