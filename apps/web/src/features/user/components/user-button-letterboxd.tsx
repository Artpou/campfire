import { Trans } from "@lingui/react/macro";
import type { User } from "@seedarr/sdk";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { UserButtonLetterboxdImport } from "@/features/user/components/user-button-letterboxd-import";
import { useSyncLetterboxd } from "@/features/user/hooks/user.queries";

interface UserButtonLetterboxdProps {
  user: User;
}

export function UserButtonLetterboxd({ user }: UserButtonLetterboxdProps) {
  const syncLetterboxd = useSyncLetterboxd();
  const connected = Boolean(user.letterboxdUsername);

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <img src="/profile/letterboxd.png" alt="" className="size-5 rounded-full" />
        <div className="flex flex-col">
          <span>Letterboxd</span>
          {connected && user.letterboxdUsername && (
            <span className="text-muted-foreground font-normal">@{user.letterboxdUsername}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <UserButtonLetterboxdImport />
        <Button
          variant="outline"
          loading={syncLetterboxd.isPending}
          disabled={!connected || syncLetterboxd.isPending}
          tooltip={<Trans>RSS feed</Trans>}
          onClick={() => syncLetterboxd.mutate()}
        >
          <Trans>Synchronize</Trans>
        </Button>
      </div>
    </Card>
  );
}
