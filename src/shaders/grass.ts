import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec2 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  varying vec2 vWorld;

  void main() {
    vec2 uv = vWorld * 0.055;
    vec3 tex = texture2D(uMap, uv).rgb;
    float n = 0.06 * sin(vWorld.x * 0.07) * sin(vWorld.y * 0.05);
    gl_FragColor = vec4(tex * uTint * (1.0 + n), 1.0);
  }
`;

export function makeGrassMaterial(map: THREE.Texture, tint = 0xffffff): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uTint: { value: new THREE.Color(tint) },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    toneMapped: false,
  });
}
