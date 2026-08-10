import { useCallback, useMemo, useState } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import type { DownloadTorrentInput, Resolution } from "@seedarr/contracts";
import type { Media, Torrent } from "@seedarr/sdk";
import { ApiError } from "@seedarr/sdk";
import { formatError, getVideoContainer } from "@seedarr/shared";
import { useNavigate } from "@tanstack/react-router";
import { type SortingState, useTable } from "@tanstack/react-table";
import { toast } from "sonner";

import { SeedarrLoader } from "@/shared/components/seedarr-loader";
import { SelectLang } from "@/shared/components/select/select-lang";
import { QUALITY_LEVELS, SelectQuality } from "@/shared/components/select/select-quality";
import { Badge } from "@/shared/ui/badge";
import { DataTable } from "@/shared/ui/data-table";

import { useStartDownload } from "@/features/downloads/hooks/download.queries";
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

export function TorrentTable({ torrents, media, isLoading = false }: TorrentTableProps) {
  const { t } = useLingui();
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
    },
    [startDownload, navigate, t],
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

      <DataTable
        table={table}
        classNameContainer="rounded-tl-none"
        empty={
          showLoader ? (
            <SeedarrLoader />
          ) : (
            <div className="p-10 border border-dashed rounded-sm bg-muted border-border inline-block">
              <p className="font-bold uppercase text-popover-foreground">
                <Trans>No torrents found</Trans>
              </p>
              <p className="mt-1 text-xs uppercase text-popover-foreground/50">
                <Trans>Try adjusting your search query</Trans>
              </p>
            </div>
          )
        }
      />

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
