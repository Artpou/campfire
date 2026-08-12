import { Trans, useLingui } from "@lingui/react/macro";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";

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
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-muted-foreground",
          showCategories && "border-primary bg-primary text-primary-foreground",
        )}
      >
        {showCategories ? <CheckIcon className="size-3.5" /> : null}
      </span>
      <Trans>Category</Trans>
    </Button>
  );
}
