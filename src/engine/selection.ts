import type { ClickTarget } from "./Input";

export function shouldClearSelection(selectedId: string | null, target: ClickTarget): boolean {
  if (!selectedId) return false;
  if (target.kind === "fielder") return target.id !== selectedId;
  return false;
}
