import * as THREE from "three";
import { BASE_PATH } from "./fieldLayout";

export const FIELD_GREEN = 0x5db85a;
export const FIELD_DIRT = 0xf0d4a0;
export const FIELD_BORDER = 0xe7c98a;
export const FIELD_LINE = 0xffffff;

/** Perpendicular dirt past each baseline (foul-side skin). */
export const INFIELD_SKIN = 22;
/** Dirt path width between inner grass and the baselines. */
export const BASE_PATH_WIDTH = 8.5;

const H = BASE_PATH / Math.SQRT2;

export function polar(r: number, theta: number) {
  return { x: r * Math.sin(theta), z: -r * Math.cos(theta) };
}

export function fieldFan(radius: number, back: number, homeSpread: number): THREE.Shape {
  const shape = new THREE.Shape();
  const rf = polar(radius, Math.PI / 4);
  const lf = polar(radius, -Math.PI / 4);
  shape.moveTo(-homeSpread, back);
  shape.quadraticCurveTo(0, back + 12, homeSpread, back);
  shape.lineTo(rf.x, rf.z);
  const steps = 28;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const theta = Math.PI / 4 - t * (Math.PI / 2);
    const p = polar(radius, theta);
    shape.lineTo(p.x, p.z);
  }
  shape.lineTo(lf.x, lf.z);
  shape.closePath();
  return shape;
}

function infieldHalfDiag(perpOffset: number) {
  return H + perpOffset * Math.SQRT2;
}

/** Square diamond concentric with the bases. Shape XY maps to world XZ. */
export function roundedDiamond(halfDiag: number, cornerR: number): THREE.Shape {
  const cx = 0;
  const cz = -H;
  const verts = [
    { x: cx, z: cz + halfDiag },
    { x: cx + halfDiag, z: cz },
    { x: cx, z: cz - halfDiag },
    { x: cx - halfDiag, z: cz },
  ];
  const shape = new THREE.Shape();
  const n = verts.length;
  for (let i = 0; i < n; i++) {
    const prev = verts[(i + n - 1) % n];
    const curr = verts[i];
    const next = verts[(i + 1) % n];
    const toPrev = { x: prev.x - curr.x, z: prev.z - curr.z };
    const toNext = { x: next.x - curr.x, z: next.z - curr.z };
    const lp = Math.hypot(toPrev.x, toPrev.z) || 1;
    const ln = Math.hypot(toNext.x, toNext.z) || 1;
    const r = Math.min(cornerR, lp * 0.42, ln * 0.42);
    const p1 = { x: curr.x + (toPrev.x / lp) * r, z: curr.z + (toPrev.z / lp) * r };
    const p2 = { x: curr.x + (toNext.x / ln) * r, z: curr.z + (toNext.z / ln) * r };
    if (i === 0) shape.moveTo(p1.x, p1.z);
    else shape.lineTo(p1.x, p1.z);
    shape.quadraticCurveTo(curr.x, curr.z, p2.x, p2.z);
  }
  shape.closePath();
  return shape;
}

/** Infield dirt: pizza-slice / quarter-circle from home, arc past second. */
export function dirtInfield(): THREE.Shape {
  const radius = BASE_PATH * Math.SQRT2 + INFIELD_SKIN;
  const shape = new THREE.Shape();
  const start = polar(radius, Math.PI / 4);
  const end = polar(radius, -Math.PI / 4);
  shape.moveTo(0, 6);
  shape.lineTo(start.x, start.z);
  const steps = 28;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const theta = Math.PI / 4 - t * (Math.PI / 2);
    const p = polar(radius, theta);
    shape.lineTo(p.x, p.z);
  }
  shape.lineTo(end.x, end.z);
  shape.closePath();
  return shape;
}

export function diamondGrass(): THREE.Shape {
  return roundedDiamond(infieldHalfDiag(-BASE_PATH_WIDTH), 4);
}

export function pitchersLane(): THREE.Shape {
  const w = 6.2;
  const shape = new THREE.Shape();
  shape.moveTo(-w, -5);
  shape.lineTo(w, -5);
  shape.lineTo(w, -58);
  shape.lineTo(-w, -58);
  shape.closePath();
  return shape;
}

export function meshFromShape(
  shape: THREE.Shape,
  color: number,
  y: number,
  opts?: { extrude?: number },
): THREE.Mesh {
  let geo: THREE.BufferGeometry;
  if (opts?.extrude) {
    geo = new THREE.ExtrudeGeometry(shape, {
      depth: opts.extrude,
      bevelEnabled: false,
    });
  } else {
    geo = new THREE.ShapeGeometry(shape);
  }
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({
      color,
      side: THREE.DoubleSide,
    }),
  );
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = y;
  if (opts?.extrude) mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

export function chalkLine(
  a: { x: number; z: number },
  b: { x: number; z: number },
  width: number,
  y = 0.06,
) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, len),
    new THREE.MeshLambertMaterial({ color: FIELD_LINE }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = Math.atan2(dx, dz);
  mesh.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
  mesh.receiveShadow = true;
  return mesh;
}
