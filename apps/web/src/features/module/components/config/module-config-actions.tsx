import { Trans } from "@lingui/react/macro";
import { PlugZapIcon, SaveIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface ModuleConfigActionsProps {
  canSave?: boolean;
  canTest?: boolean;
  onTest?: () => void;
  isPending: boolean;
  isSaving: boolean;
  isTesting: boolean;
}

export function ModuleConfigActions({
  canSave = true,
  canTest = false,
  onTest,
  isPending,
  isSaving,
  isTesting,
}: ModuleConfigActionsProps) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      {canTest && onTest && (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          icon={PlugZapIcon}
          onClick={onTest}
          disabled={isPending}
          loading={isTesting}
        >
          <Trans>Test connection</Trans>
        </Button>
      )}
      <Button type="submit" size="lg" icon={SaveIcon} disabled={!canSave || isPending} loading={isSaving}>
        <Trans>Save</Trans>
      </Button>
    </div>
  );
}
