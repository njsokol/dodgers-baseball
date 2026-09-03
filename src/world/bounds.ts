import { BACKSTOP, FENCE_RADIUS } from "./fieldLayout";

export type Point = { x: number; z: number };

export function buildFencePolygon(): Point[] {
  const pts: Point[] = [];
  const fenceSteps = 20;
  for (let i = 0; i <= fenceSteps; i++) {
    const t = i / fenceSteps;
    const theta = -Math.PI / 4 + t * (Math.PI / 2);
    pts.push({
      x: FENCE_RADIUS * Math.sin(theta),
      z: -FENCE_RADIUS * Math.cos(theta),
    });
  }
  const backSteps = 14;
  for (let i = 1; i <= backSteps; i++) {
    const t = i / backSteps;
    const theta = Math.PI / 4 + t * (1.5 * Math.PI);
    pts.push({
      x: BACKSTOP * Math.sin(theta),
      z: -BACKSTOP * Math.cos(theta),
    });
  }
  return pts;
}

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    const hit =
      a.z > p.z !== b.z > p.z &&
      p.x < ((b.x - a.x) * (p.z - a.z)) / (b.z - a.z + 1e-9) + a.x;
    if (hit) inside = !inside;
  }
  return inside;
}

function closestOnSegment(p: Point, a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2));
  return { x: a.x + dx * t, z: a.z + dz * t };
}

export function clampToPolygon(p: Point, poly: Point[], pad = 1.4): Point {
  if (pointInPolygon(p, poly)) return p;
  let best = poly[0];
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const c = closestOnSegment(p, a, b);
    const d = (c.x - p.x) ** 2 + (c.z - p.z) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  const cx = 0;
  const cz = -40;
  const vx = cx - best.x;
  const vz = cz - best.z;
  const len = Math.hypot(vx, vz) || 1;
  return { x: best.x + (vx / len) * pad, z: best.z + (vz / len) * pad };
}
