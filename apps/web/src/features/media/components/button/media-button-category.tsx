import { Trans, useLingui } from "@lingui/react/macro";

import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";

import { useUserPreferences } from "@/features/settings/stores/user-preference-store";

export function MediaButtonCategory() {
  const { t } = useLingui();
  const showCategories = useUserPreferences((s) => s.showCategories);
  const setShowCategories = useUserPreferences((s) => s.setShowCategories);

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      className="h-10 gap-2 px-3"
      onClick={() => setShowCategories(!showCategories)}
      aria-pressed={showCategories}
      aria-label={t`Category`}
    >
      <Checkbox checked={showCategories} className="pointer-events-none" tabIndex={-1} />
      <Trans>Category</Trans>
    </Button>
  );
}
