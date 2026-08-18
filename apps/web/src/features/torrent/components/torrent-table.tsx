import { useCallback, useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { DownloadTorrentInput, Resolution } from "@seedarr/contracts";
import type { Media, Torrent } from "@seedarr/sdk";
import { ApiError } from "@seedarr/sdk";
import { formatError, getVideoContainer } from "@seedarr/shared";
import { Link, useNavigate } from "@tanstack/react-router";
import { type SortingState, useTable } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon, DownloadIcon, InfoIcon } from "lucide-react";
import { toast } from "sonner";

import { Flag } from "@/shared/components/flag";
import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { SelectLang } from "@/shared/components/select/select-lang";
import { QUALITY_LEVELS, SelectQuality } from "@/shared/components/select/select-quality";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { DataTable } from "@/shared/ui/data-table";

import { useStartDownload } from "@/features/downloads/hooks/download.queries";
import { indexersManagerImages } from "@/features/indexers-manager/helpers/indexers-manager.helper";
import { useUserPreferences } from "@/features/settings/stores/user-preference-store";
import {
  type TorrentWithMeta,
  torrentTableFeatures,
  useTorrentColumns,
} from "@/features/torrent/hooks/use-torrent-columns";
import { TorrentInspectModal } from "./torrent-inspect-modal";
import { TorrentUnavailableDialog } from "./torrent-unavailable-dialog";

interface TorrentTableProps {
  torrents: TorrentWithMeta[];
  media: Media;
  isLoading?: boolean;
  hasIndexers?: boolean;
}

function TorrentEmptyState({ hasIndexers }: { hasIndexers: boolean }) {
  if (!hasIndexers) {
    return (
      <div className="p-10 border border-dashed rounded-sm bg-muted border-border inline-block space-y-3">
        <p className="font-bold uppercase text-popover-foreground">
          <Trans>No indexers configured</Trans>
        </p>
        <p className="text-sm text-muted-foreground max-w-md">
          <Trans>Install and enable an indexer module to search torrents.</Trans>
        </p>
        <Button variant="secondary" size="sm" asChild>
          <Link to="/settings/modules" search={{ tab: "indexer" }}>
            <Trans>Configure indexers</Trans>
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-10 border border-dashed rounded-sm bg-muted border-border inline-block">
      <p className="font-bold uppercase text-popover-foreground">
        <Trans>No torrents found</Trans>
      </p>
      <p className="mt-1 text-xs uppercase text-popover-foreground/50">
        <Trans>Try adjusting your search query</Trans>
      </p>
    </div>
  );
}

function getTorrentUri(torrent: Torrent): string {
  if (torrent.downloadUrl) return torrent.downloadUrl;
  if (torrent.link?.startsWith("http://") || torrent.link?.startsWith("https://")) return torrent.link;
  if (torrent.magnetUrl?.includes("tr=")) return torrent.magnetUrl;
  if (torrent.guid?.startsWith("magnet:") && torrent.guid.includes("tr=")) return torrent.guid;
  if (torrent.magnetUrl) return torrent.magnetUrl;
  if (torrent.guid?.startsWith("magnet:")) return torrent.guid;
  return torrent.link ?? torrent.magnetUrl ?? torrent.guid ?? "";
}

function TorrentMobileCard({
  torrent,
  media,
  onInspect,
  onDownload,
}: {
  torrent: TorrentWithMeta;
  media: Media;
  onInspect: (torrent: TorrentWithMeta) => void;
  onDownload: (torrent: TorrentWithMeta) => void;
}) {
  const container = getVideoContainer(torrent.title);

  return (
    <Card className="gap-3 p-3 py-3">
      <a
        href={torrent.detailsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full font-medium text-popover-foreground break-words"
      >
        {torrent.title}
      </a>

      <div className="flex flex-wrap items-center gap-2">
        <Flag lang={torrent.mediaInfos?.languages?.[0] || media.original_language || ""} />
        {torrent.mediaInfos?.resolution && <Badge variant="secondary">{torrent.mediaInfos.resolution}</Badge>}
        {container && <Badge variant="secondary">{container}</Badge>}
        <Badge variant="outline">{torrent.tracker}</Badge>
        {torrent.indexerManagerType && (
          <img
            src={indexersManagerImages[torrent.indexerManagerType]}
            alt={torrent.indexerManagerType}
            className="size-4"
          />
        )}
        <span className="text-xs text-muted-foreground">{(torrent.size / 1e9).toFixed(2)} GB</span>
        <div className="flex items-center gap-2 ml-auto">
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
      </div>

      <div className="flex w-full gap-2">
        <Button variant="secondary" size="sm" className="flex-1" icon={InfoIcon} onClick={() => onInspect(torrent)}>
          <Trans>Info</Trans>
        </Button>
        <Button size="sm" className="flex-1" icon={DownloadIcon} onClick={() => onDownload(torrent)}>
          <Trans>Download</Trans>
        </Button>
      </div>
    </Card>
  );
}

export function TorrentTable({ torrents, media, isLoading = false, hasIndexers = true }: TorrentTableProps) {
  const { t } = useLingui();
  const isMobile = useIsMobile();
  const startDownload = useStartDownload();
  const navigate = useNavigate();
  const preferenceQuality = useUserPreferences((s) => s.quality);
  const preferenceMaxSize = useUserPreferences((s) => s.maxSize);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedQuality, setSelectedQuality] = useState<Resolution | null>(preferenceQuality);
  const [sorting, setSorting] = useState<SortingState>([]);

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

  const handleOpenInspectModal = useCallback((torrent: TorrentWithMeta) => {
    setSelectedTorrent(torrent);
    setSelectedMagnetUri(getTorrentUri(torrent));
    setModalOpen(true);
  }, []);

  const executeDownload = useCallback(
    async (input: DownloadTorrentInput, toastId?: string | number) => {
      const id = toastId ?? toast.loading(t`Starting download…`, { description: input.name });

      try {
        await startDownload.mutateAsync(input);
        toast.info(t`Download started`, { id, description: input.name });
        navigate({
          to: media.type === "tv" ? "/tv/$id" : "/movies/$id",
          params: { id: String(media.id) },
        });
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
    },
    [startDownload, navigate, t, media.id, media.type],
  );

  const handleAddDownload = useCallback(
    async (torrent: TorrentWithMeta) => {
      await executeDownload({
        magnetUri: getTorrentUri(torrent),
        name: torrent.title,
        media,
        origin: torrent.tracker,
        quality: torrent.mediaInfos?.resolution,
        language: torrent.mediaInfos?.languages?.[0],
        container: getVideoContainer(torrent.title) ?? undefined,
        moduleIndexerId: torrent.moduleId,
      });
    },
    [executeDownload, media],
  );

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

  const columns = useTorrentColumns({
    media,
    count: filteredTorrents.length,
    onInspect: handleOpenInspectModal,
    onDownload: handleAddDownload,
  });

  const table = useTable({
    features: torrentTableFeatures,
    data: filteredTorrents,
    columns,
    getRowId: (row) => row.guid || row.link || row.title,
    onSortingChange: setSorting,
    state: { sorting },
  });

  const showLoader = isLoading && filteredTorrents.length === 0;

  return (
    <div className="w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center py-4">
        {availableLanguages.length > 0 && (
          <SelectLang
            value={selectedLanguage}
            onValueChange={setSelectedLanguage}
            languages={availableLanguages}
            triggerClassName="w-full sm:w-auto"
          />
        )}
        <SelectQuality value={selectedQuality} onValueChange={setSelectedQuality} triggerClassName="w-full sm:w-auto" />
        {preferenceMaxSize !== null && (
          <Badge variant="outline">
            <Trans>Max {preferenceMaxSize} GB</Trans>
          </Badge>
        )}
      </div>

      {isMobile ? (
        showLoader ? (
          <SeedarrLoader />
        ) : filteredTorrents.length === 0 ? (
          <TorrentEmptyState hasIndexers={hasIndexers} />
        ) : (
          <div className="flex flex-col gap-3">
            {filteredTorrents.map((torrent) => (
              <TorrentMobileCard
                key={torrent.guid || torrent.link || torrent.title}
                torrent={torrent}
                media={media}
                onInspect={handleOpenInspectModal}
                onDownload={handleAddDownload}
              />
            ))}
          </div>
        )
      ) : (
        <DataTable
          table={table}
          classNameContainer="rounded-tl-none"
          empty={showLoader ? <SeedarrLoader /> : <TorrentEmptyState hasIndexers={hasIndexers} />}
        />
      )}

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
