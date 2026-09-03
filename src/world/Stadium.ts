import * as THREE from "three";
import { maps, dirtMaterial, woodMaterial } from "../assets/textures";
import { buildFencePolygon } from "./bounds";
import { BASES, BASE_SIZE, DUGOUT_AWAY, DUGOUT_HOME, FENCE_RADIUS, HOME, MOUND } from "./fieldLayout";
import {
  chalkLine,
  dirtInfield,
  diamondGrass,
  fieldFan,
  meshFromShape,
  pitchersLane,
  polar,
} from "./fieldShapes";

function lambert(color: number, opts?: { map?: THREE.Texture }) {
  return new THREE.MeshLambertMaterial({ color, map: opts?.map, side: THREE.DoubleSide });
}

function box(
  w: number,
  h: number,
  d: number,
  color: number,
  x: number,
  y: number,
  z: number,
  yaw = 0,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), lambert(color));
  m.position.set(x, y, z);
  m.rotation.y = yaw;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export class Stadium {
  readonly group = new THREE.Group();
  readonly fencePoly = buildFencePolygon();

  constructor() {
    this.addGround();
    this.addField();
    this.addWall();
    this.addFoulPoles();
    this.addDugouts();
    this.addBackdrop();
    this.addLights();
    this.addTrees();
  }

  private addGround() {
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(420, 48),
      new THREE.MeshLambertMaterial({ map: maps.grass, color: 0x7ec86a }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = -0.45;
    pad.receiveShadow = true;
    this.group.add(pad);
  }

  private addField() {
    const warning = meshFromShape(fieldFan(FENCE_RADIUS + 1, 12, 26), 0xffffff, 0.01);
    (warning.material as THREE.MeshLambertMaterial).map = maps.dirt;
    (warning.material as THREE.MeshLambertMaterial).color.set(0xe8c090);
    this.group.add(warning);

    const grass = meshFromShape(fieldFan(FENCE_RADIUS - 6, 10, 24), 0xffffff, 0.03);
    (grass.material as THREE.MeshLambertMaterial).map = maps.grass;
    (grass.material as THREE.MeshLambertMaterial).color.set(0x9fd86a);
    this.group.add(grass);

    const dirt = meshFromShape(dirtInfield(), 0xffffff, 0.05);
    (dirt.material as THREE.MeshLambertMaterial).map = maps.dirt;
    (dirt.material as THREE.MeshLambertMaterial).color.set(0xf3d7a8);
    this.group.add(dirt);

    const inner = meshFromShape(diamondGrass(), 0xffffff, 0.06);
    (inner.material as THREE.MeshLambertMaterial).map = maps.grass;
    (inner.material as THREE.MeshLambertMaterial).color.set(0x8fd45c);
    this.group.add(inner);

    const lane = meshFromShape(pitchersLane(), 0xffffff, 0.07);
    (lane.material as THREE.MeshLambertMaterial).map = maps.dirt;
    (lane.material as THREE.MeshLambertMaterial).color.set(0xf3d7a8);
    this.group.add(lane);

    const moundPad = new THREE.Mesh(new THREE.CircleGeometry(13, 20), dirtMaterial());
    moundPad.rotation.x = -Math.PI / 2;
    moundPad.position.set(MOUND.x, 0.08, MOUND.z);
    moundPad.receiveShadow = true;
    this.group.add(moundPad);

    const mound = new THREE.Mesh(new THREE.CircleGeometry(9.5, 20), dirtMaterial());
    mound.rotation.x = -Math.PI / 2;
    mound.position.set(MOUND.x, 0.09, MOUND.z);
    mound.receiveShadow = true;
    this.group.add(mound);
    const rubber = box(1.8, 0.08, 0.45, 0xf4f4f4, MOUND.x, 0.14, MOUND.z);
    this.group.add(rubber);

    const homeDirt = new THREE.Mesh(new THREE.CircleGeometry(16, 22), dirtMaterial());
    homeDirt.rotation.x = -Math.PI / 2;
    homeDirt.position.set(HOME.x, 0.08, HOME.z + 1.5);
    homeDirt.receiveShadow = true;
    this.group.add(homeDirt);

    for (const x of [-4.6, 4.6]) {
      const boxPad = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 6.2), dirtMaterial());
      boxPad.rotation.x = -Math.PI / 2;
      boxPad.position.set(x, 0.085, -2.4);
      boxPad.receiveShadow = true;
      this.group.add(boxPad);
    }

    const rf = polar(FENCE_RADIUS, Math.PI / 4);
    const lf = polar(FENCE_RADIUS, -Math.PI / 4);
    this.group.add(chalkLine(HOME, rf, 0.7, 0.09));
    this.group.add(chalkLine(HOME, lf, 0.7, 0.09));

    for (const id of ["1B", "2B", "3B"] as const) {
      const p = BASES[id];
      const bag = box(BASE_SIZE, 0.28, BASE_SIZE, 0xf8f4ea, p.x, 0.18, p.z, Math.PI / 4);
      this.group.add(bag);
    }

    const s = BASE_SIZE * 1.5;
    const plateShape = new THREE.Shape();
    plateShape.moveTo(0, -s / 2);
    plateShape.lineTo(s / 2, 0);
    plateShape.lineTo(s / 2, s / 2);
    plateShape.lineTo(-s / 2, s / 2);
    plateShape.lineTo(-s / 2, 0);
    const plate = new THREE.Mesh(
      new THREE.ShapeGeometry(plateShape),
      lambert(0xf8f4ea),
    );
    plate.rotation.x = -Math.PI / 2;
    plate.position.set(HOME.x, 0.18, HOME.z);
    this.group.add(plate);
  }

  private addWall() {
    maps.wall.wrapS = THREE.RepeatWrapping;
    maps.wall.repeat.set(2.2, 1);
    const wallH = 12;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(
        FENCE_RADIUS + 0.6,
        FENCE_RADIUS + 0.6,
        wallH,
        36,
        1,
        true,
        (3 * Math.PI) / 4,
        Math.PI / 2,
      ),
      new THREE.MeshBasicMaterial({
        map: maps.wall,
        side: THREE.DoubleSide,
      }),
    );
    wall.scale.x = -1;
    wall.position.y = wallH / 2;
    this.group.add(wall);

    const rail = new THREE.Mesh(
      new THREE.CylinderGeometry(
        FENCE_RADIUS + 1.1,
        FENCE_RADIUS + 1.1,
        0.7,
        36,
        1,
        true,
        (3 * Math.PI) / 4,
        Math.PI / 2,
      ),
      lambert(0xf2d04a),
    );
    rail.scale.x = -1;
    rail.position.y = wallH + 0.2;
    this.group.add(rail);
  }

  private addFoulPoles() {
    for (const theta of [Math.PI / 4, -Math.PI / 4]) {
      const p = polar(FENCE_RADIUS + 1, theta);
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.55, 0.55, 42, 8),
        lambert(0xffe14a),
      );
      pole.position.set(p.x, 21, p.z);
      pole.castShadow = true;
      this.group.add(pole);
      const screen = box(0.2, 18, 6, 0xffe14a, p.x, 28, p.z, theta);
      (screen.material as THREE.MeshLambertMaterial).transparent = true;
      (screen.material as THREE.MeshLambertMaterial).opacity = 0.35;
      this.group.add(screen);
    }
  }

  private addDugouts() {
    const make = (x: number, z: number, yaw: number) => {
      const g = new THREE.Group();
      const bench = new THREE.Mesh(new THREE.BoxGeometry(22, 3.2, 7), woodMaterial());
      bench.position.y = 1.6;
      bench.castShadow = true;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(24, 0.6, 9), lambert(0x3d6ea8));
      roof.position.set(0, 5.2, -0.4);
      const rail = box(22, 1.1, 0.5, 0xf2d04a, 0, 3.4, 3.4);
      g.add(bench, roof, rail);
      g.position.set(x, 0, z);
      g.rotation.y = yaw;
      this.group.add(g);
    };
    make(DUGOUT_HOME.x, DUGOUT_HOME.z, -0.55 + Math.PI / 2 - Math.PI / 12);
    make(DUGOUT_AWAY.x, DUGOUT_AWAY.z, 0.55 + Math.PI / 2 + Math.PI / 12);
  }

  private addBackdrop() {
    const tex = maps.stands;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.offset.set(0, 0.4);
    tex.repeat.set(1, 0.6);

    const wallTop = 12.4;
    const height = 52;
    const radius = FENCE_RADIUS + 3.5;
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      fog: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(
      new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        24,
        1,
        true,
        (3 * Math.PI) / 4,
        Math.PI / 2,
      ),
      mat,
    );
    ring.scale.x = -1;
    ring.position.y = wallTop + height / 2;
    this.group.add(ring);
  }

  private addLights() {
    const tower = (x: number, z: number) => {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 62, 8), lambert(0x3a4250));
      pole.position.y = 31;
      pole.castShadow = true;
      g.add(pole);
      const head = box(14, 8, 4, 0x2a3038, 0, 62, 0);
      g.add(head);
      for (let i = 0; i < 6; i++) {
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.3, 8, 8), lambert(0xfff1a8));
        (lamp.material as THREE.MeshLambertMaterial).emissive = new THREE.Color(0xffe28a);
        (lamp.material as THREE.MeshLambertMaterial).emissiveIntensity = 0.8;
        lamp.position.set(-4.5 + (i % 3) * 4.5, 62 + (i < 3 ? 1.6 : -1.6), 1.6);
        g.add(lamp);
      }
      g.position.set(x, 0, z);
      this.group.add(g);
    };
    const lf = polar(FENCE_RADIUS + 8, -0.62);
    const rf = polar(FENCE_RADIUS + 8, 0.62);
    tower(lf.x, lf.z);
    tower(rf.x, rf.z);
  }

  private addTrees() {
    const tree = (x: number, z: number, s: number) => {
      const g = new THREE.Group();
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1 * s, 1.5 * s, 8 * s, 6),
        lambert(0x8b5a2b),
      );
      trunk.position.y = 4 * s;
      trunk.castShadow = true;
      const leaves = new THREE.Mesh(new THREE.IcosahedronGeometry(6.2 * s, 1), lambert(0x3fa34d));
      leaves.position.y = 11 * s;
      leaves.castShadow = true;
      g.add(trunk, leaves);
      g.position.set(x, 0, z);
      this.group.add(g);
    };
    const spots = [
      [188, 14, 1.05],
      [198, -40, 0.9],
      [-188, 14, 1.1],
      [-198, -40, 0.9],
    ] as const;
    for (const [x, z, s] of spots) tree(x, z, s);
  }
}
