import { SCENARIOS } from "../sim/scenarios";

export interface HudHandlers {
  onTogglePlay: () => void;
  onNext: () => void;
  onOpenSettings: () => void;
  onSpeed: (v: number) => void;
  onHints: (on: boolean) => void;
  onMute: (on: boolean) => void;
  onScenarioToggle: (id: string, on: boolean) => void;
}

export class Hud {
  private playBtn: HTMLButtonElement;
  private gearBtn: HTMLButtonElement;
  private fullscreenBtn: HTMLButtonElement;
  private panel: HTMLElement;
  private scoreEl: HTMLElement;
  private coachEl: HTMLElement;
  private pausedEl: HTMLElement;
  private playIcon: HTMLElement;
  private callEl: HTMLElement;
  private callText: HTMLElement;
  private callTimer = 0;
  private settingsOpen = false;
  private tab: "game" | "scenarios" | "credits" = "game";

  constructor(
    root: HTMLElement,
    private readonly handlers: HudHandlers,
  ) {
    root.innerHTML = `
      <div class="scoreboard" aria-live="polite">
        <span class="scoreboard-label">Score</span>
        <span class="scoreboard-value" id="score">0</span>
      </div>
      <div class="coach" id="coach"></div>
      <div class="paused-pill" id="paused" hidden>PAUSED</div>
      <div class="call-stamp" id="call" hidden><span id="call-text"></span></div>
      <div class="dock interactive">
        <button class="play-btn" id="play" type="button" aria-label="Play">
          <span class="play-icon" id="play-icon"></span>
        </button>
        <button class="next-btn" id="next" type="button" aria-label="Next play">
          <span class="next-icon" aria-hidden="true"></span>
        </button>
        <button class="gear-btn" id="gear" type="button" aria-label="Settings">
          <span class="gear-icon"></span>
        </button>
      </div>
      <div class="settings interactive" id="settings" hidden>
        <div class="settings-tabs">
          <button type="button" data-tab="game" class="on">Game</button>
          <button type="button" data-tab="scenarios">Scenarios</button>
          <button type="button" data-tab="credits">Credits</button>
        </div>
        <div class="tab-game">
          <label>Runner speed
            <input id="speed" type="range" min="0.25" max="1.25" step="0.25" value="0.5" />
            <span id="speed-val">0.5x</span>
          </label>
          <label class="check"><input id="hints" type="checkbox" checked /> Coach glow hints</label>
          <label class="check"><input id="mute" type="checkbox" /> Mute</label>
          <button id="fullscreen" type="button" class="fullscreen-btn">Enter full screen</button>
        </div>
        <div class="tab-scenarios" hidden>
          <p class="hint">Play picks at random from what's on. Next walks through the list.</p>
          <div id="scenario-list"></div>
        </div>
        <div class="tab-credits" hidden>
          <p class="credit-line"><strong>Field</strong> Neighborhood park, original art</p>
        </div>
      </div>
    `;

    this.playBtn = root.querySelector("#play")!;
    this.gearBtn = root.querySelector("#gear")!;
    this.fullscreenBtn = root.querySelector("#fullscreen")!;
    this.panel = root.querySelector("#settings")!;
    this.scoreEl = root.querySelector("#score")!;
    this.coachEl = root.querySelector("#coach")!;
    this.pausedEl = root.querySelector("#paused")!;
    this.playIcon = root.querySelector("#play-icon")!;
    this.callEl = root.querySelector("#call")!;
    this.callText = root.querySelector("#call-text")!;

    this.setPlayIcon("play");
    this.setScore(0);
    this.syncFullscreenState();
    this.playBtn.addEventListener("click", () => this.handlers.onTogglePlay());
    root.querySelector("#next")!.addEventListener("click", () => this.handlers.onNext());
    this.gearBtn.addEventListener("click", () => {
      this.setSettingsOpen(!this.settingsOpen);
    });
    this.fullscreenBtn.addEventListener("click", () => {
      void this.toggleFullscreen();
    });
    document.addEventListener("fullscreenchange", () => this.syncFullscreenState());
    document.addEventListener("webkitfullscreenchange", () => this.syncFullscreenState());
    document.addEventListener("mozfullscreenchange", () => this.syncFullscreenState());
    document.addEventListener("MSFullscreenChange", () => this.syncFullscreenState());
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (!this.settingsOpen) return;
        const t = e.target as Node | null;
        if (!t) return;
        if (this.panel.contains(t) || this.gearBtn.contains(t)) return;
        this.setSettingsOpen(false);
        const el = t instanceof Element ? t : t.parentElement;
        if (!el?.closest(".interactive")) e.stopPropagation();
      },
      true,
    );

    root.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.tab = (btn as HTMLElement).dataset.tab as "game" | "scenarios" | "credits";
        this.syncTabs();
      });
    });

    const speed = root.querySelector("#speed") as HTMLInputElement;
    const speedVal = root.querySelector("#speed-val")!;
    speed.addEventListener("input", () => {
      const v = Number(speed.value);
      speedVal.textContent = `${v.toFixed(2).replace(/0$/, "")}x`.replace(".00x", ".0x");
      this.handlers.onSpeed(v);
    });
    root.querySelector("#hints")!.addEventListener("change", (e) => {
      this.handlers.onHints((e.target as HTMLInputElement).checked);
    });
    root.querySelector("#mute")!.addEventListener("change", (e) => {
      this.handlers.onMute((e.target as HTMLInputElement).checked);
    });

    const list = root.querySelector("#scenario-list")!;
    for (const s of SCENARIOS) {
      const row = document.createElement("label");
      row.className = "check";
      row.innerHTML = `<input type="checkbox" data-sid="${s.id}" checked /> ${s.name}`;
      row.querySelector("input")!.addEventListener("change", (e) => {
        this.handlers.onScenarioToggle(s.id, (e.target as HTMLInputElement).checked);
      });
      list.appendChild(row);
    }
  }

  private async toggleFullscreen() {
    const rootEl = document.documentElement as HTMLElement & {
      requestFullscreen?: () => Promise<void>;
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
      mozRequestFullScreen?: () => Promise<void>;
    };
    const doc = document as Document & {
      fullscreenElement?: Element | null;
      webkitFullscreenElement?: Element | null;
      mozFullScreenElement?: Element | null;
      exitFullscreen?: () => Promise<void>;
      webkitExitFullscreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
      mozCancelFullScreen?: () => Promise<void>;
    };

    const isActive =
      !!doc.fullscreenElement ||
      !!doc.webkitFullscreenElement ||
      !!doc.mozFullScreenElement;

    try {
      if (isActive) {
        const exit =
          doc.exitFullscreen ??
          doc.webkitExitFullscreen ??
          doc.msExitFullscreen ??
          doc.mozCancelFullScreen;
        if (exit) await exit.call(document);
        return;
      }

      const request =
        rootEl.requestFullscreen ??
        rootEl.webkitRequestFullscreen ??
        rootEl.msRequestFullscreen ??
        rootEl.mozRequestFullScreen;
      if (request) await request.call(rootEl);
    } catch {
      // Browsers will only allow fullscreen after a user gesture. This is expected.
    }
  }

  private syncFullscreenState() {
    const isActive =
      !!document.fullscreenElement ||
      !!(document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement ||
      !!(document as Document & { mozFullScreenElement?: Element | null }).mozFullScreenElement;
    this.fullscreenBtn.textContent = isActive ? "Exit full screen" : "Enter full screen";
    this.fullscreenBtn.setAttribute("aria-pressed", String(isActive));
  }

  private setSettingsOpen(on: boolean) {
    this.settingsOpen = on;
    this.panel.hidden = !on;
    if (on) this.handlers.onOpenSettings();
  }

  private syncTabs() {
    const game = this.panel.querySelector(".tab-game") as HTMLElement;
    const sc = this.panel.querySelector(".tab-scenarios") as HTMLElement;
    const credits = this.panel.querySelector(".tab-credits") as HTMLElement;
    game.hidden = this.tab !== "game";
    sc.hidden = this.tab !== "scenarios";
    credits.hidden = this.tab !== "credits";
    this.panel.querySelectorAll("[data-tab]").forEach((b) => {
      b.classList.toggle("on", (b as HTMLElement).dataset.tab === this.tab);
    });
  }

  setScore(value: number) {
    this.scoreEl.textContent = String(value);
  }

  setCoach(text: string | null) {
    this.coachEl.textContent = text ?? "";
    this.coachEl.classList.toggle("show", Boolean(text));
  }

  setSelected(_label: string | null) {
    // Intentionally no-op: selection state is visualized by the player glow, not a HUD label.
  }

  setPaused(on: boolean) {
    this.pausedEl.hidden = !on;
  }

  clearCall() {
    window.clearTimeout(this.callTimer);
    this.callEl.hidden = true;
    this.callEl.className = "call-stamp";
  }

  showCall(kind: "safe" | "out" | "double" | "triple") {
    window.clearTimeout(this.callTimer);
    this.callEl.hidden = false;
    this.callEl.className = `call-stamp show ${kind}`;
    this.callText.textContent =
      kind === "triple"
        ? "TRIPLE PLAY!"
        : kind === "double"
          ? "DOUBLE PLAY!"
          : kind === "out"
            ? "OUT!"
            : "SAFE!";
    this.callTimer = window.setTimeout(() => {
      this.callEl.classList.add("fade");
      this.callTimer = window.setTimeout(() => {
        this.callEl.hidden = true;
        this.callEl.className = "call-stamp";
      }, 400);
    }, 2200);
  }

  setPlayIcon(mode: "play" | "pause") {
    this.playIcon.innerHTML =
      mode === "play"
        ? `<svg viewBox="0 0 64 64" aria-hidden="true"><polygon points="18,10 54,32 18,54" fill="currentColor"/></svg>`
        : `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="12" width="12" height="40" rx="3"/><rect x="38" y="12" width="12" height="40" rx="3"/></svg>`;
    this.playBtn.setAttribute("aria-label", mode === "play" ? "Play" : "Pause");
  }
}
