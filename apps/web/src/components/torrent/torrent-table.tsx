import type { Torrent } from "@basement/api/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, Plus } from "lucide-react";
import ms from "ms";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTorrentIndexer } from "@/hooks/use-torrent-indexer";
import { api } from "@/lib/api";

interface TorrentTableProps {
  search: string;
  year?: string;
}

export function TorrentTable({ search, year }: TorrentTableProps) {
  const { indexerType, jackettApiKey, prowlarrApiKey } = useTorrentIndexer();
  const apiKey = indexerType === "jackett" ? jackettApiKey : prowlarrApiKey;

  // Track which indexers are visible (all visible by default)
  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  const { data: indexersResponse } = useQuery({
    queryKey: ["indexers", indexerType, apiKey],
    queryFn: async () => {
      if (!apiKey) return { data: [] };
      return api.torrents.indexers.get({
        $query: { indexer: indexerType, apiKey },
      });
    },
    enabled: !!apiKey,
    staleTime: ms("1h"),
  });

  const indexers = indexersResponse?.data ?? [];

  // Initialize visible indexers when indexers are loaded
  useMemo(() => {
    if (indexers.length > 0 && visibleIndexers.size === 0) {
      setVisibleIndexers(new Set(indexers.map((i) => i.id)));
    }
  }, [indexers, visibleIndexers.size]);

  const toggleIndexerVisibility = (indexerId: string) => {
    setVisibleIndexers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(indexerId)) {
        newSet.delete(indexerId);
      } else {
        newSet.add(indexerId);
      }
      return newSet;
    });
  };

  const torrentQueries = useQueries({
    queries: indexers.map((indexer) => ({
      queryKey: ["torrents", indexerType, apiKey, search, year, indexer.id],
      queryFn: () => {
        if (!apiKey) throw new Error("API key is required");
        return api.torrents.search.get({
          $query: {
            q: search,
            t: "movie",
            year,
            indexer: indexerType,
            apiKey,
            indexerId: indexer.id,
          },
        });
      },
      enabled: !!search && !!apiKey,
    })),
  });

  const { recommended, others } = useMemo(() => {
    const recommended: Torrent[] = [];
    const others: Torrent[] = [];

    torrentQueries.forEach((query, index) => {
      const indexerId = indexers[index]?.id;
      // Only include results from visible indexers
      if (query.data?.data && indexerId && visibleIndexers.has(indexerId)) {
        recommended.push(...query.data.data.recommended);
        others.push(...query.data.data.others);
      }
    });

    return {
      recommended: recommended.sort((a, b) => b.seeders - a.seeders),
      others: others.sort((a, b) => b.seeders - a.seeders),
    };
  }, [torrentQueries, indexers, visibleIndexers]);

  const fetchedCount = torrentQueries.filter((q) => q.isSuccess || q.isError).length;

  const isFetching = torrentQueries.some((q) => q.isFetching);
  const hasErrors = torrentQueries.some((q) => q.isError);
  const failedIndexers = torrentQueries
    .map((q, i) => (q.isError ? indexers[i]?.name : null))
    .filter((name): name is string => Boolean(name));

  const indexerStats = useMemo(() => {
    return indexers.map((indexer, i) => {
      const query = torrentQueries[i];
      const torrentCount =
        (query.data?.data?.recommended.length || 0) + (query.data?.data?.others.length || 0);

      let status: "loading" | "success" | "error" | "idle" = "idle";
      if (query.isFetching) status = "loading";
      else if (query.isError) status = "error";
      else if (query.isSuccess) status = "success";

      return {
        name: indexer.name,
        status,
        count: torrentCount,
      };
    });
  }, [indexers, torrentQueries]);

  const getStatusLabel = () => {
    if (!apiKey) return <Badge variant="destructive">Not Configured</Badge>;

    if (indexers.length === 0) return <Badge variant="destructive">No Indexers Found</Badge>;

    if (hasErrors && !isFetching) {
      return (
        <Badge
          variant="destructive"
          className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20"
        >
          Some indexers failed ({failedIndexers.length})
        </Badge>
      );
    }

    if (isFetching) {
      return (
        <Badge
          variant="secondary"
          className="bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"
        >
          Fetching ({fetchedCount}/{indexers.length})
        </Badge>
      );
    }

    return (
      <Badge
        variant="default"
        className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20"
      >
        Fetched ({indexers.length} indexers)
      </Badge>
    );
  };

  const renderTable = (data: Torrent[], title: string, showEmpty = false) => {
    if (data.length === 0 && !showEmpty) return null;

    return (
      <div className="space-y-3">
        <h3 className="pl-1 text-sm font-bold tracking-wider text-muted-foreground uppercase">
          {title} ({data.length})
        </h3>
        <div className="w-full overflow-hidden border rounded-sm border-border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-full">Torrent Name</TableHead>
                <TableHead>Tracker</TableHead>
                <TableHead>Quality</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="pr-8 text-right">Health</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length > 0 ? (
                data.map((torrent) => (
                  <TableRow key={torrent.guid || torrent.link} className="relative group">
                    <TableCell className="w-full max-w-0">
                      <a
                        href={torrent.detailsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full font-medium truncate transition-colors text-muted-foreground group-hover:text-foreground hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {torrent.title}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="h-4 px-1.5 text-[10px] font-black tracking-wider uppercase rounded-none bg-primary/10 border-primary/40 text-primary"
                      >
                        {torrent.tracker}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {torrent.quality && (
                        <Badge
                          variant="secondary"
                          className="h-5 px-1.5 text-[10px] font-black rounded-sm"
                        >
                          {torrent.quality}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-muted-foreground">
                        {(torrent.size / 1e9).toFixed(2)} GB
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-3 pr-4">
                        <div className="flex items-center gap-1 font-bold text-green-500">
                          <ArrowUp className="size-3" />
                          <span className="text-xs">{torrent.seeders}</span>
                        </div>
                        <div className="flex items-center gap-1 font-bold text-destructive">
                          <ArrowDown className="size-3" />
                          <span className="text-xs">{torrent.peers}</span>
                        </div>
                      </div>
                    </TableCell>
                    <div className="absolute inset-y-0 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="secondary" size="sm" asChild>
                        <a href={torrent.link}>
                          <Plus /> Download
                        </a>
                      </Button>
                      <Button size="sm" onClick={(e) => e.stopPropagation()}>
                        <Download /> Add
                      </Button>
                    </div>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center">
                    <div className="p-10 border border-dashed rounded-sm bg-muted border-border">
                      <p className="font-bold uppercase text-muted-foreground">No torrents found</p>
                      <p className="mt-1 text-xs uppercase text-muted-foreground/50">
                        Try adjusting your search query
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

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
    <div className="w-full">
      <div className="xl:hidden mb-8">
        <div className="flex items-center justify-between">{getStatusLabel()}</div>
      </div>

      <div className="w-full xl:grid xl:grid-cols-4 xl:gap-6">
        <div className="xl:col-span-3 space-y-8">
          {recommended.length > 0 || others.length > 0 ? (
            <>
              {renderTable(recommended, "Recommended Torrents")}
              {renderTable(others, "Other Torrents")}
            </>
          ) : (
            renderTable([], "Results", true)
          )}
        </div>

        <div className="hidden xl:block xl:col-span-1">
          <div className="space-y-3 sticky top-4">
            <h3 className="pl-1 text-sm font-bold tracking-wider text-muted-foreground uppercase">
              Indexers ({indexers.length})
            </h3>
            <div className="w-full overflow-hidden border rounded-sm border-border">
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
                              {isVisible ? (
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
        </div>
      </div>
    </div>
  );
}
