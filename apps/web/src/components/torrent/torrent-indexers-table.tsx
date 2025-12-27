import type { UseQueryResult } from "@tanstack/react-query";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Indexer {
  id: string;
  name: string;
}

interface TorrentIndexersTableProps {
  indexers: Indexer[];
  // biome-ignore lint/suspicious/noExplicitAny: any is used to avoid type errors
  torrentQueries: UseQueryResult<any, Error>[];
  onVisibilityChange: (visibleIndexers: Set<string>) => void;
}

export function TorrentIndexersTable({
  indexers,
  torrentQueries,
  onVisibilityChange,
}: TorrentIndexersTableProps) {
  // Track which indexers are visible (all visible by default)
  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  // Initialize visible indexers when indexers are loaded
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

  const indexerStats = useMemo(() => {
    return indexers.map((indexer, i) => {
      const query = torrentQueries[i];
      const torrentCount =
        (query?.data?.data?.recommended.length || 0) + (query?.data?.data?.others.length || 0);

      let status: "loading" | "success" | "error" | "idle" = "idle";
      if (query?.isFetching) status = "loading";
      else if (query?.isError) status = "error";
      else if (query?.isSuccess) status = "success";

      return {
        name: indexer.name,
        status,
        count: torrentCount,
      };
    });
  }, [indexers, torrentQueries]);

  const getStatusBadge = (status: "loading" | "success" | "error" | "idle") => {
    switch (status) {
      case "loading":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
          >
            Loading
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20">
            Error
          </Badge>
        );
      case "success":
        return (
          <Badge
            variant="default"
            className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          >
            Success
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            Idle
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3 sticky top-4">
      <h3 className="pl-1 text-sm font-bold tracking-wider text-muted-foreground uppercase">
        Indexers ({indexers.length})
      </h3>
      <div className="w-full overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-full">Name</TableHead>
              <TableHead className="whitespace-nowrap">Status</TableHead>
              <TableHead className="text-right whitespace-nowrap">Found</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {indexerStats.length > 0 ? (
              indexerStats.map((stat, index) => {
                const indexerId = indexers[index]?.id;
                const isVisible = indexerId ? visibleIndexers.has(indexerId) : true;

                return (
                  <TableRow key={stat.name} className={!isVisible ? "opacity-50" : ""}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => indexerId && toggleIndexerVisibility(indexerId)}
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
                  <p className="text-sm text-muted-foreground">No indexers configured</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
