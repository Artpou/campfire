import { useEffect, useMemo, useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { IndexerType, TorrentIndexerQuery } from "@seedarr/sdk";
import { Link } from "@tanstack/react-router";
import { SettingsIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { indexersManagerImages } from "@/features/indexers-manager/helpers/indexers-manager.helper";

interface IndexerQueryStat {
  status: "loading" | "success" | "error" | "idle";
  count: number;
}

interface TorrentIndexersTableProps {
  indexers: TorrentIndexerQuery[];
  indexerQueries: IndexerQueryStat[];
  onVisibilityChange: (visibleIndexers: Set<string>) => void;
}

export function TorrentIndexersTable({ indexers, indexerQueries, onVisibilityChange }: TorrentIndexersTableProps) {
  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  const indexerStats = useMemo(() => {
    return indexers.map((indexer, i) => {
      const queryStat = indexerQueries[i];

      return {
        id: indexer.id,
        name: indexer.label ?? indexer.name,
        indexerManagerType: indexer.indexerManagerType,
        status: queryStat?.status ?? "idle",
        count: queryStat?.count ?? 0,
      };
    });
  }, [indexers, indexerQueries]);

  useEffect(() => {
    if (indexers.length > 0 && visibleIndexers.size === 0) {
      const newSet = new Set(indexers.map((i) => i.id));
      setVisibleIndexers(newSet);
      onVisibilityChange(newSet);
    }
  }, [indexers, visibleIndexers.size, onVisibilityChange]);

  const toggleIndexerVisibility = (indexerId: string) => {
    setVisibleIndexers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indexerId)) {
        newSet.delete(indexerId);
      } else {
        newSet.add(indexerId);
      }
      onVisibilityChange(newSet);
      return newSet;
    });
  };

  const getStatusBadge = (status: "loading" | "success" | "error" | "idle") => {
    switch (status) {
      case "loading":
        return (
          <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
            <Trans>Loading</Trans>
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
            <Trans>Error</Trans>
          </Badge>
        );
      case "success":
        return (
          <Badge variant="default" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <Trans>Success</Trans>
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Trans>Idle</Trans>
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3 sticky top-4">
      <h3 className="pl-1 text-sm font-bold tracking-wider text-muted-foreground uppercase">
        <Trans>Indexers</Trans> ({indexerStats.length})
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
            {indexerStats.length > 0 ? (
              indexerStats.map((stat) => {
                const isVisible = visibleIndexers.has(stat.id);
                const managerType = stat.indexerManagerType as IndexerType | undefined;

                return (
                  <TableRow key={stat.id} className={!isVisible ? "opacity-50" : ""}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => toggleIndexerVisibility(stat.id)}
                      >
                        {stat.status === "loading" ? (
                          <Spinner />
                        ) : managerType ? (
                          <img
                            src={indexersManagerImages[managerType]}
                            alt={managerType}
                            className={cn("size-4 object-contain", !isVisible && "grayscale opacity-50")}
                          />
                        ) : (
                          <span className="size-4 rounded-full bg-muted" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{stat.name}</TableCell>
                    <TableCell>{getStatusBadge(stat.status)}</TableCell>
                    <TableCell className="text-right font-bold">{stat.count}</TableCell>
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
      <Button asChild variant="outline" className="w-full">
        <Link to="/settings">
          <SettingsIcon className="size-4" />
          <Trans>Configure indexers</Trans>
        </Link>
      </Button>
    </div>
  );
}
