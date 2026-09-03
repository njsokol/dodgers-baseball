import { Game } from "./engine/Game";
import { fitStage } from "./engine/view";
import { registerServiceWorker } from "./sw/register";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
const hud = document.querySelector<HTMLElement>("#hud");
const frame = document.querySelector<HTMLElement>("#frame");
const stage = document.querySelector<HTMLElement>("#stage");
if (!canvas || !hud || !frame || !stage) throw new Error("Missing #game, #hud, #frame, or #stage");

const frameEl = frame;
const stageEl = stage;

function layout() {
  fitStage(stageEl, frameEl);
}

layout();
window.addEventListener("resize", layout);
window.visualViewport?.addEventListener("resize", layout);
window.visualViewport?.addEventListener("scroll", layout);
window.addEventListener("orientationchange", () => requestAnimationFrame(layout));

let autoFullscreenAttempted = false;
function triggerAutoFullscreen() {
  if (autoFullscreenAttempted) return;
  autoFullscreenAttempted = true;

  const rootEl = document.documentElement as HTMLElement & {
    requestFullscreen?: () => Promise<void>;
    webkitRequestFullscreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
    mozRequestFullScreen?: () => Promise<void>;
  };
  const request =
    rootEl.requestFullscreen ??
    rootEl.webkitRequestFullscreen ??
    rootEl.msRequestFullscreen ??
    rootEl.mozRequestFullScreen;

  if (!request) return;
  request.call(rootEl).catch(() => {
    // Browsers block fullscreen unless it comes from a user gesture.
  });
}

const captureFirstInteraction = (event: Event) => {
  if (autoFullscreenAttempted) return;
  if (!(event.target instanceof Element)) return;
  const interactive = event.target.closest?.("button, input, canvas, .interactive");
  if (!interactive) return;
  triggerAutoFullscreen();
};

document.addEventListener("pointerdown", captureFirstInteraction, { once: true });
document.addEventListener("touchstart", captureFirstInteraction, { once: true });
document.addEventListener("keydown", captureFirstInteraction, { once: true });

document.addEventListener(
  "touchmove",
  (e) => {
    const el = e.target as HTMLElement | null;
    if (el?.closest?.(".settings")) return;
    e.preventDefault();
  },
  { passive: false },
);
document.addEventListener("gesturestart", (e) => {
  e.preventDefault();
});

const game = new Game(canvas, hud);
game.start();
registerServiceWorker();
