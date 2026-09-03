import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { asset } from "../assets/url";
import { HOME, SECOND } from "./fieldLayout";

const TARGET_HOME_TO_SECOND = Math.hypot(SECOND.x - HOME.x, SECOND.z - HOME.z);

function lambertFrom(mat: THREE.Material): THREE.MeshLambertMaterial {
  const src = mat as THREE.MeshStandardMaterial;
  return new THREE.MeshLambertMaterial({
    color: src.color?.clone() ?? new THREE.Color(0xffffff),
    side: THREE.DoubleSide,
  });
}

function xzCorners(box: THREE.Box3): THREE.Vector3[] {
  return [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
  ];
}

export async function loadTikoField(): Promise<THREE.Group> {
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(asset("models/baseball-field/scene.gltf"));
  const model = gltf.scene;
  model.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.receiveShadow = true;
      obj.castShadow = false;
      if (Array.isArray(obj.material)) {
        obj.material = obj.material.map(lambertFrom);
      } else {
        obj.material = lambertFrom(obj.material);
      }
    }
  });

  model.updateMatrixWorld(true);
  const fieldBox = new THREE.Box3().setFromObject(model);
  const basesObj =
    model.getObjectByName("Bases") ?? model.getObjectByName("Bases_White_0") ?? model;
  const basesBox = new THREE.Box3().setFromObject(basesObj);

  const bCorners = xzCorners(basesBox);
  const fCorners = xzCorners(fieldBox);
  let home = bCorners[0];
  let best = Infinity;
  for (const c of bCorners) {
    for (const f of fCorners) {
      const d = c.distanceTo(f);
      if (d < best) {
        best = d;
        home = c;
      }
    }
  }
  const second = bCorners.reduce((acc, c) =>
    c.distanceTo(home) > acc.distanceTo(home) ? c : acc,
  );

  const toSecond = second.clone().sub(home);
  const dist = Math.hypot(toSecond.x, toSecond.z) || 1;
  const scale = (TARGET_HOME_TO_SECOND / dist) * 1.06;
  const fieldCenter = fieldBox.getCenter(new THREE.Vector3());
  const toOutfield = new THREE.Vector3(fieldCenter.x - home.x, 0, fieldCenter.z - home.z);
  const yaw = Math.atan2(toOutfield.x, -toOutfield.z) - Math.PI / 4;

  const T = new THREE.Matrix4().makeTranslation(-home.x, -home.y, -home.z);
  const R = new THREE.Matrix4().makeRotationY(yaw);
  const S = new THREE.Matrix4().makeScale(scale, scale, scale);
  const M = new THREE.Matrix4().multiplyMatrices(S, R).multiply(T);
  model.applyMatrix4(M);
  model.updateMatrixWorld(true);

  const wrap = new THREE.Group();
  wrap.add(model);
  return wrap;
}
