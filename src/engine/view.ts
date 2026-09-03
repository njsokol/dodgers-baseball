export const VIEW_W = 2560;
export const VIEW_H = 1440;
export const VIEW_ASPECT = VIEW_W / VIEW_H;

export function fitStage(stage: HTMLElement, frame: HTMLElement) {
  const w = Math.max(1, frame.clientWidth);
  const h = Math.max(1, frame.clientHeight);
  const s = Math.min(w / VIEW_W, h / VIEW_H);
  stage.style.transform = `scale(${s})`;
}
