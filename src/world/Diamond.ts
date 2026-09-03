import * as THREE from "three";
import { makeGlowMesh } from "../shaders/glow";
import { BASES, type BaseId } from "./fieldLayout";

export class Diamond {
  readonly group = new THREE.Group();
  readonly baseGlows = new Map<BaseId, THREE.Mesh>();
  readonly baseHits = new Map<BaseId, THREE.Mesh>();

  constructor() {
    (Object.keys(BASES) as BaseId[]).forEach((id) => {
      const pos = BASES[id];
      const glow = makeGlowMesh(id === "home" ? 16 : 14, 0xffee66);
      glow.position.set(pos.x, 0.12, pos.z);
      this.group.add(glow);
      this.baseGlows.set(id, glow);

      const hit = new THREE.Mesh(
        new THREE.CircleGeometry(10, 16),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      hit.rotation.x = -Math.PI / 2;
      hit.position.set(pos.x, 0.14, pos.z);
      hit.userData.baseId = id;
      this.group.add(hit);
      this.baseHits.set(id, hit);
    });
  }

  setGlow(id: BaseId, intensity: number, color?: THREE.ColorRepresentation) {
    const mesh = this.baseGlows.get(id);
    if (!mesh) return;
    const mat = mesh.material as THREE.ShaderMaterial;
    mat.uniforms.uIntensity.value = intensity;
    if (color) mat.uniforms.uColor.value.set(color);
  }

  clearGlows() {
    for (const mesh of this.baseGlows.values()) {
      (mesh.material as THREE.ShaderMaterial).uniforms.uIntensity.value = 0;
    }
  }

  tick(time: number) {
    for (const mesh of this.baseGlows.values()) {
      (mesh.material as THREE.ShaderMaterial).uniforms.uTime.value = time;
    }
  }
}
