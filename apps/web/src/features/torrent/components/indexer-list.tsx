import type { TorrentIndexer } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";

import { Badge } from "@/shared/ui/badge";
import { Spinner } from "@/shared/ui/spinner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

interface IndexerListProps {
  indexers: TorrentIndexer[] | null | undefined;
  isLoading?: boolean;
  isError?: boolean;
}

export function IndexerList({ indexers, isLoading = false, isError = false }: IndexerListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Spinner />
        <Trans>Loading indexers...</Trans>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-6 text-sm text-destructive">
        <Trans>Failed to load indexers. Check the indexer configuration.</Trans>
      </div>
    );
  }

  if (!indexers || indexers.length === 0) {
    return (
      <div className="py-6 text-sm text-muted-foreground">
        <Trans>No indexers available.</Trans>
      </div>
    );
  }

  console.log({ indexers });

  return (
    <div className="w-full overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-full">
              <Trans>Name</Trans>
            </TableHead>
            <TableHead className="text-right whitespace-nowrap">
              <Trans>Privacy</Trans>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {indexers.map((indexer) => (
            <TableRow key={indexer.id}>
              <TableCell className="font-medium text-sm">{indexer.name}</TableCell>
              <TableCell className="text-right">
                <Badge variant={indexer.privacy === "private" ? "secondary" : "outline"}>
                  {indexer.privacy}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
