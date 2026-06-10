import { Trans } from "@lingui/react/macro";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Card } from "@/shared/ui/card";
import { Container } from "@/shared/ui/container";

import { useAuth } from "@/features/auth/auth-store";
import { MediaCard } from "@/features/media/components/media-card";
import { useMedias } from "@/features/media/hooks/use-media";

export const Route = createFileRoute("/_app/downloads/")({
  component: DownloadsPage,
  beforeLoad: () => {
    const user = useAuth.getState().user;
    if (user?.role === "viewer") {
      throw redirect({ to: "/404" });
    }
  },
});
function DownloadsPage() {
  const { results, isLoading } = useMedias({ filter: "downloaded" });

  if (isLoading) return <SeedarrLoader />;

  return (
    <Container>
      {results.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-6 gap-4">
          {results.map((media) => {
            if (!media.download) return null;

            return <MediaCard key={media.download.id} media={media} />;
          })}
        </div>
      ) : (
        <Card>
          <div className="py-10 text-center">
            <p className="text-muted-foreground">
              <Trans>No downloads yet</Trans>
            </p>
          </div>
        </Card>
      )}
    </Container>
  );
}
