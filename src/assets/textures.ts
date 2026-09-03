import * as THREE from "three";

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
  grass: repeating("/textures/grass.jpg", 48),
  dirt: repeating("/textures/dirt.jpg", 10),
  wood: repeating("/textures/wood.jpg", 4),
  sky: once("/textures/sky.jpg"),
  stands: once("/textures/stadium-stands.jpg"),
  wall: once("/textures/outfield-wall.jpg"),
};

export function dirtMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map: maps.dirt, color: 0xffffff });
}

export function woodMaterial(): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ map: maps.wood, color: 0xffffff });
}
