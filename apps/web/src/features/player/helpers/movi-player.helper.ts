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

type CcExtrasOpts = { onAddSubtitles?: () => void; enableDelay?: boolean };

let moviPlayerImport: Promise<void> | null = null;

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

/** Warm the ~10 MB movi-player chunk in the background (hover / route preload). */
export function preloadMoviPlayer(): void {
  void ensureMoviPlayerRegistered().catch(() => {
    // Best-effort prefetch — Player will surface errors on mount.
  });
}

/** Load + register `<movi-player>` once; shared by preload and Player mount. */
export function ensureMoviPlayerRegistered(): Promise<void> {
  if (customElements.get("movi-player")) {
    patchMoviPlayerTabIndex();
    return Promise.resolve();
  }
  if (!moviPlayerImport) {
    moviPlayerImport = import("movi-player")
      .then(() => {
        patchMoviPlayerTabIndex();
      })
      .catch((err) => {
        moviPlayerImport = null;
        throw err;
      });
  }
  return moviPlayerImport;
}

export function errorDetail(event: Event): unknown {
  return event instanceof CustomEvent ? event.detail : event;
}

/** Inject Add / Delay controls into movi-player's CC menu (native delay UI is file-source only). */
function injectCcExtras(player: MoviPlayerHandle, opts: CcExtrasOpts): void {
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
 * movi-player hides `.movi-subtitle-track-container` when there are no tracks.
 * Keep the CC button visible so users can still open the menu and add subtitles.
 */
export function ensureCcMenuAvailable(player: MoviPlayerHandle, opts: CcExtrasOpts): void {
  const showCcControls = (): void => {
    const root = player.shadowRoot;
    if (!root) return;

    const container = root.querySelector<HTMLElement>(".movi-subtitle-track-container");
    const btn = root.querySelector<HTMLElement>(".movi-subtitle-track-btn");
    const list = root.querySelector<HTMLElement>(".movi-subtitle-track-list");
    const footer = root.querySelector<HTMLElement>(".movi-subtitle-track-footer");

    if (container) container.style.display = "flex";
    if (btn) btn.style.display = "flex";

    // When no tracks exist, updateSubtitleTrackMenu returns early without seeding the list.
    if (list && list.childElementCount === 0) {
      list.innerHTML = `
          <div class="movi-subtitle-track-item movi-subtitle-track-active" data-track-id="null">
            <span class="movi-subtitle-track-label">Off</span>
          </div>
        `;
      if (footer) footer.textContent = "No subtitle tracks available";
    }

    injectCcExtras(player, opts);
  };

  const el = player as MoviPlayerHandle & {
    updateSubtitleTrackMenu?: () => void;
    __seedarrCcPatched?: boolean;
  };

  if (typeof el.updateSubtitleTrackMenu === "function" && !el.__seedarrCcPatched) {
    const original = el.updateSubtitleTrackMenu.bind(el);
    el.updateSubtitleTrackMenu = () => {
      original();
      showCcControls();
    };
    el.__seedarrCcPatched = true;
  }

  showCcControls();
}
