import { useEffect, useState } from "react";

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { indexersManagerImages } from "@/features/indexers-manager/helpers/indexers-manager.helper";
import type { TorrentSource } from "@/features/torrent/hooks/torrent.queries";

interface IndexerQueryStat {
  status: "loading" | "success" | "error" | "idle";
  count: number;
}

interface TorrentIndexersTableProps {
  sources: TorrentSource[];
  indexerStats: IndexerQueryStat[];
  onVisibilityChange: (visibleSources: Set<string>) => void;
}

function ModuleIndexerStatusBadge({ status }: { status: "loading" | "success" | "error" | "idle" }) {
  switch (status) {
    case "loading":
      return (
        <Badge variant="outline">
          <Trans>Loading</Trans>
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive-outline">
          <Trans>Error</Trans>
        </Badge>
      );
    case "success":
      return (
        <Badge variant="success-outline">
          <Trans>Success</Trans>
        </Badge>
      );
    default:
      return (
        <Badge variant="warning-outline">
          <Trans>Idle</Trans>
        </Badge>
      );
  }
}

export function TorrentIndexersTable({ sources, indexerStats, onVisibilityChange }: TorrentIndexersTableProps) {
  const [visibleSources, setVisibleSources] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sources.length > 0 && visibleSources.size === 0) {
      const all = new Set(sources.map((source) => source.id));
      setVisibleSources(all);
      onVisibilityChange(all);
    }
  }, [sources, visibleSources.size, onVisibilityChange]);

  const toggleVisibility = (sourceId: string) => {
    setVisibleSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) next.delete(sourceId);
      else next.add(sourceId);
      onVisibilityChange(next);
      return next;
    });
  };

  return (
    <div className="space-y-3 sticky top-4 mt-9">
      <h3 className="pl-1 text-sm font-bold tracking-wider text-muted-foreground uppercase">
        <Trans>Indexers</Trans> ({sources.length})
      </h3>
      <div className="w-full overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10" />
              <TableHead className="w-full">
                <Trans>Name</Trans>
              </TableHead>
              <TableHead className="whitespace-nowrap">
                <Trans>Status</Trans>
              </TableHead>
              <TableHead className="text-right whitespace-nowrap">
                <Trans>Found</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.length > 0 ? (
              sources.map((source, index) => {
                const stat = indexerStats[index];
                const isVisible = visibleSources.has(source.id);
                const managerType = source.indexerManagerType;

                return (
                  <TableRow key={source.id} className={!isVisible ? "opacity-50" : ""}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleVisibility(source.id)}
                        aria-label={isVisible ? t`Hide indexer` : t`Show indexer`}
                      >
                        {stat?.status === "loading" ? (
                          <Spinner />
                        ) : (
                          <img
                            src={indexersManagerImages[managerType]}
                            alt={managerType}
                            className={cn("size-4 object-contain", !isVisible && "grayscale opacity-50")}
                          />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium text-sm truncate max-w-[140px]">{source.label}</TableCell>
                    <TableCell>
                      <ModuleIndexerStatusBadge status={stat?.status ?? "idle"} />
                    </TableCell>
                    <TableCell className="text-right font-bold">{stat?.count ?? 0}</TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6">
                  <p className="text-sm text-muted-foreground">
                    <Trans>No indexers configured</Trans>
                  </p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <Button asChild variant="secondary" className="w-full" icon={SettingsIcon}>
        <Link to="/settings/modules" params={{ tab: "indexer" }}>
          <Trans>Configure indexers</Trans>
        </Link>
      </Button>
    </div>
  );
}
