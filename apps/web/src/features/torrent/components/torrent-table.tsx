import { useMemo, useState } from "react";

import { plural } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import type { DownloadTorrentInput, IndexerType, Resolution } from "@seedarr/contracts";
import type { Media, Torrent } from "@seedarr/sdk";
import { ApiError } from "@seedarr/sdk";
import { formatError } from "@seedarr/shared";
import { useNavigate } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { Flag } from "@/shared/components/flag";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { SelectLang } from "@/shared/components/select/select-lang";
import { QUALITY_LEVELS, SelectQuality } from "@/shared/components/select/select-quality";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";

import { useStartDownload } from "@/features/downloads/hooks/download.queries";
import { indexersManagerImages } from "@/features/indexers-manager/helpers/indexers-manager.helper";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
import { TorrentInspectModal } from "./torrent-inspect-modal";
import { TorrentUnavailableDialog } from "./torrent-unavailable-dialog";

interface TorrentWithMeta extends Torrent {
  indexerId?: string;
  indexerManagerType?: IndexerType;
}

interface TorrentTableProps {
  torrents: TorrentWithMeta[];
  media: Media;
  isLoading?: boolean;
}

export function TorrentTable({ torrents, media, isLoading = false }: TorrentTableProps) {
  const { t } = useLingui();
  const startDownload = useStartDownload();
  const navigate = useNavigate();
  const preferenceQuality = useUserPreferences((s) => s.quality);
  const preferenceMaxSize = useUserPreferences((s) => s.maxSize);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");

  const [selectedQuality, setSelectedQuality] = useState<Resolution | null>(preferenceQuality);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTorrent, setSelectedTorrent] = useState<Torrent | null>(null);
  const [selectedMagnetUri, setSelectedMagnetUri] = useState<string | null>(null);
  const [unavailableDialogOpen, setUnavailableDialogOpen] = useState(false);
  const [pendingDownloadInput, setPendingDownloadInput] = useState<DownloadTorrentInput | null>(null);
  const [unavailableAction, setUnavailableAction] = useState<"retry" | "local" | null>(null);

  const filteredTorrents = useMemo(() => {
    const maxSizeBytes = preferenceMaxSize !== null ? preferenceMaxSize * 1024 * 1024 * 1024 : null;

    return torrents.filter((torrent) => {
      if (selectedQuality !== null) {
        if (!torrent.mediaInfos?.resolution) return false;
        const minQualityIndex = QUALITY_LEVELS.indexOf(selectedQuality);
        const torrentQualityIndex = QUALITY_LEVELS.indexOf(torrent.mediaInfos.resolution);
        if (torrentQualityIndex === -1 || torrentQualityIndex < minQualityIndex) {
          return false;
        }
      }

      if (maxSizeBytes !== null && torrent.size > maxSizeBytes) {
        return false;
      }

      if (selectedLanguage !== "all") {
        if (torrent.mediaInfos?.languages?.[0] !== selectedLanguage) {
          return false;
        }
      }

      return true;
    });
  }, [torrents, selectedQuality, selectedLanguage, preferenceMaxSize]);

  const availableLanguages = useMemo(() => {
    const langs = new Set<string>();
    for (const torrent of torrents) {
      if (torrent.mediaInfos?.languages?.[0]) langs.add(torrent.mediaInfos.languages[0]);
    }
    return Array.from(langs).sort();
  }, [torrents]);

  const getTorrentUri = (torrent: Torrent): string => {
    if (torrent.downloadUrl) return torrent.downloadUrl;
    if (torrent.link?.startsWith("http://") || torrent.link?.startsWith("https://")) return torrent.link;
    if (torrent.magnetUrl?.includes("tr=")) return torrent.magnetUrl;
    if (torrent.guid?.startsWith("magnet:") && torrent.guid.includes("tr=")) return torrent.guid;
    if (torrent.magnetUrl) return torrent.magnetUrl;
    if (torrent.guid?.startsWith("magnet:")) return torrent.guid;
    return torrent.link ?? torrent.magnetUrl ?? torrent.guid ?? "";
  };

  const handleOpenInspectModal = (torrent: Torrent) => {
    const magnetUri = getTorrentUri(torrent);
    setSelectedTorrent(torrent);
    setSelectedMagnetUri(magnetUri);
    setModalOpen(true);
  };

  const executeDownload = async (input: DownloadTorrentInput, toastId?: string | number) => {
    const id = toastId ?? toast.loading(t`Starting download…`, { description: input.name });

    try {
      await startDownload.mutateAsync(input);
      toast.success(t`Download started`, { id, description: input.name });
      navigate({ to: "/downloads" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.dismiss(id);
        setPendingDownloadInput(input);
        setUnavailableDialogOpen(true);
        return;
      }
      const message = formatError(error) || t`Unknown error`;
      toast.error(t`Download failed`, { id, description: message });
    }
  };

  const handleAddDownload = async (torrent: Torrent) => {
    const magnetUri = getTorrentUri(torrent);
    await executeDownload({
      magnetUri,
      name: torrent.title,
      media,
      origin: torrent.tracker,
      quality: torrent.mediaInfos?.resolution,
      language: torrent.mediaInfos?.languages?.[0],
    });
  };

  const handleUnavailableRetry = async () => {
    if (!pendingDownloadInput) return;
    setUnavailableAction("retry");
    await executeDownload(pendingDownloadInput);
    setUnavailableAction(null);
    setUnavailableDialogOpen(false);
    setPendingDownloadInput(null);
  };

  const handleUnavailableLocal = async () => {
    if (!pendingDownloadInput) return;
    setUnavailableAction("local");
    await executeDownload({ ...pendingDownloadInput, preferLocal: true });
    setUnavailableAction(null);
    setUnavailableDialogOpen(false);
    setPendingDownloadInput(null);
  };

  const handleUnavailableCancel = () => {
    setUnavailableDialogOpen(false);
    setPendingDownloadInput(null);
    setUnavailableAction(null);
  };
  const showLoader = isLoading && filteredTorrents.length === 0;
  const showEmpty = !isLoading && filteredTorrents.length === 0;

  return (
    <div className="w-full overflow-hidden">
      <div className="flex flex-row gap-4 items-center py-4">
        {availableLanguages.length > 0 && (
          <SelectLang value={selectedLanguage} onValueChange={setSelectedLanguage} languages={availableLanguages} />
        )}
        <SelectQuality value={selectedQuality} onValueChange={setSelectedQuality} />
        {preferenceMaxSize !== null && (
          <Badge variant="outline">
            <Trans>Max {preferenceMaxSize} GB</Trans>
          </Badge>
        )}
      </div>

      <Table classNameContainer="rounded-tl-none">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-full">
              <Badge variant="secondary" className="mr-2">
                {filteredTorrents.length}
              </Badge>
              <Trans>{plural(filteredTorrents.length, { one: "Torrent", other: "Torrents" })}</Trans>
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

                    <div className="flex flex-wrap items-center gap-2">
                      <Flag lang={torrent.mediaInfos?.languages?.[0] || media.original_language || ""} />
                      {torrent.mediaInfos?.resolution && (
                        <Badge variant="secondary">{torrent.mediaInfos.resolution}</Badge>
                      )}
                      <Badge variant="outline">{torrent.tracker}</Badge>
                      {torrent.indexerManagerType && (
                        <img
                          src={indexersManagerImages[torrent.indexerManagerType]}
                          alt={torrent.indexerManagerType}
                          className="size-4"
                        />
                      )}

                      <span className="text-xs font-medium text-muted-foreground sm:hidden ml-auto">
                        {(torrent.size / 1e9).toFixed(2)} GB
                      </span>
                      <div className="flex items-center gap-2 sm:hidden">
                        <span className="text-xs font-bold text-green-500">{torrent.seeders} S</span>
                        {torrent.indexerManagerType !== "stremio" && (
                          <span className="text-xs font-bold text-destructive">{torrent.peers} P</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1 sm:hidden">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="h-8 py-1 text-xs flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenInspectModal(torrent);
                        }}
                      >
                        <InfoIcon className="size-3 mr-1" />
                        <Trans>Details</Trans>
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 py-1 text-xs flex-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddDownload(torrent);
                        }}
                      >
                        <DownloadIcon className="size-3 mr-1" />
                        <Trans>Download</Trans>
                      </Button>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <span className="font-medium text-muted-foreground">{(torrent.size / 1e9).toFixed(2)} GB</span>
                </TableCell>

                <TableCell className="hidden sm:table-cell relative">
                  <div className="flex items-center justify-end gap-3 pr-4 group-hover:opacity-0 transition-opacity">
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

                  <div className="absolute inset-y-0 right-2 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

      <TorrentUnavailableDialog
        open={unavailableDialogOpen}
        onRetry={handleUnavailableRetry}
        onCancel={handleUnavailableCancel}
        onStoreLocally={handleUnavailableLocal}
        isRetrying={unavailableAction === "retry"}
        isStoringLocally={unavailableAction === "local"}
      />
    </div>
  );
}
