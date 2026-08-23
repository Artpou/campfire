import { Trans } from "@lingui/react/macro";
import { useRouter } from "@tanstack/react-router";
import { type LucideIcon, RefreshCwIcon, Undo2Icon } from "lucide-react";

import { Button } from "@/shared/ui/button";

interface ErrorLayoutProps {
  icon: LucideIcon;
  title: React.ReactNode;
  description: React.ReactNode;
  children?: React.ReactNode;
  onRetry?: () => void;
}

export function ErrorLayout({ icon: Icon, title, description, children, onRetry }: ErrorLayoutProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-center py-24 px-4 h-screen">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex items-center justify-center size-14 rounded-full bg-destructive/10">
            <Icon className="size-7 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {children}

        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => router.history.back()} icon={Undo2Icon}>
            <Trans>Go back</Trans>
          </Button>
          {onRetry && (
            <Button onClick={onRetry} icon={RefreshCwIcon}>
              <Trans>Retry</Trans>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
