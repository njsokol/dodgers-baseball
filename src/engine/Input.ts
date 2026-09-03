import * as THREE from "three";
import type { BaseId } from "../world/fieldLayout";

export type ClickTarget =
  | { kind: "fielder"; id: string }
  | { kind: "ball" }
  | { kind: "base"; id: BaseId }
  | { kind: "ground"; x: number; z: number };

export type HoverKind = "default" | "fielder" | "ball" | "base" | "ground";

/** CSS-pixel radius for kid-sized taps on the scaled canvas. */
const FAT_FINGER_PX = 44;

export class Input {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly hit = new THREE.Vector3();
  private readonly proj = new THREE.Vector3();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: THREE.Camera,
    private readonly getFielders: () => THREE.Object3D[],
    private readonly getBases: () => THREE.Object3D[],
    private readonly getBall: () => THREE.Object3D,
    private readonly onClick: (target: ClickTarget) => void,
    private readonly onHover: (kind: HoverKind, fielderId?: string) => void,
    private readonly onDeselect: () => void,
  ) {
    canvas.addEventListener("pointerdown", this.handleDown);
    canvas.addEventListener("pointermove", this.handleMove);
    canvas.addEventListener("pointerleave", this.handleLeave);
    window.addEventListener("keydown", this.handleKey);
  }

  dispose() {
    this.canvas.removeEventListener("pointerdown", this.handleDown);
    this.canvas.removeEventListener("pointermove", this.handleMove);
    this.canvas.removeEventListener("pointerleave", this.handleLeave);
    window.removeEventListener("keydown", this.handleKey);
  }

  private ndc(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private pick(): ClickTarget | null {
    const fielders = this.getFielders();
    const fHits = this.raycaster.intersectObjects(fielders, true);
    if (fHits[0]) {
      let obj: THREE.Object3D | null = fHits[0].object;
      while (obj && !obj.userData.playerId) obj = obj.parent;
      if (obj?.userData.playerId) return { kind: "fielder", id: obj.userData.playerId };
    }
    const bHits = this.raycaster.intersectObject(this.getBall(), true);
    if (bHits[0]) return { kind: "ball" };
    const baseHits = this.raycaster.intersectObjects(this.getBases(), true);
    if (baseHits[0]?.object.userData.baseId) {
      return { kind: "base", id: baseHits[0].object.userData.baseId as BaseId };
    }
    const near = this.screenPick();
    if (near) return near;
    if (this.raycaster.ray.intersectPlane(this.ground, this.hit)) {
      return { kind: "ground", x: this.hit.x, z: this.hit.z };
    }
    return null;
  }

  private screenPick(): ClickTarget | null {
    const rect = this.canvas.getBoundingClientRect();
    const px = (this.pointer.x * 0.5 + 0.5) * rect.width;
    const py = (-this.pointer.y * 0.5 + 0.5) * rect.height;
    let best: ClickTarget | null = null;
    let bestD = FAT_FINGER_PX;

    const consider = (obj: THREE.Object3D, target: ClickTarget, lift = 0) => {
      this.proj.setFromMatrixPosition(obj.matrixWorld);
      this.proj.y += lift;
      this.proj.project(this.camera);
      const sx = (this.proj.x * 0.5 + 0.5) * rect.width;
      const sy = (-this.proj.y * 0.5 + 0.5) * rect.height;
      const d = Math.hypot(sx - px, sy - py);
      if (d < bestD) {
        bestD = d;
        best = target;
      }
    };

    for (const f of this.getFielders()) {
      const id = f.userData.playerId as string | undefined;
      if (id) consider(f, { kind: "fielder", id }, 5);
    }
    consider(this.getBall(), { kind: "ball" });
    for (const b of this.getBases()) {
      const id = b.userData.baseId as BaseId | undefined;
      if (id) consider(b, { kind: "base", id });
    }
    return best;
  }

  private handleDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.ndc(e);
    const target = this.pick();
    if (target) this.onClick(target);
  };

  private handleMove = (e: PointerEvent) => {
    this.ndc(e);
    const target = this.pick();
    if (!target) this.onHover("default");
    else if (target.kind === "fielder") this.onHover("fielder", target.id);
    else if (target.kind === "base") this.onHover("base");
    else if (target.kind === "ball") this.onHover("ball");
    else this.onHover("ground");
  };

  private handleLeave = () => {
    this.onHover("default");
  };

  private handleKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") this.onDeselect();
  };
}
