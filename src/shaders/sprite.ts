import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  varying vec2 vUv;

  void main() {
    vec4 c = texture2D(uMap, vUv);
    float mag = max(c.r, c.b) - c.g;
    if (mag > 0.26 && c.g < 0.52) discard;
    gl_FragColor = c;
  }
`;

export function makeSpriteMaterial(map: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uMap: { value: map } },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: true,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}
