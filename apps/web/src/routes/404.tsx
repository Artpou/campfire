import { Trans } from "@lingui/react/macro";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

export const Route = createFileRoute("/404")({
  component: NotFoundPage,
});

function NotFoundPage() {
  const router = useRouter();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-2xl w-full text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold text-destructive">404</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground text-lg mb-6">
            <Trans>The page you're looking for doesn't exist.</Trans>
          </p>
          <Button onClick={handleGoBack}>
            <Trans>Go Back</Trans>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
