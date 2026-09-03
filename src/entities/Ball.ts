import * as THREE from "three";
import { BALL_RADIUS } from "../world/fieldLayout";
import { BallTrail } from "../shaders/trail";
import { applyFenceBounce } from "../world/bounds";
import type { Player } from "./Player";

export type BallMode = "idle" | "pitch" | "inPlay" | "throw" | "held" | "dead";

export class Ball {
  readonly mesh: THREE.Mesh;
  readonly shadow: THREE.Mesh;
  readonly trail = new BallTrail();
  readonly velocity = new THREE.Vector3();
  mode: BallMode = "idle";
  holder: Player | null = null;
  throwTarget: THREE.Vector3 | null = null;

  constructor() {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xfff6ea, emissive: 0x8a2020, emissiveIntensity: 0.18 }),
    );
    this.mesh.scale.setScalar(1.15);
    this.mesh.castShadow = true;
    this.mesh.position.set(0, 1.2, -46);
    this.mesh.userData.kind = "ball";
    const pick = new THREE.Mesh(
      new THREE.SphereGeometry(4.5, 10, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    pick.name = "pick";
    this.mesh.add(pick);

    const shadowMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.35 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float a = (1.0 - length(p)) * uOpacity;
          if (a < 0.02) discard;
          gl_FragColor = vec4(0.0, 0.0, 0.0, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.05;
  }

  get xz() {
    return { x: this.mesh.position.x, z: this.mesh.position.z };
  }

  hold(player: Player) {
    this.mode = "held";
    this.holder = player;
    player.hasBall = true;
    this.velocity.set(0, 0, 0);
    this.throwTarget = null;
    this.trail.clear();
  }

  release() {
    if (this.holder) this.holder.hasBall = false;
    this.holder = null;
  }

  throwTo(target: THREE.Vector3, speed = 57) {
    if (!this.holder) return;
    const from = this.holder.mesh.position;
    this.mesh.position.set(from.x, 5.4, from.z);
    this.release();
    this.mode = "throw";
    this.throwTarget = target.clone();
    this.trail.clear();
    this.trail.push(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);
    const dx = target.x - this.mesh.position.x;
    const dz = target.z - this.mesh.position.z;
    const dist = Math.hypot(dx, dz) || 1;
    const time = Math.max(0.45, dist / speed);
    this.velocity.set(dx / time, 10 / time, dz / time);
  }

  step(dt: number, fencePoly?: { x: number; z: number }[]) {
    if (this.mode === "held" && this.holder) {
      const p = this.holder.mesh.position;
      this.mesh.position.set(p.x + 1.4, 5.2, p.z + 0.4);
      this.syncShadow();
      return;
    }
    if (this.mode === "idle" || this.mode === "dead" || this.mode === "pitch") {
      if (this.mode !== "pitch") this.trail.clear();
      this.syncShadow();
      return;
    }

    const flight = this.mode === "throw" ? 1 : 0.5;
    this.velocity.y -= (this.mode === "throw" ? 18 : 32) * dt * flight;
    this.mesh.position.addScaledVector(this.velocity, dt * flight);

    if (this.mesh.position.y < BALL_RADIUS) {
      this.mesh.position.y = BALL_RADIUS;
      if (this.mode === "throw" && this.throwTarget) {
        const dx = this.mesh.position.x - this.throwTarget.x;
        const dz = this.mesh.position.z - this.throwTarget.z;
        if (dx * dx + dz * dz > 25) {
          this.mesh.position.y = BALL_RADIUS + 0.4;
          this.velocity.y = Math.abs(this.velocity.y) * 0.4;
        } else {
          this.mode = "inPlay";
          this.velocity.set(0, 0, 0);
        }
      } else {
        this.velocity.y *= -0.38;
        this.velocity.x *= 0.72;
        this.velocity.z *= 0.72;
        if (Math.abs(this.velocity.y) < 1.2) this.velocity.y = 0;
      }
    }

    if (fencePoly) {
      const bounce = applyFenceBounce(
        { x: this.mesh.position.x, z: this.mesh.position.z },
        { x: this.velocity.x, z: this.velocity.z },
        fencePoly,
        BALL_RADIUS,
      );
      if (bounce.hit) {
        this.mesh.position.set(bounce.position.x, this.mesh.position.y, bounce.position.z);
        this.velocity.x = bounce.velocity.x;
        this.velocity.z = bounce.velocity.z;
      }
    }

    if (this.mesh.position.y <= BALL_RADIUS + 0.02) {
      this.velocity.x *= Math.pow(0.22, dt * flight);
      this.velocity.z *= Math.pow(0.22, dt * flight);
      if (this.velocity.length() < 0.4) this.velocity.set(0, 0, 0);
    }

    if (this.mode === "inPlay" || this.mode === "throw") {
      this.trail.push(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z);
    }
    this.syncShadow();
  }

  private syncShadow() {
    this.shadow.position.x = this.mesh.position.x;
    this.shadow.position.z = this.mesh.position.z;
    const h = Math.max(0, this.mesh.position.y);
    const s = 1.1 + h * 0.12;
    this.shadow.scale.set(s, s, 1);
    (this.shadow.material as THREE.ShaderMaterial).uniforms.uOpacity.value = Math.max(
      0.08,
      0.4 - h * 0.03,
    );
  }
}
