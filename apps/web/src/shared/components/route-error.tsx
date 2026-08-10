import { Trans } from "@lingui/react/macro";
import { type ErrorComponentProps, Navigate, useRouter } from "@tanstack/react-router";
import { AlertTriangleIcon, RefreshCwIcon, Undo2Icon } from "lucide-react";

import { getErrorMessage, isRouteNotFound } from "@/shared/helpers/error.helper";
import { Button } from "@/shared/ui/button";

export function RouteErrorHandler({ error, reset }: ErrorComponentProps) {
  const router = useRouter();

  if (isRouteNotFound(error)) {
    return <Navigate to="/404" replace />;
  }

  const message = getErrorMessage(error);

  return (
    <div className="flex items-center justify-center py-24 px-4">
      <div className="max-w-xl w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex items-center justify-center size-14 rounded-full bg-destructive/10">
            <AlertTriangleIcon className="size-7 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold">
            <Trans>Something went wrong</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans>An unexpected error occurred. Please try again.</Trans>
          </p>
        </div>

        {message && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-left">
            <p className="text-destructive font-mono text-xs break-all">{message}</p>
          </div>
        )}

        {error?.stack && import.meta.env.DEV && (
          <pre className="bg-destructive/10 border border-destructive/20  text-destructive mt-2 max-h-60 overflow-x-auto rounded-lg p-4 font-mono text-xs">
            <code>{error.stack}</code>
          </pre>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => router.history.back()} icon={Undo2Icon}>
            <Trans>Go back</Trans>
          </Button>
          <Button onClick={reset} icon={RefreshCwIcon}>
            <Trans>Retry</Trans>
          </Button>
        </div>
      </div>
    </div>
  );
}
