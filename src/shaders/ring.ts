import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uInner;
  uniform float uOuter;
  uniform float uOpacity;
  uniform float uTime;
  uniform float uDash;
  uniform float uHover;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float ang = atan(p.y, p.x);
    float ring = smoothstep(uInner - 0.03, uInner, r) * (1.0 - smoothstep(uOuter - 0.03, uOuter, r));
    float dash = 1.0;
    if (uDash > 0.5) {
      dash = step(0.35, fract(ang / 6.2831853 * 12.0 + uTime * 0.4));
    }
    float disk = 1.0 - smoothstep(uOuter - 0.04, uOuter + 0.02, r);
    float breath = 0.86 + 0.14 * sin(uTime * 2.8);
    float hoverFill = pow(max(0.0, 1.0 - r / max(uOuter, 0.001)), 1.35) * uHover * 0.45 * breath * disk;
    float hoverRim = ring * uHover * 0.7 * breath;
    float alpha = ring * dash * uOpacity + hoverFill + hoverRim;
    if (alpha < 0.02) discard;
    vec3 col = mix(uColor, vec3(1.0, 0.96, 0.72), uHover * 0.35);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function makeRingMaterial(color: THREE.ColorRepresentation, dashed = false): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uInner: { value: 0.62 },
      uOuter: { value: 0.92 },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uDash: { value: dashed ? 1 : 0 },
      uHover: { value: 0 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function makeRingMesh(
  size: number,
  color: THREE.ColorRepresentation,
  dashed = false,
): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(size, size);
  const mat = makeRingMaterial(color, dashed);
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.022;
  mesh.renderOrder = 1;
  return mesh;
}
