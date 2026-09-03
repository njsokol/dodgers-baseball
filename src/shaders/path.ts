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
  uniform float uOpacity;
  uniform float uTime;
  uniform float uApex;
  varying vec2 vUv;

  void main() {
    float along = vUv.x;
    float across = vUv.y * 2.0 - 1.0;
    float halfW = mix(uApex, 1.0, along);
    float edge = 0.08 + 0.04 * along;
    float cone = 1.0 - smoothstep(halfW - edge, halfW, abs(across));
    if (cone < 0.01) discard;

    float fade = smoothstep(0.0, 0.06, along) * (1.0 - smoothstep(0.82, 1.0, along));
    float pulse = 0.88 + 0.12 * sin(uTime * 2.4 - along * 6.0);
    float spine = 1.0 - smoothstep(0.0, 0.12, abs(across));
    float fill = cone * (0.28 + spine * 0.22);
    float rim = cone * smoothstep(halfW - edge * 1.6, halfW - edge * 0.2, abs(across));

    float alpha = (fill + rim * 0.65) * fade * pulse * uOpacity;
    if (alpha < 0.02) discard;
    vec3 col = mix(uColor, vec3(1.0, 0.97, 0.78), rim * 0.45 + spine * 0.2);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function makePathMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0xffe14a) },
      uOpacity: { value: 0.9 },
      uTime: { value: 0 },
      uApex: { value: 0.12 },
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

export function makeAimConeMesh(): THREE.Mesh {
  const geom = new THREE.PlaneGeometry(1, 1);
  geom.translate(0.5, 0, 0);
  const mesh = new THREE.Mesh(geom, makePathMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.1;
  mesh.visible = false;
  mesh.raycast = () => {};
  mesh.renderOrder = 1;
  return mesh;
}
