import { useEffect, useRef } from "react";

import type { SubtitleTrack } from "@/features/downloads/helpers/subtitle-tracks.helper";

import "movi-player";

export interface MoviPlayerHandle extends HTMLElement {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
}

interface MoviPlayerHostProps {
  src: string;
  tracks?: SubtitleTrack[];
  onPlayer: (player: MoviPlayerHandle | null) => void;
  onLoadedMetadata?: () => void;
  onError?: (error?: unknown) => void;
  className?: string;
}

/**
 * movi-player 0.3.x calls `this.setAttribute("tabindex", "0")` from createControls()
 * inside the custom element constructor. The HTML spec forbids gaining attributes during
 * construction, so `document.createElement("movi-player")` throws NotSupportedError.
 * Defer tabindex writes until after construction completes.
 */
function patchMoviPlayerTabIndex(): void {
  const Ctor = customElements.get("movi-player") as
    | (CustomElementConstructor & { __seedarrTabIndexPatched?: boolean })
    | undefined;
  if (!Ctor || Ctor.__seedarrTabIndexPatched) return;

  const original = Ctor.prototype.setAttribute;
  Ctor.prototype.setAttribute = function (this: HTMLElement, name: string, value: string) {
    if (name === "tabindex") {
      queueMicrotask(() => {
        original.call(this, name, value);
      });
      return;
    }
    return original.call(this, name, value);
  };
  Ctor.__seedarrTabIndexPatched = true;
}

patchMoviPlayerTabIndex();

function errorDetail(event: Event): unknown {
  return event instanceof CustomEvent ? event.detail : event;
}

/**
 * Mounts `<movi-player>` via the DOM (not JSX).
 *
 * Creation is deferred by a macrotask so React Strict Mode's mount→cleanup→mount
 * cycle does not construct then destroy the WASM player mid-load (Asyncify corruption).
 */
export function MoviPlayerHost({
  src,
  tracks = [],
  onPlayer,
  onLoadedMetadata,
  onError,
  className,
}: MoviPlayerHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onPlayerRef = useRef(onPlayer);
  const onLoadedRef = useRef(onLoadedMetadata);
  const onErrorRef = useRef(onError);
  onPlayerRef.current = onPlayer;
  onLoadedRef.current = onLoadedMetadata;
  onErrorRef.current = onError;

  // Serialize tracks so we remount only when content actually changes.
  const tracksKey = JSON.stringify(tracks.map((t) => [t.src, t.label, t.srclang, t.default, t.format]));

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let cancelled = false;
    let player: MoviPlayerHandle | null = null;

    const handleLoaded = (): void => {
      if (cancelled) return;
      onLoadedRef.current?.();
    };
    const handleError = (event: Event): void => {
      if (cancelled) return;
      const detail = errorDetail(event);
      console.error("[movi-player] error", detail);
      onErrorRef.current?.(detail);
    };

    const timer = window.setTimeout(() => {
      if (cancelled || !hostRef.current) return;

      player = document.createElement("movi-player") as MoviPlayerHandle;
      player.setAttribute("controls", "");
      player.setAttribute("theme", "dark");
      player.setAttribute("sw", "auto");
      // Docs: themecolor / --movi-primary (default is purple #8B5CF6)
      const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
      if (primary) player.setAttribute("themecolor", primary);
      player.style.width = "100%";
      player.style.aspectRatio = "16 / 9";
      player.src = src;

      const parsedTracks = JSON.parse(tracksKey) as Array<[string, string, string, boolean, string]>;
      for (const [trackSrc, label, srclang, isDefault, format] of parsedTracks) {
        const el = document.createElement("track");
        el.kind = "subtitles";
        el.label = label;
        el.srclang = srclang;
        el.src = trackSrc;
        el.default = isDefault;
        el.dataset.format = format;
        player.appendChild(el);
      }

      player.addEventListener("loadedmetadata", handleLoaded);
      player.addEventListener("loadeddata", handleLoaded);
      player.addEventListener("error", handleError);

      host.replaceChildren(player);

      // Hide loop control (button + context-menu entry) — not useful for movies/episodes
      const loopBtn = player.shadowRoot?.querySelector<HTMLElement>(".movi-loop-btn");
      if (loopBtn) loopBtn.style.display = "none";
      const loopMenu = player.shadowRoot?.querySelector<HTMLElement>(
        '.movi-context-menu-item[data-action="loop-toggle"]',
      );
      if (loopMenu) loopMenu.style.display = "none";

      onPlayerRef.current(player);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (player) {
        player.removeEventListener("loadedmetadata", handleLoaded);
        player.removeEventListener("loadeddata", handleLoaded);
        player.removeEventListener("error", handleError);
      }
      onPlayerRef.current(null);
      host.replaceChildren();
    };
  }, [src, tracksKey]);

  return <div ref={hostRef} className={className} />;
}
