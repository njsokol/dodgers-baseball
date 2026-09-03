export const BASE_PATH = 60;
export const MOUND_DIST = 46;
export const FENCE_RADIUS = 148;
export const BACKSTOP = 28;
export const BASE_SIZE = 4.0;
export const PLAYER_RADIUS = 1.1;
export const BALL_RADIUS = 1.35;
/** Horizontal catch / pickup radius used in play and drawn as the outer ring. */
export const CATCH_RADIUS = 6.5;
/** Ball must leave the plate this far before anyone can field it. */
export const HIT_TRAVEL = 18;

const H = BASE_PATH / Math.SQRT2;

export type XZ = { x: number; z: number };

export const HOME: XZ = { x: 0, z: 0 };
export const FIRST: XZ = { x: H, z: -H };
export const SECOND: XZ = { x: 0, z: -BASE_PATH * Math.SQRT2 };
export const THIRD: XZ = { x: -H, z: -H };
export const MOUND: XZ = { x: 0, z: -MOUND_DIST };

/** First-base (home) and third-base (away) dugouts. */
export const DUGOUT_HOME: XZ = { x: 48, z: -18 };
export const DUGOUT_AWAY: XZ = { x: -48, z: -18 };
/** Walk-out in front of the visitors dugout, then the batter's box. */
export const DUGOUT_AWAY_EXIT: XZ = { x: -36, z: -8 };
export const BATTER_BOX: XZ = { x: -2.6, z: 0.8 };

export type BaseId = "home" | "1B" | "2B" | "3B";
export type PositionId = "P" | "C" | "1B" | "2B" | "3B" | "SS" | "LF" | "CF" | "RF";

export const BASES: Record<BaseId, XZ> = {
  home: HOME,
  "1B": FIRST,
  "2B": SECOND,
  "3B": THIRD,
};

export const NEXT_BASE: Record<BaseId, BaseId> = {
  home: "1B",
  "1B": "2B",
  "2B": "3B",
  "3B": "home",
};

export const FIELDER_SPOTS: Record<PositionId, XZ> = {
  P: { x: 0, z: -44 },
  C: { x: 0, z: 5.5 },
  "1B": { x: 40, z: -48 },
  "2B": { x: 24, z: -70 },
  "3B": { x: -40, z: -48 },
  SS: { x: -24, z: -70 },
  LF: { x: -58, z: -100 },
  CF: { x: 0, z: -114 },
  RF: { x: 58, z: -100 },
};

export const COLORS = {
  grass: 0x4caf50,
  grassDark: 0x388e3c,
  dirt: 0xd2a679,
  dirtDark: 0xb8895a,
  chalk: 0xf7f1e1,
  dodgerBlue: 0x005a9c,
  red: 0xef3e42,
  white: 0xf8f8f8,
  skin: 0xf1c27d,
  orange: 0xf4a027,
  cream: 0xffe7c2,
  wood: 0x8b5a2b,
  woodDark: 0x6b3f18,
  sky: 0x7ec8f0,
  fence: 0x7d8b99,
  asphalt: 0x5a6570,
  house: 0xf3d7b5,
  roof: 0xc44536,
  roofBlue: 0x3d6ea8,
} as const;

export function distXZ(a: XZ, b: XZ): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.hypot(dx, dz);
}

export function lerpXZ(a: XZ, b: XZ, t: number): XZ {
  return { x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t };
}
