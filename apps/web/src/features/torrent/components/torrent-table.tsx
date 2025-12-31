import { useState } from "react";

import { Trans } from "@lingui/react/macro";
import type { UseQueryResult } from "@tanstack/react-query";
import { useQueries, useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Download, ListFilter, Plus } from "lucide-react";

import { api } from "@/lib/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { SeedarrLoader } from "@/shared/ui/seedarr-loader";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";

import { TorrentIndexersTable } from "@/features/torrent/components/torrent-indexers-table";
import { Torrent } from "@/features/torrent/torrent";

interface TorrentTableProps {
  movieTitle: string;
  releaseYear?: string;
}

export function TorrentTable({ movieTitle, releaseYear }: TorrentTableProps) {
  const [activeTab, setActiveTab] = useState<"recommended" | "others">("recommended");
  const [visibleIndexers, setVisibleIndexers] = useState<Set<string>>(new Set());

  const { data: indexers = [] } = useQuery({
    queryKey: ["indexers"],
    queryFn: async () => {
      const response = await api.torrents.indexers.get();
      if (!response.data) return [];
      return response.data;
    },
  });

  // Fetch torrents from all indexers
  const { recommended, others, queries } = useQueries({
    queries: indexers.map((indexer) => ({
      queryKey: ["torrents", movieTitle, releaseYear, indexer.id],
      queryFn: () => {
        return api.torrents.search.get({
          query: {
            q: movieTitle,
            t: "movie",
            year: releaseYear,
            indexerId: indexer.id,
          },
        });
      },
      enabled: movieTitle.length > 1,
      retry: 1,
    })),
    combine: (results) => {
      const recommended: Torrent[] = [];
      const others: Torrent[] = [];

      for (const [index, query] of results.entries()) {
        const indexerId = indexers[index]?.id;

        // Only include results from visible indexers
        if (
          query.data?.data &&
          indexerId &&
          visibleIndexers.has(indexerId) &&
          typeof query.data.data === "object" &&
          query.data.data !== null &&
          "recommended" in query.data.data &&
          "others" in query.data.data
        ) {
          const data = query.data.data as { recommended: Torrent[]; others: Torrent[] };
          recommended.push(...data.recommended);
          others.push(...data.others);
        }
      }

      return {
        recommended: recommended.sort((a, b) => b.seeders - a.seeders),
        others: others.sort((a, b) => b.seeders - a.seeders),
        queries: results,
      };
    },
  });

  const renderTable = (data: Torrent[]) => {
    const isAnyIndexerLoading = queries.some((query) => query.isLoading);

    if (isAnyIndexerLoading && data.length === 0) {
      return (
        <Table className="h-[50vh] flex items-center justify-center">
          <SeedarrLoader />
        </Table>
      );
    }

    return (
      <div className="w-full overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-full">
                <Trans>Torrent Name</Trans>
              </TableHead>
              <TableHead className="hidden sm:table-cell text-center">
                <Trans>Size</Trans>
              </TableHead>
              <TableHead className="hidden sm:table-cell pr-8 text-right">
                <Trans>Health</Trans>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((torrent) => (
                <TableRow key={torrent.guid || torrent.link} className="relative group">
                  <TableCell className="w-full max-w-0">
                    <div className="flex flex-col gap-2">
                      <a
                        href={torrent.detailsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full font-medium truncate text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {torrent.title}
                      </a>
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{torrent.tracker}</Badge>
                        {torrent.quality && <Badge variant="secondary">{torrent.quality}</Badge>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="font-medium text-muted-foreground">
                      {(torrent.size / 1e9).toFixed(2)} GB
                    </span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell relative">
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
                    <div className="absolute inset-y-0 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      <Button variant="secondary" asChild>
                        <a href={torrent.link}>
                          <Plus /> <Trans>Download</Trans>
                        </a>
                      </Button>
                      <Button onClick={(e) => e.stopPropagation()}>
                        <Download /> <Trans>Add</Trans>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center">
                  <div className="p-10 border border-dashed rounded-sm bg-muted border-border">
                    <p className="font-bold uppercase text-muted-foreground">
                      <Trans>No torrents found</Trans>
                    </p>
                    <p className="mt-1 text-xs uppercase text-muted-foreground/50">
                      <Trans>Try adjusting your search query</Trans>
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="xl:grid xl:grid-cols-7 xl:gap-6">
      <div className="xl:col-span-5">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "recommended" | "others")}
        >
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="recommended">
                <Trans>Recommended</Trans> ({recommended.length})
              </TabsTrigger>
              <TabsTrigger value="others">
                <Trans>Others</Trans> ({others.length})
              </TabsTrigger>
            </TabsList>
            <div className="xl:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ListFilter className="h-4 w-4" />
                    <div className="hidden sm:block">
                      <Trans>Indexers</Trans> ({indexers.length})
                    </div>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:max-w-md">
                  <SheetHeader>
                    <SheetTitle>
                      <Trans>Torrent Indexers</Trans>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="px-4">
                    <TorrentIndexersTable
                      indexers={indexers}
                      torrentQueries={queries as UseQueryResult<unknown, Error>[]}
                      onVisibilityChange={setVisibleIndexers}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
          <TabsContent value="recommended">{renderTable(recommended)}</TabsContent>
          <TabsContent value="others">{renderTable(others)}</TabsContent>
        </Tabs>
      </div>

      <div className="hidden xl:block xl:col-span-2">
        <TorrentIndexersTable
          indexers={indexers}
          torrentQueries={queries as UseQueryResult<unknown, Error>[]}
          onVisibilityChange={setVisibleIndexers}
        />
      </div>
    </div>
  );
}
