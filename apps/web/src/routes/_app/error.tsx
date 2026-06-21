import { Trans } from "@lingui/react/macro";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";

import { validateErrorSearch } from "@/routes/helpers/error-route.helper";

export const Route = createFileRoute("/_app/error")({
  validateSearch: validateErrorSearch,
  component: ErrorPage,
});

function ErrorPage() {
  const router = useRouter();
  const { message } = Route.useSearch();

  return (
    <Container>
      <div className="flex items-center justify-center py-24">
        <Card className="max-w-2xl w-full text-center">
          <CardHeader>
            <CardTitle className="text-4xl font-bold text-destructive">
              <Trans>Something went wrong</Trans>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-muted-foreground">
              <Trans>An unexpected error occurred. Please try again later.</Trans>
            </p>
            {message && (
              <div className="bg-destructive/10 border border-destructive p-4">
                <p className="text-destructive font-mono text-sm break-all">{message}</p>
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" onClick={() => router.history.back()}>
                <Trans>Go back</Trans>
              </Button>
              <Button onClick={() => window.location.reload()}>
                <Trans>Reload page</Trans>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
