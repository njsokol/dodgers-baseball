import * as THREE from "three";

const COUNT = 42;
const HEAD_W = 1.9;
const TAIL_W = 0.12;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float along = vUv.x;
    float across = abs(vUv.y * 2.0 - 1.0);
    float core = 1.0 - smoothstep(0.0, 0.55, across);
    float edge = 1.0 - smoothstep(0.45, 1.0, across);
    float fade = pow(along, 0.65);
    float alpha = (core * 0.95 + edge * 0.35) * fade;
    if (alpha < 0.03) discard;
    vec3 col = mix(uColor, vec3(1.0, 0.98, 0.88), core * along);
    gl_FragColor = vec4(col, alpha);
  }
`;

export class BallTrail {
  readonly mesh: THREE.Mesh;
  private readonly pts: THREE.Vector3[] = [];
  private readonly pos: THREE.BufferAttribute;
  private readonly uv: THREE.BufferAttribute;
  private readonly side = new THREE.Vector3();
  private readonly tan = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor() {
    const geo = new THREE.BufferGeometry();
    this.pos = new THREE.BufferAttribute(new Float32Array(COUNT * 2 * 3), 3);
    this.uv = new THREE.BufferAttribute(new Float32Array(COUNT * 2 * 2), 2);
    const idx: number[] = [];
    for (let i = 0; i < COUNT - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setAttribute("position", this.pos);
    geo.setAttribute("uv", this.uv);
    geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(0xfff1a0) } },
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    this.mesh.renderOrder = 3;
    this.mesh.visible = false;
  }

  clear() {
    this.pts.length = 0;
    this.mesh.visible = false;
  }

  push(x: number, y: number, z: number) {
    const last = this.pts[this.pts.length - 1];
    if (last) {
      const dx = x - last.x;
      const dy = y - last.y;
      const dz = z - last.z;
      if (dx * dx + dy * dy + dz * dz < 0.12) return;
    }
    this.pts.push(new THREE.Vector3(x, y, z));
    if (this.pts.length > COUNT) this.pts.shift();
    this.rebuild();
  }

  private rebuild() {
    const n = this.pts.length;
    if (n < 2) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;
    for (let i = 0; i < COUNT; i++) {
      const src = Math.min(n - 1, Math.max(0, i - (COUNT - n)));
      const p = this.pts[src];
      const prev = this.pts[Math.max(0, src - 1)];
      const next = this.pts[Math.min(n - 1, src + 1)];
      this.tan.subVectors(next, prev);
      if (this.tan.lengthSq() < 1e-6) this.tan.set(0, 0, 1);
      this.tan.normalize();
      this.side.crossVectors(this.tan, this.up);
      if (this.side.lengthSq() < 1e-6) this.side.set(1, 0, 0);
      else this.side.normalize();
      const t = n === 1 ? 1 : src / (n - 1);
      const w = TAIL_W + (HEAD_W - TAIL_W) * t;
      const i0 = i * 2;
      this.pos.setXYZ(i0, p.x - this.side.x * w, p.y - this.side.y * w, p.z - this.side.z * w);
      this.pos.setXYZ(i0 + 1, p.x + this.side.x * w, p.y + this.side.y * w, p.z + this.side.z * w);
      this.uv.setXY(i0, t, 0);
      this.uv.setXY(i0 + 1, t, 1);
    }
    this.pos.needsUpdate = true;
    this.uv.needsUpdate = true;
    this.mesh.geometry.computeBoundingSphere();
  }
}
