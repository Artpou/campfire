import { useEffect, useRef } from "react";

import { resolveSubtitleTracksToBlobs, type SubtitleTrack } from "@/features/downloads/helpers/subtitle-tracks.helper";

import "movi-player";

export interface MoviPlayerHandle extends HTMLElement {
  src: string;
  currentTime: number;
  duration: number;
  paused: boolean;
  volume: number;
  muted: boolean;
  subtitleDelay: number;
  source?: (value: {
    video: { src: string };
    subtitles?: Array<{ src: string; lang: string; label: string; format?: string }>;
  }) => void;
}

interface MoviPlayerHostProps {
  src: string;
  tracks?: SubtitleTrack[];
  onPlayer: (player: MoviPlayerHandle | null) => void;
  onLoadedMetadata?: () => void;
  onError?: (error?: unknown) => void;
  onAddSubtitles?: () => void;
  enableSubtitleDelay?: boolean;
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

/** Inject Add / Delay controls into movi-player's CC menu (native delay UI is file-source only). */
function injectCcExtras(player: MoviPlayerHandle, opts: { onAddSubtitles?: () => void; enableDelay?: boolean }): void {
  const menu = player.shadowRoot?.querySelector(".movi-subtitle-track-menu");
  if (!menu || menu.querySelector("[data-seedarr-cc-extras]")) return;

  const wrap = document.createElement("div");
  wrap.dataset.seedarrCcExtras = "true";
  wrap.style.cssText =
    "border-top:1px solid rgba(255,255,255,0.12);padding:0.4rem 0.5rem;display:flex;flex-direction:column;gap:0.35rem;";

  if (opts.enableDelay) {
    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:0.35rem;";

    const label = document.createElement("span");
    label.textContent = "Delay";
    label.style.cssText = "font-size:0.75rem;opacity:0.8;";

    const controls = document.createElement("div");
    controls.style.cssText = "display:flex;align-items:center;gap:0.25rem;";

    const readout = document.createElement("span");
    readout.style.cssText = "min-width:3.25rem;text-align:center;font-variant-numeric:tabular-nums;font-size:0.75rem;";
    const formatDelay = (seconds: number): string =>
      seconds === 0 ? "0s" : `${seconds > 0 ? "+" : ""}${seconds.toFixed(1)}s`;
    readout.textContent = formatDelay(player.subtitleDelay ?? 0);

    const makeBtn = (text: string, delta: number | "zero"): HTMLButtonElement => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = text;
      btn.style.cssText =
        "border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.06);color:inherit;border-radius:0.35rem;padding:0.15rem 0.4rem;font:inherit;font-size:0.7rem;cursor:pointer;";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const current = player.subtitleDelay ?? 0;
        const next = delta === "zero" ? 0 : Math.round((current + delta) * 10) / 10;
        player.subtitleDelay = next;
        readout.textContent = formatDelay(next);
      });
      return btn;
    };

    controls.append(makeBtn("−0.1", -0.1), readout, makeBtn("+0.1", 0.1), makeBtn("0", "zero"));
    row.append(label, controls);
    wrap.appendChild(row);
  }

  if (opts.onAddSubtitles) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Add subtitles";
    btn.style.cssText =
      "display:flex;width:100%;align-items:center;justify-content:center;padding:0.45rem 0.5rem;border:0;border-radius:0.35rem;background:rgba(255,255,255,0.08);color:inherit;font:inherit;font-size:0.8rem;cursor:pointer;";
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      opts.onAddSubtitles?.();
    });
    wrap.appendChild(btn);
  }

  menu.appendChild(wrap);
}

/**
 * Mounts `<movi-player>` via the DOM (not JSX).
 *
 * Creation is deferred by a macrotask so React Strict Mode's mount→cleanup→mount
 * cycle does not construct then destroy the WASM player mid-load (Asyncify corruption).
 *
 * External subs are prefetched (cookies) into blob: URLs, then wired via `source()`.
 */
export function MoviPlayerHost({
  src,
  tracks = [],
  onPlayer,
  onLoadedMetadata,
  onError,
  onAddSubtitles,
  enableSubtitleDelay = false,
  className,
}: MoviPlayerHostProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onPlayerRef = useRef(onPlayer);
  const onLoadedRef = useRef(onLoadedMetadata);
  const onErrorRef = useRef(onError);
  const onAddSubtitlesRef = useRef(onAddSubtitles);
  onPlayerRef.current = onPlayer;
  onLoadedRef.current = onLoadedMetadata;
  onErrorRef.current = onError;
  onAddSubtitlesRef.current = onAddSubtitles;

  const tracksKey = JSON.stringify(tracks.map((t) => [t.src, t.label, t.srclang, t.default, t.format]));

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
      onErrorRef.current?.(detail);
    };

    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled || !hostRef.current) return;

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

        const primary = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
        if (primary) player.setAttribute("themecolor", primary);

        player.style.width = "100%";
        player.style.aspectRatio = "16 / 9";

        player.addEventListener("loadedmetadata", handleLoaded);
        player.addEventListener("loadeddata", handleLoaded);
        player.addEventListener("error", handleError);

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
          injectCcExtras(player, {
            onAddSubtitles: onAddSubtitlesRef.current ? () => onAddSubtitlesRef.current?.() : undefined,
            enableDelay: enableSubtitleDelay,
          });
        }

        onPlayerRef.current(player);
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
  }, [src, tracksKey, enableSubtitleDelay]);

  return <div ref={hostRef} className={className} />;
}
