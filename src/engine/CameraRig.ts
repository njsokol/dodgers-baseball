import * as THREE from "three";
import { VIEW_ASPECT } from "./view";

export class CameraRig {
  readonly camera: THREE.OrthographicCamera;

  constructor() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 1600);
    this.camera.position.set(0, 132, 48);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(0, 1, -82);
    this.resize();
  }

  resize() {
    const h = 128;
    const w = h * VIEW_ASPECT;
    this.camera.left = -w / 2;
    this.camera.right = w / 2;
    this.camera.top = h / 2;
    this.camera.bottom = -h / 2;
    this.camera.updateProjectionMatrix();
  }
}
