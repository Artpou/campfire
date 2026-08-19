import { useIsMobile } from "@/shared/hooks/use-mobile";

import {
  useUserPreferences,
  type ViewMode,
  type ViewModeScope,
} from "@/features/settings/stores/user-preference-store";

/** List layout is desktop-only — always force grid on mobile. */
export function useEffectiveViewMode(scope: ViewModeScope): ViewMode {
  const isMobile = useIsMobile();
  const viewMode = useUserPreferences((s) => s.viewModes[scope]);
  return isMobile ? "grid" : viewMode;
}
