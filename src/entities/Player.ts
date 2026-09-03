import * as THREE from "three";
import { bobKid, makeKidMesh, setKidHovered, setKidSelected } from "./kidMesh";
import { clampToPolygon, type Point } from "../world/bounds";
import { PLAYER_RADIUS, type BaseId, type PositionId } from "../world/fieldLayout";

export class Player {
  readonly id: string;
  readonly mesh: THREE.Group;
  readonly team: "home" | "away";
  positionId?: PositionId;
  isRunner = false;
  hasBall = false;
  chaseBall = false;
  covering?: BaseId;
  /** Base this runner legally occupies (undefined while the batter is still running). */
  onBase?: BaseId;
  runnerDest?: BaseId;
  speed: number;
  target: THREE.Vector3 | null = null;
  reachedBase = false;
  called = false;
  scored = false;

  constructor(opts: {
    id: string;
    team: "home" | "away";
    label: string;
    x: number;
    z: number;
    positionId?: PositionId;
    isRunner?: boolean;
    speed?: number;
  }) {
    this.id = opts.id;
    this.team = opts.team;
    this.positionId = opts.positionId;
    this.isRunner = opts.isRunner ?? false;
    this.speed = opts.speed ?? (this.isRunner ? 16 : 24);
    this.mesh = makeKidMesh({
      label: opts.label,
      team: opts.team,
      catchRing: !this.isRunner,
    });
    this.mesh.position.set(opts.x, 0, opts.z);
    this.mesh.userData.playerId = opts.id;
    this.mesh.userData.kind = this.isRunner ? "runner" : "fielder";
    this.lookAt(0, 0);
  }

  get xz(): Point {
    return { x: this.mesh.position.x, z: this.mesh.position.z };
  }

  setSelected(on: boolean) {
    setKidSelected(this.mesh, on);
  }

  setHovered(on: boolean) {
    setKidHovered(this.mesh, on);
  }

  lookAt(x: number, z: number) {
    const dx = x - this.mesh.position.x;
    const dz = z - this.mesh.position.z;
    if (dx * dx + dz * dz > 0.02) {
      this.mesh.rotation.y = Math.atan2(dx, dz);
    }
  }

  step(dt: number, fence: Point[], ballXZ?: Point) {
    let goal = this.target;
    if (this.chaseBall && ballXZ) {
      goal = new THREE.Vector3(ballXZ.x, 0, ballXZ.z);
    }
    let moving = false;
    if (goal) {
      const dx = goal.x - this.mesh.position.x;
      const dz = goal.z - this.mesh.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.6) {
        this.target = this.chaseBall ? this.target : null;
        if (!this.chaseBall) this.target = null;
      } else {
        moving = true;
        const step = Math.min(dist, this.speed * dt);
        this.mesh.position.x += (dx / dist) * step;
        this.mesh.position.z += (dz / dist) * step;
        this.lookAt(goal.x, goal.z);
      }
    }
    const clamped = clampToPolygon(this.xz, fence, PLAYER_RADIUS + 0.4);
    this.mesh.position.x = clamped.x;
    this.mesh.position.z = clamped.z;
    bobKid(this.mesh, moving, dt);
  }

  distTo(p: Point): number {
    return Math.hypot(this.mesh.position.x - p.x, this.mesh.position.z - p.z);
  }
}
