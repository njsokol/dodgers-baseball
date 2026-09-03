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
