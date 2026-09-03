export const SCORE_VALUES = {
  pickup: 2,
  throw: 3,
  out: 10,
  doublePlay: 25,
  triplePlay: 50,
} as const;

export function awardScore(total: number, event: keyof typeof SCORE_VALUES): number {
  return total + SCORE_VALUES[event];
}
