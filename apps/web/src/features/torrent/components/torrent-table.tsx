import { useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { IndexerType, Media, Torrent, TorrentLanguage } from "@seedarr/sdk";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, EarthIcon, InfoIcon, VideoIcon } from "lucide-react";
import { toast } from "sonner";

import { Flag } from "@/shared/components/flag";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { indexersManagerImages } from "@/features/indexers-manager/helpers/indexers-manager.helper";
import { getQualityIndex, QUALITY_LEVELS } from "@/features/settings/constants/torrent-preferences";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
import { useStartDownload } from "@/features/torrent/hooks/download.queries";
import { TorrentInspectModal } from "./torrent-inspect-modal";

interface TorrentWithMeta extends Torrent {
  indexerId?: string;
  indexerManagerType?: IndexerType;
}

interface TorrentTableProps {
  torrents: TorrentWithMeta[];
  media: Media;
  isLoading?: boolean;
}

function LanguageOption({ lang }: { lang: string }) {
  if (lang === "all") return <Trans>All languages</Trans>;
  if (lang === "multi") {
    return (
      <span className="flex items-center gap-2">
        <EarthIcon className="size-4" />
        MULTI
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <Flag lang={lang} />
      {lang.toUpperCase()}
    </span>
  );
}

export function TorrentTable({ torrents, media, isLoading = false }: TorrentTableProps) {
  const { t } = useLingui();
  const startDownload = useStartDownload();
  const navigate = useNavigate();
  const preferenceQuality = useUserPreferences((s) => s.quality);
  const preferenceMaxSize = useUserPreferences((s) => s.maxSize);
  const [selectedLanguage, setSelectedLanguage] = useState<TorrentLanguage | "all">("all");

  const [selectedQualityIndex, setSelectedQualityIndex] = useState<number>(() => getQualityIndex(preferenceQuality));

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [selectedMagnetUri, setSelectedMagnetUri] = useState<string | null>(null);

  const filteredTorrents = useMemo(() => {
    const maxSizeBytes = preferenceMaxSize !== null ? preferenceMaxSize * 1024 * 1024 * 1024 : null;

    return torrents.filter((torrent) => {
      if (selectedQualityIndex > 0) {
        if (!torrent.quality) return false;
        const torrentQualityIndex = QUALITY_LEVELS.indexOf(torrent.quality);
        if (torrentQualityIndex === -1 || torrentQualityIndex < selectedQualityIndex) {
          return false;
        }
      }

      if (maxSizeBytes !== null && torrent.size > maxSizeBytes) {
        return false;
      }

      if (selectedLanguage !== "all") {
        if (torrent.language !== selectedLanguage) {
          return false;
        }
      }

      return true;
    });
  }, [torrents, selectedQualityIndex, selectedLanguage, preferenceMaxSize]);

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const torrent of torrents) {
      if (torrent.language) langs.add(torrent.language);
    }
    return Array.from(langs).sort();
  }, [torrents]);

  /**
   * Extract the best download URI from a torrent object
   * Priority: guid (if magnet) > downloadUrl > magnetUrl > link
   */
  const getTorrentUri = (torrent: Torrent): string => {
    if (torrent.guid?.startsWith("magnet:")) return torrent.guid;
    if (torrent.downloadUrl) return torrent.downloadUrl;
    if (torrent.magnetUrl) return torrent.magnetUrl;
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
        media,
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
  const showLoader = isLoading && filteredTorrents.length === 0;
  const showEmpty = !isLoading && filteredTorrents.length === 0;

  return (
    <div className="w-full overflow-hidden">
      {/* Filters */}
      <div className="flex flex-row gap-4 items-center">
        <Badge variant="outline" className="flex gap-2 w-full md:w-auto py-2 bg-card border-b-0 rounded-b-none">
          {availableLanguages.length > 0 && (
            <Select value={selectedLanguage} onValueChange={(v) => setSelectedLanguage(v as TorrentLanguage | "all")}>
              <SelectTrigger className="h-7 w-36 border-0 bg-transparent shadow-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={"all"}>
                  <LanguageOption lang={"all"} />
                </SelectItem>
                {availableLanguages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    <LanguageOption lang={lang} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={selectedQualityIndex.toString()} onValueChange={(v) => setSelectedQualityIndex(Number(v))}>
            <SelectTrigger className="h-7 w-36 border-0 bg-transparent shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_LEVELS.map((quality, index) => (
                <SelectItem key={quality} value={index.toString()}>
                  {quality === "all" ? <Trans>All qualities</Trans> : quality}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {preferenceMaxSize !== null && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              <Trans>Max {preferenceMaxSize} GB</Trans>
            </span>
          )}
        </Badge>
      </div>

      <Table classNameContainer="rounded-tl-none">
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-full">
              <Badge className="mr-2">{filteredTorrents.length}</Badge>
              <Trans>Torrent</Trans>
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
          {showLoader && (
            <TableRow>
              <TableCell colSpan={3} className="py-10 text-center">
                <SeedarrLoader />
              </TableCell>
            </TableRow>
          )}
          {showEmpty && (
            <TableRow>
              <TableCell colSpan={3} className="py-10 text-center">
                <div className="p-10 border border-dashed rounded-sm bg-muted border-border">
                  <p className="font-bold uppercase text-popover-foreground">
                    <Trans>No torrents found</Trans>
                  </p>
                  <p className="mt-1 text-xs uppercase text-popover-foreground/50">
                    <Trans>Try adjusting your search query</Trans>
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
          {filteredTorrents.length > 0 &&
            filteredTorrents.map((torrent) => (
              <TableRow key={torrent.guid || torrent.link} className="relative group">
                <TableCell className="w-full max-w-0">
                  <div className="flex flex-col gap-2">
                    <a
                      href={torrent.detailsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full font-medium truncate text-popover-foreground"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {torrent.title}
                    </a>
                    <div className="flex items-center gap-2">
                      {torrent.language === "multi" ? (
                        <Badge className="flex items-center gap-2" variant="secondary">
                          <EarthIcon />
                          MULTI
                        </Badge>
                      ) : (
                        <Flag lang={torrent.language || media.original_language || ""} />
                      )}
                      {torrent.quality && <Badge variant="secondary">{torrent.quality}</Badge>}
                      {torrent.title.toLowerCase().includes("mkv") && (
                        <Badge variant="secondary">
                          <VideoIcon />
                          Streamable
                        </Badge>
                      )}
                      <Badge variant="outline">{torrent.tracker}</Badge>
                      {torrent.indexerManagerType && (
                        <img
                          src={indexersManagerImages[torrent.indexerManagerType]}
                          alt={torrent.indexerManagerType}
                          className="size-4"
                        />
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
                    {torrent.indexerManagerType !== "stremio" && (
                      <div className="flex items-center gap-1 font-bold text-destructive">
                        <ArrowDownIcon className="size-3" />
                        <span className="text-xs">{torrent.peers}</span>
                      </div>
                    )}
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
