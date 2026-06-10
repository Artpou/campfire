import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { Media, Torrent, TorrentQuality } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, EarthIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Flag } from "@/shared/components/flag";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Badge, badgeVariants } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { useStartDownload } from "@/features/torrent/hooks/use-torrent-download";
import { TorrentInspectModal } from "./torrent-inspect-modal";

interface TorrentTableProps {
  torrents: Torrent[];
  media: Media;
  isLoading?: boolean;
}

export function TorrentTable({ torrents, media, isLoading = false }: TorrentTableProps) {
  const { t } = useLingui();
  const startDownload = useStartDownload();
  const navigate = useNavigate();

  // Filter states
  const [selectedQualityIndex, setSelectedQualityIndex] = useState<number>(0);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [selectedMagnetUri, setSelectedMagnetUri] = useState<string | null>(null);

  // Quality hierarchy (index-based for slider)
  const qualityLevels: (TorrentQuality | "all")[] = ["all", "480p", "720p", "1080p", "1440p", "2160p", "4K"];

  // Filter torrents based on selections
  const filteredTorrents = useMemo(() => {
    return torrents.filter((torrent) => {
      // Quality filter (minimum-quality semantics)
      if (selectedQualityIndex > 0) {
        if (!torrent.quality) return false;
        const torrentQualityIndex = qualityLevels.indexOf(torrent.quality);
        if (torrentQualityIndex === -1 || torrentQualityIndex < selectedQualityIndex) {
          return false;
        }
      }

      return true;
    });
  }, [torrents, selectedQualityIndex]);

  /**
   * Extract the best download URI from a torrent object
   * Priority: guid (if magnet) > downloadUrl > magnetUrl > link
   */
  const getTorrentUri = (torrent: Torrent): string => {
    // Priority 1: guid if it's a magnet URI (The Pirate Bay, etc.)
    if (torrent.guid?.startsWith("magnet:")) {
      return torrent.guid;
    }

    // Priority 2: downloadUrl (OxTorrent, etc.)
    if (torrent.downloadUrl) {
      return torrent.downloadUrl;
    }

    // Priority 3: magnetUrl (Prowlarr redirect)
    if (torrent.magnetUrl) {
      return torrent.magnetUrl;
    }

    // Fallback: link
    return torrent.link;
  };

  const handleOpenInspectModal = (torrent: Torrent) => {
    const magnetUri = getTorrentUri(torrent);
    setSelectedTorrent(torrent);
    setSelectedMagnetUri(magnetUri);
    setModalOpen(true);
  };

  const handleAddDownload = async (torrent: Torrent) => {
    const magnetUri = getTorrentUri(torrent);

    try {
      await startDownload.mutateAsync({
        magnetUri,
        name: torrent.title,
        mediaId: media.id,
        origin: torrent.tracker,
        quality: torrent.quality,
        language: torrent.language,
      });
      navigate({ to: "/downloads" });
    } catch (error) {
      const message = error instanceof Error ? error.message : t`Unknown error`;
      toast.error(t`Download failed`, {
        description: message,
      });
    }
  };
  return (
    <div className="w-full overflow-hidden space-y-2">
      {/* Filters */}
      <div className="flex flex-row gap-4 items-center">
        <Badge variant="outline" className="flex gap-2 w-full md:w-auto py-2">
          <Trans>Minimum Quality</Trans> :
          <div className="hidden md:flex flex-wrap gap-1.5">
            {qualityLevels.map((quality, index) => (
              <button
                key={quality}
                type="button"
                onClick={() => setSelectedQualityIndex(index)}
                className={cn(
                  badgeVariants({
                    variant: selectedQualityIndex === index ? "default" : "outline",
                  }),
                  "cursor-pointer rounded-full px-3 py-1 text-xs transition-colors",
                )}
              >
                {quality === "all" ? <Trans>All</Trans> : quality}
              </button>
            ))}
          </div>
          <Select value={selectedQualityIndex.toString()} onValueChange={(v) => setSelectedQualityIndex(Number(v))}>
            <SelectTrigger className="md:hidden w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {qualityLevels.map((quality, index) => (
                <SelectItem key={quality} value={index.toString()}>
                  {quality === "all" ? <Trans>All qualities</Trans> : quality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Badge>
      </div>

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
          {isLoading && (
            <TableRow>
              <TableCell colSpan={3} className="py-10 text-center">
                <SeedarrLoader />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && filteredTorrents.length === 0 && (
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
          {!isLoading &&
            filteredTorrents.length > 0 &&
            filteredTorrents.map((torrent) => (
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
                      {torrent.language === "multi" ? (
                        <Badge className="flex items-center gap-2" variant="secondary">
                          <EarthIcon />
                          MULTI
                        </Badge>
                      ) : (
                        <Flag lang={torrent.language || media.original_language || ""} />
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className="font-medium text-muted-foreground">{(torrent.size / 1e9).toFixed(2)} GB</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell relative">
                  <div className="flex items-center justify-end gap-3 pr-4">
                    <div className="flex items-center gap-1 font-bold text-green-500">
                      <ArrowUpIcon className="size-3" />
                      <span className="text-xs">{torrent.seeders}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-destructive">
                      <ArrowDownIcon className="size-3" />
                      <span className="text-xs">{torrent.peers}</span>
                    </div>
                  </div>
                  <div className="absolute inset-y-0 right-2 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInspectModal(torrent);
                      }}
                    >
                      <InfoIcon className="size-4" />
                      <Trans>Details</Trans>
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddDownload(torrent);
                      }}
                    >
                      <DownloadIcon className="size-4" />
                      <Trans>Download</Trans>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      <TorrentInspectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        torrent={selectedTorrent}
        magnetUri={selectedMagnetUri}
      />
    </div>
  );
}
