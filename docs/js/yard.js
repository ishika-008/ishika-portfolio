import * as THREE from 'three';
import { clamp, lerp, smoothstep, mulberry32 } from './util.js';
import { labelSprite, signBoard } from './signs.js';

/*
  The ETL project as a working rail yard, in a local frame:
  +x runs along the main line, +z is away from the camera side.
  Excel and MySQL feeder lines merge, pass a Transform gantry, and end at a
  PostgreSQL depot. Power BI towers rise behind it. Scroll phase 0..1 drives it.
*/

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, metalness: 0, ...extra });
const M = {
  ballast: mat(0x2e3570),
  rail: mat(0xd7dcef),
  sleeper: mat(0x1a1d44),
  ink: mat(0x0e1230),
  chalk: mat(0xeef1ec),
  blue: mat(0x2447a8),
  signal: mat(0xf6b900),
  vermilion: mat(0xe4472b),
  steel: mat(0x3a4a96),
};

const PATH_A = [[-46, 21], [-14, 21], [-8.5, 18.4], [-5.5, 16], [10, 16]];
const PATH_B = [[-46, 11], [-14, 11], [-8.5, 13.6], [-5.5, 16], [10, 16]];
const GANTRY_X = -1.2;
const DEPOT_X = 10;

function polyline(points) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    segs.push({ a, b, len, start: total, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) });
    total += len;
  }
  return { points, segs, total };
}

function evalPath(path, d) {
  const s = path.segs;
  if (d <= 0) {
    const f = s[0];
    const dx = (f.b[0] - f.a[0]) / f.len, dz = (f.b[1] - f.a[1]) / f.len;
    return { x: f.a[0] + dx * d, z: f.a[1] + dz * d, ang: f.ang };
  }
  for (const seg of s) {
    if (d <= seg.start + seg.len) {
      const t = (d - seg.start) / seg.len;
      return { x: lerp(seg.a[0], seg.b[0], t), z: lerp(seg.a[1], seg.b[1], t), ang: seg.ang };
    }
  }
  const l = s[s.length - 1];
  return { x: l.b[0], z: l.b[1], ang: l.ang };
}

function addTrack(group, path) {
  const sleepers = [];
  for (const seg of path.segs) {
    const cx = (seg.a[0] + seg.b[0]) / 2, cz = (seg.a[1] + seg.b[1]) / 2;
    const holder = new THREE.Group();
    holder.position.set(cx, 0, cz);
    holder.rotation.y = -seg.ang;
    const ballast = new THREE.Mesh(new THREE.BoxGeometry(seg.len + 0.3, 0.14, 2.3), M.ballast);
    ballast.position.y = 0.07;
    ballast.receiveShadow = true;
    ballast.castShadow = true;
    holder.add(ballast);
    for (const z of [-0.45, 0.45]) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(seg.len + 0.3, 0.14, 0.09), M.rail);
      r.position.set(0, 0.2, z);
      r.castShadow = true;
      holder.add(r);
    }
    group.add(holder);
    for (let d = 0.4; d < seg.len; d += 0.8) {
      const t = d / seg.len;
      sleepers.push({ x: lerp(seg.a[0], seg.b[0], t), z: lerp(seg.a[1], seg.b[1], t), ang: seg.ang });
    }
  }
  const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.08, 1.9), M.sleeper, sleepers.length);
  const o = new THREE.Object3D();
  sleepers.forEach((s, i) => {
    o.position.set(s.x, 0.17, s.z);
    o.rotation.set(0, -s.ang, 0);
    o.updateMatrix();
    inst.setMatrixAt(i, o.matrix);
  });
  inst.receiveShadow = true;
  group.add(inst);
}

function box(g, w, h, d, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

export function buildYard() {
  const group = new THREE.Group();
  const pathA = polyline(PATH_A);
  const pathB = polyline(PATH_B);
  addTrack(group, pathA);
  addTrack(group, pathB);

  // sources
  for (const [z, label, color] of [[21, 'EXCEL', M.chalk], [11, 'MYSQL', M.chalk]]) {
    box(group, 3.2, 1.6, 2.6, color, -17.5, 0.8, z + (z > 16 ? 3.6 : -3.6));
    const s = labelSprite(label, 3.4, 0.9);
    s.position.set(-17.5, 2.6, z + (z > 16 ? 3.6 : -3.6));
    group.add(s);
  }

  // gantry over the common line
  const gx = GANTRY_X;
  for (const z of [14.3, 17.7]) box(group, 0.28, 3.4, 0.28, M.steel, gx, 1.7, z);
  box(group, 0.4, 0.36, 3.9, M.steel, gx, 3.45, 16);
  box(group, 0.2, 0.2, 3.5, M.vermilion, gx, 3.8, 16);
  const tBoard = signBoard('TRANSFORM', 4.4, 1.1);
  tBoard.position.set(gx, 4.9, 16);
  group.add(tBoard);
  const pyLabel = labelSprite('PYTHON', 2.4, 0.7);
  pyLabel.position.set(gx, 6.0, 16);
  group.add(pyLabel);

  // depot: stacked discs, a database
  const depot = new THREE.Group();
  depot.position.set(DEPOT_X + 3.6, 0, 16);
  for (let i = 0; i < 3; i++) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.95, 24), i === 1 ? M.signal : M.blue);
    d.position.y = 0.6 + i * 1.05;
    d.castShadow = true;
    d.receiveShadow = true;
    depot.add(d);
  }
  group.add(depot);
  const dLabel = labelSprite('POSTGRESQL', 4.6, 1.0);
  dLabel.position.set(DEPOT_X + 3.6, 4.9, 16);
  group.add(dLabel);

  // Power BI towers
  const towers = [];
  const towerSpec = [
    { x: 8, z: 26.5, label: 'MONTHLY REVENUE', bars: [0.45, 0.62, 0.55, 0.85, 1] },
    { x: 14.5, z: 26.5, label: 'TOP CUSTOMERS', bars: [1, 0.78, 0.6, 0.44, 0.3] },
    { x: 21, z: 26.5, label: 'SALES BY REGION', bars: [0.7, 1, 0.52, 0.82] },
  ];
  for (const t of towerSpec) {
    const g = new THREE.Group();
    g.position.set(t.x, 0, t.z);
    box(g, 4.8, 0.5, 2.6, M.ink, 0, 0.25, 0);
    box(g, 4.4, 4.3, 0.3, M.chalk, 0, 2.65, 0.6);
    const bars = [];
    const n = t.bars.length;
    t.bars.forEach((h, i) => {
      const w = 3.6 / n;
      const b = box(g, w * 0.72, 3.4 * h, 0.5, i % 2 ? M.blue : M.signal, -1.8 + w * (i + 0.5), 0.5, 0.35);
      b.geometry.translate(0, 3.4 * h / 2, 0);
      b.position.y = 0.5;
      bars.push({ mesh: b });
    });
    towers.push({ bars });
    group.add(g);
    const l = labelSprite(t.label, 5.0, 1.0);
    l.position.set(t.x, 6.3, t.z + 0.4);
    group.add(l);
  }

  // cargo
  const N = 24;
  const rng = mulberry32(7);
  const RAW = [0xa3a3ad, 0xb98b72, 0x8d9bb5, 0xc9b25e, 0xa98ab4, 0x9bb5a6];
  const CLEAN = new THREE.Color(0x2447a8);
  const cargo = [];
  const dups = new Set([3, 8, 13, 18, 21]);
  for (let k = 0; k < N; k++) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 1.1), M.sleeper);
    base.position.y = 0.34;
    base.castShadow = true;
    g.add(base);
    const raw = new THREE.Color(RAW[Math.floor(rng() * RAW.length)]);
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.86, 0.86), new THREE.MeshStandardMaterial({ color: raw, roughness: 0.9 }));
    cube.position.y = 0.84;
    cube.castShadow = true;
    cube.receiveShadow = true;
    g.add(cube);
    group.add(g);
    cargo.push({ g, cube, raw, tilt: (rng() - 0.5) * 0.9, lean: (rng() - 0.5) * 0.35, dup: dups.has(k), path: k % 2 ? pathB : pathA, order: k >> 1 });
  }
  const SP = 2.7;
  const D0 = 24;
  const D1 = pathA.total + 11 * SP + 1;
  const gantryD = pathA.segs[0].len + pathA.segs[1].len + pathA.segs[2].len + (GANTRY_X + 5.5);

  const tmpCol = new THREE.Color();
  function update(phase) {
    const p = clamp(phase);
    const baseD = lerp(D0, D1, p);
    for (const c of cargo) {
      const d = baseD - c.order * SP;
      const pos = evalPath(c.path, d);
      c.g.position.set(pos.x, 0, pos.z);
      c.g.rotation.y = -pos.ang;
      const clean = smoothstep(gantryD - 1.4, gantryD + 1.4, d);
      tmpCol.copy(c.raw).lerp(CLEAN, clean);
      c.cube.material.color.copy(tmpCol);
      c.cube.rotation.set(c.lean * (1 - clean), c.tilt * (1 - clean), 0);
      const enter = 1 - smoothstep(c.path.total - 2.4, c.path.total, d);
      const dupFade = c.dup ? 1 - clean : 1;
      const s = Math.max(0.0001, Math.min(enter, dupFade));
      c.g.scale.setScalar(s);
      c.g.visible = d > -60;
    }
    const q = smoothstep(0.5, 1, p);
    towers.forEach((t, ti) => {
      t.bars.forEach((b, bi) => {
        const local = clamp(q * 1.6 - (ti * 0.12 + bi * 0.08));
        b.mesh.scale.y = Math.max(0.04, local);
      });
    });
  }
  update(0);
  return { group, update };
}
