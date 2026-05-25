import { useEffect, useMemo, useState } from "react";

import type { Torrent, TorrentIndexer } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";
import type { UseQueryResult } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Eye, EyeOff, SettingsIcon } from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Spinner } from "@/shared/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

interface TorrentIndexersTableProps {
  indexers: TorrentIndexer[];
  torrentQueries: UseQueryResult<Torrent[], Error>[];
  onVisibilityChange: (visibleIndexers: Set<string>) => void;
}

export function TorrentIndexersTable({
  indexers,
  torrentQueries,
  onVisibilityChange,
}: TorrentIndexersTableProps) {
  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  const indexerStats = useMemo(() => {
    return indexers.map((indexer, i) => {
      const query = torrentQueries[i];
      const data = query?.data;
      const torrentCount = Array.isArray(data) ? data.length : 0;

      let status: "loading" | "success" | "error" | "idle" = "idle";
      if (query?.isFetching) status = "loading";
      else if (query?.isError) status = "error";
      else if (query?.isSuccess) status = "success";

      return {
        id: indexer.id,
        name: indexer.name,
        status,
        count: torrentCount,
      };
    });
  }, [indexers, torrentQueries]);

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
          <Badge
            variant="secondary"
            className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
          >
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
          <Badge
            variant="default"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
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
              <TableHead className="w-10"></TableHead>
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

                return (
                  <TableRow key={stat.id} className={!isVisible ? "opacity-50" : ""}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggleIndexerVisibility(stat.id)}
                      >
                        {stat.status === "loading" ? (
                          <Spinner />
                        ) : isVisible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
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
