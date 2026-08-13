import { useRef, useState } from "react";

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { api, unwrap } from "@seedarr/sdk";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";

import { redirectIfNotRole } from "@/shared/helpers/role.helper";
import { Button } from "@/shared/ui/button";

export interface IndexerSearch {
  managerId?: string;
}

export const Route = createFileRoute("/_app/settings/indexer")({
  component: IndexerDashboardPage,
  beforeLoad: ({ context }) => redirectIfNotRole(context, "admin", { to: "/settings/general" }),
  validateSearch: (search: Record<string, unknown>): IndexerSearch => ({
    managerId: typeof search.managerId === "string" ? search.managerId : undefined,
  }),
});

function IndexerDashboardPage() {
  const { t } = useLingui();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const { managerId } = Route.useSearch();

  const { data: manager, isLoading } = useQuery({
    queryKey: ["indexer-manager", managerId],
    queryFn: async () => {
      if (!managerId) return null;
      return unwrap(api["indexer-manager"][":id"].$get({ param: { id: managerId } }));
    },
    enabled: !!managerId,
  });

  const url = manager?.indexerUrl;

  if (isLoading) {
    return null;
  }

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <p className="text-muted-foreground">{t(msg`No indexer configured.`)}</p>
        <Button asChild icon={ArrowLeftIcon}>
          <Link to="/settings/indexers">{t(msg`Back to settings`)}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[90vh]">
      <div className="flex items-center gap-2 p-3 border-b bg-background">
        <Button asChild variant="ghost" size="sm" icon={ArrowLeftIcon}>
          <Link to="/settings/indexers">{t(msg`Back`)}</Link>
        </Button>
        <div className="flex-1 text-sm text-muted-foreground truncate">{url}</div>
        <Button asChild variant="outline" size="sm" icon={ExternalLinkIcon}>
          <a href={url} target="_blank" rel="noopener noreferrer">
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
          <Button asChild icon={ExternalLinkIcon}>
            <a href={url} target="_blank" rel="noopener noreferrer">
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
