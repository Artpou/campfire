import { useIsMobile } from "@/shared/hooks/use-mobile";

import { useUserPreferences, type ViewMode } from "@/features/settings/stores/user-preference-store";

/** List layout is desktop-only — always force grid on mobile. */
export function useEffectiveViewMode(): ViewMode {
  const isMobile = useIsMobile();
  const viewMode = useUserPreferences((s) => s.viewMode);
  return isMobile ? "grid" : viewMode;
}
