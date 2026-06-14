import { useRef, useState } from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";

import { Button } from "@/shared/ui/button";

import { useAuth } from "@/features/auth/auth-store";
import { indexerQueries } from "@/features/torrent/hooks/indexer.queries";

export const Route = createFileRoute("/_app/settings/indexer")({
  component: IndexerDashboardPage,
  beforeLoad: () => {
    const user = useAuth.getState().user;
    if (user?.role !== "owner" && user?.role !== "admin") {
      throw redirect({ to: "/settings" });
    }
  },
});

function IndexerDashboardPage() {
  const { t } = useLingui();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  const { data: indexer, isLoading } = useQuery({
    queryKey: [...indexerQueries.key],
    queryFn: () => unwrap(api["indexer-manager"].$get()),
  });

  const url = indexer?.indexerUrl;

  if (isLoading) {
    return null;
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <p className="text-muted-foreground">{t(msg`No indexer configured.`)}</p>
        <Button asChild>
          <Link to="/settings">
            <ArrowLeftIcon className="size-4" />
            {t(msg`Back to settings`)}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b bg-background">
        <Button asChild variant="ghost" size="sm">
          <Link to="/settings">
            <ArrowLeftIcon className="size-4" />
            {t(msg`Back`)}
          </Link>
        </Button>
        <div className="flex-1 text-sm text-muted-foreground truncate">{url}</div>
        <Button asChild variant="outline" size="sm">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLinkIcon className="size-4" />
            {t(msg`Open in new tab`)}
          </a>
        </Button>
      </div>

      {loadFailed ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
          <p className="text-muted-foreground">
            {t(
              msg`This indexer cannot be embedded in an iframe (security restrictions). Open it in a new tab instead.`,
            )}
          </p>
          <Button asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <ExternalLinkIcon className="size-4" />
              {t(msg`Open indexer dashboard`)}
            </a>
          </Button>
        </div>
      ) : (
        <iframe
          ref={iframeRef}
          src={url}
          title={t(msg`Indexer dashboard`)}
          className="flex-1 w-full border-0"
          onError={() => setLoadFailed(true)}
        />
      )}
    </div>
  );
}
