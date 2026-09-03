import { BASES, type BaseId } from "../world/fieldLayout";
import type { Player } from "../entities/Player";
import type { Ball } from "../entities/Ball";

/**
 * Bases where a runner can be put out by the ball at the bag (no tag).
 * If the batter-runner is out, first is open and every force is off —
 * trailing runners must be tagged.
 */
export function forceBases(occupied: Set<BaseId>, batterOut = false): Set<BaseId> {
  const forces = new Set<BaseId>();
  if (batterOut) return forces;
  forces.add("1B");
  if (occupied.has("1B")) forces.add("2B");
  if (occupied.has("1B") && occupied.has("2B")) forces.add("3B");
  if (occupied.has("1B") && occupied.has("2B") && occupied.has("3B")) forces.add("home");
  return forces;
}

export function isFair(x: number, z: number): boolean {
  if (z > 2) return false;
  const along = -z;
  if (along < 0) return false;
  return Math.abs(x) <= along + 1.5;
}

export function covering(players: Player[], base: BaseId, radius = 5): Player | undefined {
  const bag = BASES[base];
  return players.find((p) => !p.isRunner && p.distTo(bag) <= radius);
}

export function holderAtBase(ball: Ball, base: BaseId, radius = 5): boolean {
  if (ball.mode !== "held" || !ball.holder) return false;
  return ball.holder.distTo(BASES[base]) <= radius;
}

export type PlayGrade = "correct" | "partial" | "wrong" | "none";
