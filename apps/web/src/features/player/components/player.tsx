import { useEffect, useMemo, useRef, useState } from "react";

import { Trans } from "@lingui/react/macro";

import { cn } from "@/lib/utils";
import { Spinner } from "@/shared/ui/spinner";

import { resolveSubtitleTracksToBlobs, type SubtitleTrack } from "@/features/downloads/helpers/subtitle-tracks.helper";
import {
  ensureCcMenuAvailable,
  ensureMoviPlayerRegistered,
  errorDetail,
  type MoviPlayerHandle,
} from "@/features/player/helpers/movi-player.helper";

interface PlayerProps {
  src: string;
  tracks?: SubtitleTrack[];
  /** Initial playback position in seconds (movi-player `startat` — skips poster seek(0)). */
  startAt?: number;
  onPlayer: (player: MoviPlayerHandle | null) => void;
  onLoadedMetadata?: () => void;
  onError?: (error?: unknown) => void;
  onAddSubtitles?: () => void;
  enableSubtitleDelay?: boolean;
  className?: string;
}

/**
 * Mounts `<movi-player>` via the DOM (not JSX).
 *
 * Creation is deferred by a macrotask so React Strict Mode's mount→cleanup→mount
 * cycle does not construct then destroy the WASM player mid-load (Asyncify corruption).
 *
 * External subs are prefetched (cookies) into blob: URLs, then wired via `source()`.
 * `movi-player` is dynamically imported so it never ships in the initial bundle.
 */
export function Player({
  src,
  tracks = [],
  startAt = 0,
  onPlayer,
  onLoadedMetadata,
  onError,
  onAddSubtitles,
  enableSubtitleDelay = false,
  className,
}: PlayerProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onPlayerRef = useRef(onPlayer);
  const onLoadedRef = useRef(onLoadedMetadata);
  const onErrorRef = useRef(onError);
  const onAddSubtitlesRef = useRef(onAddSubtitles);
  onPlayerRef.current = onPlayer;
  onLoadedRef.current = onLoadedMetadata;
  onErrorRef.current = onError;
  onAddSubtitlesRef.current = onAddSubtitles;

  const [isEngineLoading, setIsEngineLoading] = useState(true);
  const [_remountKey, setRemountKey] = useState(0);
  const hasRetriedRef = useRef(false);

  const tracksKey = useMemo(
    () => JSON.stringify(tracks.map((t) => [t.src, t.label, t.srclang, t.default, t.format])),
    [tracks],
  );
  const resumeAt = Number.isFinite(startAt) && startAt >= 1 ? Math.floor(startAt) : 0;

  useEffect(() => {
    hasRetriedRef.current = false;
    setRemountKey(0);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let player: MoviPlayerHandle | null = null;
    let blobUrls: string[] = [];

    const handleLoaded = (): void => {
      if (!cancelled) onLoadedRef.current?.();
    };
    const handleError = (event: Event): void => {
      if (cancelled) return;
      const detail = errorDetail(event);
      console.error("[movi-player] error", detail);

      // Transient decode/open failures (e.g. stream not ready yet) — remount once.
      if (!hasRetriedRef.current) {
        hasRetriedRef.current = true;
        setRemountKey((k) => k + 1);
        return;
      }

      onErrorRef.current?.(detail);
    };

    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled || !hostRef.current) return;

        setIsEngineLoading(true);
        try {
          await ensureMoviPlayerRegistered();
        } catch (err) {
          if (!cancelled) {
            setIsEngineLoading(false);
            console.error("[movi-player] failed to load engine", err);
            onErrorRef.current?.(err);
          }
          return;
        }
        if (cancelled || !hostRef.current) return;
        setIsEngineLoading(false);

        const inputTracks: SubtitleTrack[] = JSON.parse(tracksKey).map(
          ([trackSrc, label, srclang, isDefault, format]: [string, string, string, boolean, string]) => ({
            kind: "subtitles" as const,
            src: trackSrc,
            label,
            srclang,
            default: isDefault,
            format: format as SubtitleTrack["format"],
          }),
        );

        const resolved = await resolveSubtitleTracksToBlobs(inputTracks);
        blobUrls = resolved.blobUrls;
        if (cancelled || !hostRef.current) {
          for (const url of blobUrls) URL.revokeObjectURL(url);
          return;
        }

        player = document.createElement("movi-player") as MoviPlayerHandle;
        player.setAttribute("controls", "");
        player.setAttribute("theme", "dark");
        player.setAttribute("sw", "auto");
        // Must be set before source() — otherwise init does seek(0) for the poster frame
        // and overwrites a later currentTime resume seek.
        if (resumeAt > 0) player.setAttribute("startat", String(resumeAt));

        const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        if (primary) player.setAttribute("themecolor", primary);

        player.style.width = "100%";
        player.style.aspectRatio = "16 / 9";

        player.addEventListener("loadedmetadata", handleLoaded);
        player.addEventListener("loadeddata", handleLoaded);
        player.addEventListener("error", handleError);

        // Expose the element before source() so resume handlers can use playerRef.
        onPlayerRef.current(player);

        // Connect first, then source() — so initializePlayer runs while connected
        // with subtitle tracks already registered.
        host.replaceChildren(player);

        const subtitles = resolved.tracks.map((t) => ({
          src: t.src,
          lang: t.srclang,
          label: t.label,
          format: "vtt" as const,
        }));

        if (typeof player.source === "function") {
          player.source({ video: { src }, subtitles });
        } else {
          for (const track of resolved.tracks) {
            const el = document.createElement("track");
            el.kind = "subtitles";
            el.label = track.label;
            el.srclang = track.srclang;
            el.src = track.src;
            el.default = track.default;
            el.dataset.format = "vtt";
            player.appendChild(el);
          }
          player.src = src;
        }

        const loopBtn = player.shadowRoot?.querySelector<HTMLElement>(".movi-loop-btn");
        if (loopBtn) loopBtn.style.display = "none";
        const loopMenu = player.shadowRoot?.querySelector<HTMLElement>(
          '.movi-context-menu-item[data-action="loop-toggle"]',
        );
        if (loopMenu) loopMenu.style.display = "none";

        if (onAddSubtitlesRef.current || enableSubtitleDelay) {
          ensureCcMenuAvailable(player, {
            onAddSubtitles: onAddSubtitlesRef.current ? () => onAddSubtitlesRef.current?.() : undefined,
            enableDelay: enableSubtitleDelay,
          });
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      for (const url of blobUrls) URL.revokeObjectURL(url);
      if (player) {
        player.removeEventListener("loadedmetadata", handleLoaded);
        player.removeEventListener("loadeddata", handleLoaded);
        player.removeEventListener("error", handleError);
      }
      onPlayerRef.current(null);
      host.replaceChildren();
    };
  }, [src, tracksKey, enableSubtitleDelay, resumeAt]);

  return (
    <div className={cn("relative w-full", className)}>
      {isEngineLoading && (
        <div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black aspect-video"
          aria-busy="true"
        >
          <Spinner className="size-8 text-white" />
          <p className="text-sm text-white/70">
            <Trans>Loading player…</Trans>
          </p>
        </div>
      )}
      <div ref={hostRef} />
    </div>
  );
}
