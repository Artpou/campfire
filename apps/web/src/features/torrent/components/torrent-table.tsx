import { useMemo, useState } from "react";

import type { Media, Torrent, TorrentQuality } from "@basement/api/types";
import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Download, EarthIcon, Info } from "lucide-react";

import { getFlagUrl } from "@/shared/helpers/lang.helper";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Slider } from "@/shared/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { useStartDownload } from "@/features/torrent/hooks/use-torrent-download";
import { TorrentInspectModal } from "./torrent-inspect-modal";

interface TorrentTableProps {
  torrents: Torrent[];
  media: Media;
}

export function TorrentTable({ torrents, media }: TorrentTableProps) {
  const startDownload = useStartDownload();
  const navigate = useNavigate();

  // Filter states
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedQualityIndex, setSelectedQualityIndex] = useState<number>(0);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [selectedMagnetUri, setSelectedMagnetUri] = useState<string | null>(null);

  // Quality hierarchy (index-based for slider)
  const qualityLevels: (TorrentQuality | "all")[] = [
    "all",
    "480p",
    "720p",
    "1080p",
    "1440p",
    "2160p",
    "4K",
  ];

  // Get unique languages from torrents
  const availableLanguages = useMemo(() => {
    const langs: string[] = [];
    torrents.forEach((t) => {
      if (t.language && t.language !== "multi" && !langs.includes(t.language)) {
        langs.push(t.language);
      }
    });

    return [...langs, "original"];
  }, [torrents]);

  // Filter torrents based on selections
  const filteredTorrents = useMemo(() => {
    return torrents.filter((torrent) => {
      // Language filter
      if (
        selectedLanguage !== "all" &&
        (selectedLanguage === "original"
          ? torrent.language !== ""
          : torrent.language !== selectedLanguage)
      ) {
        return false;
      }

      // Quality filter
      if (selectedQualityIndex > 0) {
        // If torrent quality is empty or doesn't meet minimum, filter out
        if (!torrent.quality) return false;
        const torrentQualityIndex = qualityLevels.indexOf(torrent.quality);
        if (torrentQualityIndex === -1 || torrentQualityIndex < selectedQualityIndex) {
          return false;
        }
      }

      return true;
    });
  }, [torrents, selectedLanguage, selectedQualityIndex]);

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

    await startDownload.mutateAsync({
      magnetUri,
      name: torrent.title,
      mediaId: media.id,
      origin: torrent.tracker,
      quality: torrent.quality,
      language: torrent.language,
    });

    // Redirect to downloads page
    navigate({ to: "/downloads" });
  };
  return (
    <div className="w-full overflow-hidden space-y-2">
      {/* Filters */}
      <div className="flex flex-row gap-4 items-center">
        {/* Language Filter */}
        <Select value={selectedLanguage} onValueChange={(value) => setSelectedLanguage(value)}>
          <SelectTrigger className="min-w-28" id="language-filter">
            <SelectValue placeholder="All languages" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <Trans>All</Trans>
            </SelectItem>
            <SelectItem value="multi">
              <EarthIcon /> <Trans>Multi</Trans>
            </SelectItem>
            {availableLanguages.map((lang) => (
              <SelectItem key={lang} value={lang}>
                <img
                  src={getFlagUrl(lang === "original" ? media.original_language || "" : lang)}
                  alt={lang}
                  className="size-4"
                />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quality Filter */}
        <div className="w-full max-w-md mb-1">
          <Label htmlFor="quality-filter">
            <Trans>Minimum Quality</Trans>:{" "}
            <Badge variant="secondary">
              {qualityLevels[selectedQualityIndex] === "all" ? (
                <Trans>All</Trans>
              ) : (
                qualityLevels[selectedQualityIndex]
              )}
            </Badge>
          </Label>
          <Slider
            id="quality-filter"
            min={0}
            max={qualityLevels.length - 1}
            step={1}
            value={[selectedQualityIndex]}
            onValueChange={(value) => setSelectedQualityIndex(value[0])}
            className="mt-2"
          />
        </div>
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
          {filteredTorrents.length > 0 ? (
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
                        <img
                          src={getFlagUrl(torrent.language || media.original_language || "")}
                          alt={torrent.language}
                          className="size-4"
                        />
                      )}
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
                  <div className="absolute inset-y-0 right-2 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInspectModal(torrent);
                      }}
                    >
                      <Info className="size-4" />
                      <Trans>Details</Trans>
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddDownload(torrent);
                      }}
                    >
                      <Download className="size-4" />
                      <Trans>Download</Trans>
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

      <TorrentInspectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        torrent={selectedTorrent}
        magnetUri={selectedMagnetUri}
      />
    </div>
  );
}
