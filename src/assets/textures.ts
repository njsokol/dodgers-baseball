import * as THREE from "three";
import { asset } from "./url";

const loader = new THREE.TextureLoader();

function repeating(url: string, repeat: number): THREE.Texture {
  const tex = loader.load(url);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  return tex;
}

function once(url: string): THREE.Texture {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export const maps = {
  grass: repeating(asset("textures/grass.jpg"), 48),
  dirt: repeating(asset("textures/dirt.jpg"), 10),
  wood: repeating(asset("textures/wood.jpg"), 4),
  sky: once(asset("textures/sky.jpg")),
  stands: once(asset("textures/stadium-stands.jpg")),
  wall: once(asset("textures/outfield-wall.jpg")),
};

export function dirtMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map: maps.dirt, color: 0xffffff });
}

export function woodMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map: maps.wood, color: 0xffffff });
}
