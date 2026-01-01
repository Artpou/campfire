import { Trans } from "@lingui/react/macro";
import { ArrowDown, ArrowUp, Download, Plus } from "lucide-react";

import { getFlagUrl } from "@/shared/helpers/lang.helper";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import type { Media } from "@/features/media/media";
import type { Torrent } from "@/features/torrent/torrent";

interface TorrentTableProps {
  torrents: Torrent[];
  media: Media;
}

export function TorrentTable({ torrents, media }: TorrentTableProps) {
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
          {torrents.length > 0 ? (
            torrents.map((torrent) => (
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
                      <img
                        src={getFlagUrl(torrent.language || media.original_language || "")}
                        alt={torrent.language}
                        className="size-4"
                      />
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
}
