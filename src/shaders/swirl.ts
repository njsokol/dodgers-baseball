import * as THREE from "three";

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uGold;
  uniform vec3 uHighlight;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float a = atan(p.y, p.x);

    float disk = 1.0 - smoothstep(0.62, 0.78, r);
    if (disk < 0.01) discard;

    float hole = smoothstep(0.18, 0.32, r);
    float t = uTime * 0.55;

    float swirl = 0.0;
    for (int i = 0; i < 2; i++) {
      float fi = float(i);
      float arms = 2.0 + fi;
      float twist = a * arms + r * (6.5 + fi * 1.6) - t * (0.9 + fi * 0.25);
      float ribbon = pow(0.5 + 0.5 * sin(twist), 5.5);
      swirl += ribbon * (0.28 - fi * 0.08);
    }

    float spark = 0.0;
    vec2 sp = p * 7.0 + vec2(t * 0.2, -t * 0.12);
    float n = hash(floor(sp));
    float d = length(fract(sp) - 0.5);
    spark = (1.0 - smoothstep(0.05, 0.14, d)) * step(0.92, n) * 0.35;

    float pulse = 0.9 + 0.1 * sin(t * 2.4);
    float goldAmt = swirl * hole * disk * pulse;
    float glow = pow(max(0.0, 1.0 - r * 1.4), 2.2) * 0.12 * hole;

    vec3 col = mix(uGold, uHighlight, clamp(swirl * 0.45 + spark, 0.0, 1.0));

    float alpha = (goldAmt + glow + spark * 0.4) * uOpacity * disk;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function makeSwirlMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uGold: { value: new THREE.Color(0xe8b423) },
      uHighlight: { value: new THREE.Color(0xfff4b0) },
      uTime: { value: 0 },
      uOpacity: { value: 0.42 },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function makeSelectSwirlMesh(size = 2.4): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), makeSwirlMaterial());
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.026;
  mesh.renderOrder = 2;
  mesh.name = "selectRing";
  mesh.raycast = () => {};
  mesh.visible = false;
  return mesh;
}
