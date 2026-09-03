import * as THREE from "three";
import { CATCH_RADIUS, COLORS } from "../world/fieldLayout";
import { makeRingMesh } from "../shaders/ring";
import { makeSelectSwirlMesh } from "../shaders/swirl";

/** Kid mesh world scale — keep catch ring sized in local units. */
const KID_SCALE = 3.45;
const CATCH_RING_OUTER = 0.95;
const CATCH_RING_SIZE = (CATCH_RADIUS * 2) / (KID_SCALE * CATCH_RING_OUTER);

function lambert(color: number) {
  return new THREE.MeshLambertMaterial({ color });
}

function faceted(radius: number, detail = 1) {
  return new THREE.IcosahedronGeometry(radius, detail);
}

function makeFace(head: THREE.Group) {
  const eyeMat = lambert(0x1a1a1a);
  const eye = (x: number) => {
    const m = new THREE.Mesh(faceted(0.11, 1), eyeMat);
    m.position.set(x, 0.08, 0.58);
    m.castShadow = true;
    return m;
  };
  const blushMat = lambert(0xf4a0a0);
  const blush = (x: number) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(0.12, 8), blushMat);
    m.position.set(x, -0.12, 0.62);
    return m;
  };
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.16, 0.035, 6, 10, Math.PI),
    lambert(0x8a3a3a),
  );
  smile.position.set(0, -0.22, 0.6);
  smile.rotation.set(0.15, 0, Math.PI);
  head.add(eye(-0.22), eye(0.22), blush(-0.38), blush(0.38), smile);
}

function makeBadge(label: string, y: number) {
  const wrap = new THREE.Group();
  wrap.name = "badge";
  if (typeof document === "undefined") return wrap;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return wrap;
  ctx.clearRect(0, 0, 64, 64);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 36px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 32, 34);
  const tex = new THREE.CanvasTexture(canvas);
  const back = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 16),
    new THREE.MeshBasicMaterial({ color: 0x123a6b, depthTest: false }),
  );
  back.name = "badgeBack";
  const letter = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 1.0),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false }),
  );
  letter.name = "badgeLetter";
  letter.position.z = 0.02;
  wrap.add(back, letter);
  wrap.position.set(0, y, 0);
  wrap.renderOrder = 4;
  return wrap;
}

export function makeKidMesh(opts: {
  label: string;
  team: "home" | "away";
  catchRing?: boolean;
  isBatter?: boolean;
}): THREE.Group {
  const home = opts.team === "home";
  const jersey = lambert(home ? 0x1e6fd9 : 0xef3e42);
  const pants = lambert(COLORS.white);
  const cap = lambert(home ? 0x1a4e9c : 0xef3e42);
  const brim = lambert(home ? 0xf4f4f4 : 0x9e1111);
  const skin = lambert(0xffc89a);
  const hair = lambert(0x5a3a28);
  const shoe = lambert(0x1c1c1c);
  const trim = lambert(0xffffff);

  const g = new THREE.Group();
  const body = new THREE.Group();
  body.name = "body";

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.62, 0.85, 3, 8), jersey);
  torso.position.y = 1.55;
  torso.castShadow = true;

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 6, 12), trim);
  collar.position.y = 2.12;
  collar.rotation.x = Math.PI / 2;

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), jersey);
  stripe.position.set(0.58, 0.85, 0);

  const leg = (x: number) => {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.55, 3, 6), pants);
    m.position.set(x, 0.62, 0);
    m.castShadow = true;
    return m;
  };
  const foot = (x: number) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.62), shoe);
    m.position.set(x, 0.14, 0.08);
    m.castShadow = true;
    return m;
  };

  const arm = (x: number, name: string) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.95, 0);
    pivot.name = name;
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 3, 6), jersey);
    m.position.set(0, -0.45, 0);
    m.castShadow = true;
    const hand = new THREE.Mesh(faceted(0.18, 1), skin);
    hand.position.set(0, -0.9, 0);
    pivot.add(m, hand);
    return pivot;
  };

  const head = new THREE.Group();
  head.position.y = 2.72;
  head.rotation.x = -0.42;
  const skull = new THREE.Mesh(faceted(0.72, 2), skin);
  skull.scale.set(1, 0.95, 1.02);
  skull.castShadow = true;
  const hairMesh = new THREE.Mesh(faceted(0.74, 1), hair);
  hairMesh.position.set(0, 0.02, -0.12);
  hairMesh.scale.set(1, 0.7, 0.85);
  const capMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(home ? 0.74 : 0.8, home ? 0.82 : 0.9, home ? 0.46 : 0.54, home ? 8 : 12),
    cap,
  );
  capMesh.position.y = home ? 0.48 : 0.52;
  capMesh.castShadow = true;
  const brimMesh = new THREE.Mesh(
    new THREE.BoxGeometry(home ? 0.78 : 0.9, home ? 0.08 : 0.12, home ? 0.72 : 0.78),
    brim,
  );
  brimMesh.position.set(0, home ? 0.32 : 0.28, home ? 0.5 : 0.55);
  const helmetGuard = home
    ? null
    : (() => {
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.18), lambert(0xb11414));
        guard.position.set(0, 0.18, 0.74);
        guard.castShadow = true;
        return guard;
      })();
  const cheekGuardLeft = home
    ? null
    : (() => {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.42), lambert(0x8a1212));
        strap.position.set(-0.42, 0.12, 0.58);
        strap.rotation.z = 0.35;
        return strap;
      })();
  const cheekGuardRight = home
    ? null
    : (() => {
        const strap = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.42), lambert(0x8a1212));
        strap.position.set(0.42, 0.12, 0.58);
        strap.rotation.z = -0.35;
        return strap;
      })();
  makeFace(head);
  head.add(
    hairMesh,
    skull,
    capMesh,
    brimMesh,
    ...(helmetGuard ? [helmetGuard] : []),
    ...(cheekGuardLeft ? [cheekGuardLeft] : []),
    ...(cheekGuardRight ? [cheekGuardRight] : []),
  );

  const leftArm = arm(-0.78, "leftArm");
  const rightArm = arm(0.78, "rightArm");

  body.add(
    torso,
    collar,
    stripe,
    leg(-0.28),
    leg(0.28),
    foot(-0.28),
    foot(0.28),
    leftArm,
    rightArm,
    head,
  );

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.85, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  shadow.raycast = () => {};

  const catchRing = makeRingMesh(CATCH_RING_SIZE, 0xffe14a);
  catchRing.name = "catchRing";
  catchRing.raycast = () => {};
  catchRing.visible = false;
  const catchMat = catchRing.material as THREE.ShaderMaterial;
  catchMat.uniforms.uOpacity.value = 0.95;
  catchMat.uniforms.uInner.value = 0.78;
  catchMat.uniforms.uOuter.value = CATCH_RING_OUTER;

  const swirl = makeSelectSwirlMesh(2.2);
  swirl.name = "selectSwirl";

  const pick = new THREE.Mesh(
    new THREE.SphereGeometry(2.4, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  pick.position.y = 1.3;
  pick.name = "pick";

  const badge = opts.label ? makeBadge(opts.label, 3.85) : null;
  g.add(shadow, body, ...(badge ? [badge] : []), catchRing, swirl, pick);
  g.userData.bob = 0;
  g.scale.setScalar(KID_SCALE);
  return g;
}

export function setKidSelected(group: THREE.Group, selected: boolean) {
  const swirl = group.getObjectByName("selectSwirl") as THREE.Mesh | undefined;
  if (swirl) swirl.visible = selected;
  const ring = group.getObjectByName("catchRing") as THREE.Mesh | undefined;
  if (ring) ring.visible = selected;
}

export function resetKidFx(group: THREE.Group) {
  setKidSelected(group, false);
  setKidHovered(group, false);
}

export function setKidHovered(group: THREE.Group, hovered: boolean) {
  const ring = group.getObjectByName("catchRing") as THREE.Mesh | undefined;
  const mat = ring?.material as THREE.ShaderMaterial | undefined;
  if (mat?.uniforms.uHover) mat.uniforms.uHover.value = hovered ? 1 : 0;
}

export function triggerBatSwing(group: THREE.Group) {
  void group;
}

export function bobKid(group: THREE.Group, moving: boolean, dt: number) {
  const speed = moving ? 14 : 0;
  group.userData.bob = (group.userData.bob as number) + dt * speed;
  const t = group.userData.bob as number;
  const bounce = moving ? Math.abs(Math.sin(t)) * 0.08 : 0;
  const body = group.getObjectByName("body");
  if (body) body.position.y = bounce;
  const left = group.getObjectByName("leftArm");
  const right = group.getObjectByName("rightArm");
  const swing = moving ? Math.sin(t) * 0.18 : 0;
  if (left) left.rotation.x = swing;
  if (right) right.rotation.x = -swing;
}

export function faceCamera(group: THREE.Group, camera: THREE.Camera) {
  const badge = group.getObjectByName("badge");
  if (badge) badge.lookAt(camera.position);
}
