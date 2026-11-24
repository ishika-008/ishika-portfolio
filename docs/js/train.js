import * as THREE from 'three';
import { RoundedBoxGeometry } from '../vendor/RoundedBoxGeometry.js';

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0, ...extra });
const M = {
  blue: mat(0x2447a8),
  chalk: mat(0xeef1ec),
  ink: mat(0x0e1230),
  roof: mat(0x9fb0e0),
  lit: mat(0xf6b900, { emissive: 0xf6b900, emissiveIntensity: 0.35 }),
  signal: mat(0xf6b900),
  vermilion: mat(0xe4472b),
};

const H = 1.5;
const W = 1.25;
const FLOOR = 0.55;
const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.1, 10);
wheelGeo.rotateX(Math.PI / 2);

function add(g, geo, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function car(len, loco) {
  const g = new THREE.Group();
  add(g, new RoundedBoxGeometry(len, H, W, 3, 0.16), M.blue, 0, FLOOR + H / 2, 0);
  add(g, new THREE.BoxGeometry(len + 0.02, 0.26, W + 0.02), M.chalk, 0, FLOOR + 0.45, 0, false);
  add(g, new THREE.BoxGeometry(len - 0.3, 0.08, W * 0.72), M.roof, 0, FLOOR + H + 0.04, 0);
  // window strip with lit panes
  const stripLen = loco ? len * 0.5 : len * 0.86;
  const sx = loco ? -len * 0.18 : 0;
  add(g, new THREE.BoxGeometry(stripLen, 0.4, W + 0.03), M.ink, sx, FLOOR + 1.02, 0, false);
  const panes = Math.floor(stripLen / 0.62);
  const gap = stripLen / panes;
  for (let i = 0; i < panes; i++) {
    const x = sx - stripLen / 2 + gap * (i + 0.5);
    add(g, new THREE.BoxGeometry(gap * 0.62, 0.28, W + 0.045), M.lit, x, FLOOR + 1.02, 0, false);
  }
  // bogies
  add(g, new THREE.BoxGeometry(len * 0.64, 0.26, 0.86), M.ink, 0, 0.36, 0);
  for (const wx of [-len * 0.24, len * 0.24]) {
    for (const wz of [-0.48, 0.48]) add(g, wheelGeo, M.ink, wx, 0.28, wz, false);
  }
  if (loco) {
    add(g, new THREE.BoxGeometry(0.07, 0.92, W * 0.84), M.signal, len / 2 + 0.005, FLOOR + 0.78, 0, false);
    add(g, new THREE.BoxGeometry(len - 0.5, 0.1, W * 0.5), M.vermilion, 0, FLOOR + H + 0.1, 0, false);
  }
  return g;
}

export const TRAIN_LENGTH = 3.6 + 3 * (3.8 + 0.25);

/** Returns cars with the distance from the head's nose to the car centre. */
export function makeTrain() {
  const cars = [];
  let d = 0;
  const specs = [[3.6, true], [3.8, false], [3.8, false], [3.8, false]];
  specs.forEach(([len, loco], i) => {
    const g = car(len, loco);
    cars.push({ obj: g, dist: d + len / 2 });
    d += len + 0.25;
  });
  return cars;
}
