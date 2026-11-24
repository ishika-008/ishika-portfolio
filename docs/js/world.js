import * as THREE from 'three';
import { mulberry32, clamp, smoothstep } from './util.js';
import { signBoard } from './signs.js';
import { buildYard } from './yard.js';
import { makeTrain } from './train.js';

export const STATIONS = [
  { id: 'top', u: 0.085, name: 'ISHIKA CHOWDHURY', kind: 'hero' },
  { id: 'school', u: 0.2, name: 'BURDWAN', kind: 'school' },
  { id: 'college', u: 0.33, name: 'BANGALORE', kind: 'college' },
  { id: 'internship', u: 0.46, name: 'INTERNSHIP', kind: 'internship' },
  { id: 'project', u: 0.59, name: 'ETL YARD', kind: 'project' },
  { id: 'skills', u: 0.74, name: 'SKILLS', kind: 'skills' },
  { id: 'interests', u: 0.86, name: 'OFF DUTY', kind: 'interests' },
  { id: 'contact', u: 0.955, name: 'CONTACT', kind: 'contact' },
];

const UP = new THREE.Vector3(0, 1, 0);
const NOSE_OFFSET = 7.4; // train nose ahead of the station centre, in world units

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0, ...extra });
const M = {
  chalk: mat(0xeef1ec),
  ink: mat(0x0e1230),
  signal: mat(0xf6b900),
  vermilion: mat(0xe4472b),
  blue: mat(0x2447a8),
  ballast: mat(0x2e3570),
  rail: mat(0xd7dcef),
  sleeper: mat(0x1a1d44),
  ochre: mat(0xc9953a),
  lamp: mat(0xf6b900, { emissive: 0xf6b900, emissiveIntensity: 0.5 }),
  water: mat(0x5d86d6),
};

/* ---------- path ---------- */

function makeCurve() {
  const pts = [
    [-10, 0, 40], [0, 0, 0], [8, 0.2, -26], [30, 0.5, -56], [42, 0.9, -92], [30, 1.3, -124],
    [0, 1.8, -140], [-30, 2.2, -146], [-60, 2.4, -150], [-90, 2.6, -152], [-116, 3.0, -168],
    [-126, 3.4, -200], [-112, 3.8, -232], [-86, 4.0, -250], [-58, 4.1, -258],
  ].map((p) => new THREE.Vector3(...p));
  const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  c.arcLengthDivisions = 3000;
  return c;
}

function makeFrames(curve, step) {
  const L = curve.getLength();
  const n = Math.ceil(L / step);
  const frames = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const P = curve.getPointAt(u);
    const T = curve.getTangentAt(u);
    const Th = T.clone();
    Th.y = 0;
    Th.normalize();
    const N = new THREE.Vector3().crossVectors(Th, UP).normalize();
    frames.push({ P, T, Th, N });
  }
  return frames;
}

/* ---------- geometry helpers ---------- */

/** Prism following the path between lateral offsets lat0..lat1; top(u) is height above path y. */
function prism(frames, { lat0, lat1, bottom, top, stride = 2, u0 = 0, u1 = 1 }) {
  const n = frames.length - 1;
  const i0 = Math.floor(u0 * n);
  const i1 = Math.ceil(u1 * n);
  const rows = [];
  for (let i = i0; i <= i1; i += stride) {
    const k = Math.min(i, n);
    const f = frames[k];
    const h = top(k / n);
    rows.push({
      a: f.P.clone().addScaledVector(f.N, lat0),
      b: f.P.clone().addScaledVector(f.N, lat1),
      bot: f.P.y + bottom,
      top: f.P.y + h,
    });
  }
  const pos = [];
  const idx = [];
  let v = 0;
  const quad = (p0, p1, p2, p3) => {
    pos.push(...p0, ...p1, ...p2, ...p3);
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  };
  for (let i = 0; i < rows.length - 1; i++) {
    const r = rows[i], s = rows[i + 1];
    const A0 = [r.a.x, r.bot, r.a.z], B0 = [r.a.x, r.top, r.a.z], C0 = [r.b.x, r.top, r.b.z], D0 = [r.b.x, r.bot, r.b.z];
    const A1 = [s.a.x, s.bot, s.a.z], B1 = [s.a.x, s.top, s.a.z], C1 = [s.b.x, s.top, s.b.z], D1 = [s.b.x, s.bot, s.b.z];
    quad(A0, B0, B1, A1);
    quad(B0, C0, C1, B1);
    quad(C0, D0, D1, C1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function groundGeometry(frames, half, colorAt) {
  const pos = [];
  const col = [];
  const idx = [];
  const c = new THREE.Color();
  frames.forEach((f, i) => {
    const u = i / (frames.length - 1);
    c.set(colorAt(u));
    for (const lat of [-half, half]) {
      const p = f.P.clone().addScaledVector(f.N, lat);
      pos.push(p.x, f.P.y, p.z);
      col.push(c.r, c.g, c.b);
    }
    if (i > 0) {
      const a = (i - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function hipRoof(w, d, h, material) {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, 0.5, 0);
  const m = new THREE.Mesh(geo, material);
  m.scale.set(w, h, d);
  m.castShadow = true;
  return m;
}

function blk(g, w, h, d, material, x, y, z, shadow = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.castShadow = shadow;
  m.receiveShadow = true;
  g.add(m);
  return m;
}

function cyl(g, r, h, material, x, y, z, seg = 10) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), material);
  m.position.set(x, y, z);
  m.castShadow = true;
  g.add(m);
  return m;
}

function windowTexture(kind, seed) {
  const rng = mulberry32(seed);
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const x = c.getContext('2d');
  const light = kind === 'light';
  x.fillStyle = light ? '#f2f4fb' : '#2447a8';
  x.fillRect(0, 0, 256, 256);
  for (let r = 0; r < 8; r++) {
    for (let k = 0; k < 8; k++) {
      const lit = rng() < 0.3;
      x.fillStyle = lit ? '#f6b900' : light ? '#1b2a78' : '#0e1a55';
      x.fillRect(k * 32 + 6, r * 32 + 8, 20, 15);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function towerGeometry(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const cu = 8.8, cv = 11.2;
  // face order: +x, -x, +y, -y, +z, -z
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * dims[f][0] / cu, uv.getY(k) * dims[f][1] / cv);
    }
  }
  g.translate(0, h / 2, 0);
  return g;
}

/* ---------- world ---------- */

export function buildWorld({ scene, camera, shadowSize }) {
  const curve = makeCurve();
  const L = curve.getLength();
  const frames = makeFrames(curve, 0.75);
  const nF = frames.length - 1;
  const rng = mulberry32(2025);

  const frameAtU = (u) => frames[clamp(Math.round(u * nF), 0, nF)];
  const lateralPoint = (u, lat) => {
    const f = frameAtU(u);
    return f.P.clone().addScaledVector(f.N, lat);
  };
  const stationDist = (u) => Math.min(...STATIONS.map((s) => Math.abs(u - s.u)));
  const proj = STATIONS.find((s) => s.id === 'project');

  function place(obj, u) {
    const f = frames[clamp(Math.round(u * nF), 0, nF)];
    const m = new THREE.Matrix4().makeBasis(f.Th, UP, f.N);
    obj.quaternion.setFromRotationMatrix(m);
    obj.position.copy(f.P);
  }

  /* lights, sky, fog */
  const FOG = 0x8da6ec;
  scene.background = new THREE.Color(FOG);
  scene.fog = new THREE.Fog(FOG, 70, 330);

  const hemi = new THREE.HemisphereLight(0xe6edff, 0x3b4a8f, 1.2);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d0, 2.3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(shadowSize, shadowSize);
  const sc = sun.shadow.camera;
  sc.left = -62; sc.right = 62; sc.top = 62; sc.bottom = -62; sc.near = 1; sc.far = 320;
  sun.shadow.bias = -0.0008;
  sun.shadow.normalBias = 0.12;
  scene.add(sun, sun.target);
  const LIGHT_DIR = new THREE.Vector3(-0.5, 0.78, 0.4).normalize();

  const skyCols = [0x0f1a52, 0x172872, 0x23399a, 0x3c58c4, 0x6a89e4, 0x8da6ec].map((c) => new THREE.Color(c));
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: Object.fromEntries(skyCols.map((c, i) => ['c' + i, { value: c }])),
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec3 vP; uniform vec3 c0,c1,c2,c3,c4,c5;
        void main(){ float h = normalize(vP).y; vec3 c = c0;
          if (h < 0.62) c = c1; if (h < 0.42) c = c2; if (h < 0.27) c = c3; if (h < 0.15) c = c4; if (h < 0.06) c = c5;
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    })
  );
  sky.renderOrder = -2;
  sky.frustumCulled = false;
  scene.add(sky);

  // paper sun rides the camera so every shot has it
  const sunRig = new THREE.Group();
  [[34, 0xf9dd8a], [26, 0xf8cf55], [19, 0xf6b900]].forEach(([r, c], i) => {
    const d = new THREE.Mesh(new THREE.CircleGeometry(r, 48), new THREE.MeshBasicMaterial({ color: c, fog: false, depthWrite: false, depthTest: false }));
    d.position.z = i * 0.1;
    d.renderOrder = -1;
    sunRig.add(d);
  });
  scene.add(sunRig, camera);

  /* ground, terrain layers, track */
  const groundColor = (u) => new THREE.Color(0x3a8f5f).lerp(new THREE.Color(0xb4bfdc), smoothstep(0.255, 0.33, u));
  const ground = new THREE.Mesh(groundGeometry(frames, 76, groundColor), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
  ground.receiveShadow = true;
  scene.add(ground);

  const ridgeMask = (u, offset) => {
    if (offset >= 30) return 1;
    return 0.3 + 0.7 * smoothstep(0.012, 0.055, stationDist(u));
  };
  const layers = [
    { off: 15, thick: 1.5, base: 2.6, amp: 1.0, col: 0x1c3a9a },
    { off: 25, thick: 1.5, base: 6, amp: 2.2, col: 0x2447a8 },
    { off: 38, thick: 1.6, base: 9.5, amp: 3.2, col: 0x2f56b8 },
    { off: 54, thick: 1.8, base: 14, amp: 4.2, col: 0x3c66c6 },
    { off: 72, thick: 2.0, base: 20, amp: 5.4, col: 0x5580d4 },
  ];
  for (const side of [-1, 1]) {
    layers.forEach((ly, li) => {
      const waves = Array.from({ length: 4 }, (_, k) => ({
        f: (0.045 + rng() * 0.1) * (k + 1) * 0.75,
        a: ly.amp / (k + 1.2),
        p: rng() * 6.283,
      }));
      const off = side * (ly.off + (side > 0 ? 2 : 0));
      const geo = prism(frames, {
        lat0: off,
        lat1: off + side * ly.thick,
        bottom: -5,
        stride: 2,
        top: (u) => {
          const s = u * L;
          let h = ly.base;
          for (const w of waves) h += w.a * Math.sin(s * w.f + w.p);
          h = Math.max(0.8, h) * ridgeMask(u, Math.abs(off));
          const inYard = off > 0 && Math.abs(off) < 48 && Math.abs(u - proj.u) < 0.065;
          return inYard ? -0.4 : Math.max(h, -0.4);
        },
      });
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: ly.col, roughness: 1, side: THREE.DoubleSide, flatShading: true }));
      m.castShadow = true;
      m.receiveShadow = true;
      scene.add(m);
    });
  }

  // track bed, rails, sleepers
  const bedU1 = 0.99;
  const ballast = new THREE.Mesh(prism(frames, { lat0: -1.7, lat1: 1.7, bottom: -0.3, top: () => 0.14, stride: 1, u1: bedU1 }), M.ballast);
  ballast.receiveShadow = true;
  scene.add(ballast);
  for (const lat of [-0.45, 0.45]) {
    const r = new THREE.Mesh(prism(frames, { lat0: lat - 0.045, lat1: lat + 0.045, bottom: 0.1, top: () => 0.27, stride: 1, u1: bedU1 }), M.rail);
    r.castShadow = true;
    scene.add(r);
  }
  {
    const count = Math.floor(L * bedU1 / 0.8);
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.09, 2.0), M.sleeper, count);
    const o = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const f = frameAtU((i * 0.8) / L);
      o.position.copy(f.P);
      o.position.y += 0.17;
      o.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(f.Th, UP, f.N));
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
    }
    inst.receiveShadow = true;
    scene.add(inst);
  }

  /* patchwork paddies and ponds */
  {
    const greens = [0x3e9b66, 0x4aa874, 0x2f8f6b, 0x59b27a, 0x7fbf6a, 0x35875a];
    const bins = [[10, 19], [20, 31], [32, 45], [46, 62]];
    const cells = [];
    for (let s = 6; s < L * 0.3; s += 12.5) {
      for (const side of [-1, 1]) {
        bins.forEach(([a, b], bi) => {
          const u = s / L;
          if (stationDist(u) < 0.045 && a < 28) return;
          const f = frameAtU(u);
          const lat = side * (a + b) / 2;
          const p = f.P.clone().addScaledVector(f.N, lat);
          cells.push({ p, th: f.Th, w: 11.5 - rng() * 1.5, d: b - a - 0.9, c: greens[Math.floor(rng() * greens.length)] });
        });
      }
    }
    const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }), cells.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    cells.forEach((c, i) => {
      o.position.set(c.p.x, c.p.y + 0.04, c.p.z);
      o.rotation.set(-Math.PI / 2, 0, 0);
      o.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-c.th.z, c.th.x)));
      o.scale.set(c.w, c.d, 1);
      o.updateMatrix();
      inst.setMatrixAt(i, o.matrix);
      inst.setColorAt(i, col.set(c.c));
    });
    inst.receiveShadow = true;
    scene.add(inst);

    for (let i = 0; i < 6; i++) {
      const u = 0.02 + rng() * 0.22;
      if (stationDist(u) < 0.05) continue;
      const side = rng() < 0.5 ? -1 : 1;
      const p = lateralPoint(u, side * (13 + rng() * 22));
      const pond = new THREE.Mesh(new THREE.CircleGeometry(3 + rng() * 3, 28), M.water);
      pond.rotation.x = -Math.PI / 2;
      pond.scale.set(1.5, 1, 1);
      pond.position.set(p.x, p.y + 0.07, p.z);
      pond.receiveShadow = true;
      scene.add(pond);
    }
  }

  /* trees */
  {
    const foliage = [0x2f8f6b, 0x3ea678, 0x24785a, 0x6bb26a];
    const spots = [];
    let tries = 0;
    while (spots.length < 280 && tries++ < 3000) {
      const u = 0.012 + rng() * 0.97;
      const side = rng() < 0.5 ? -1 : 1;
      const lat = side * (7.5 + rng() * rng() * 46);
      const sd = stationDist(u);
      if (sd < 0.05 && lat > -26 && lat < 30) continue;
      if (lat < 0 && lat > -14 && rng() < 0.75) continue;
      if (Math.abs(u - proj.u) < 0.08 && lat > -12 && lat < 40) continue;
      if (u > 0.36 && rng() < 0.45) continue; // fewer trees in the city
      spots.push({ u, lat, s: 1.1 + rng() * 1.5, c: foliage[Math.floor(rng() * foliage.length)] });
    }
    const crown = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true }), spots.length);
    const trunk = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.17, 1, 5), M.ink, spots.length);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    spots.forEach((t, i) => {
      const p = lateralPoint(t.u, t.lat);
      o.rotation.set(0, rng() * 6, 0);
      o.position.set(p.x, p.y + 1.6 * t.s, p.z);
      o.scale.set(t.s * 1.1, t.s * 1.05, t.s * 1.1);
      o.updateMatrix();
      crown.setMatrixAt(i, o.matrix);
      crown.setColorAt(i, col.set(t.c));
      o.rotation.set(0, 0, 0);
      o.position.set(p.x, p.y + 0.6 * t.s, p.z);
      o.scale.set(t.s, 1.2 * t.s, t.s);
      o.updateMatrix();
      trunk.setMatrixAt(i, o.matrix);
    });
    crown.castShadow = trunk.castShadow = true;
    crown.receiveShadow = true;
    scene.add(crown, trunk);
  }

  /* huts in the paddies */
  {
    const hutGeo = new THREE.BoxGeometry(2.4, 1.4, 2);
    const n = 16;
    const walls = new THREE.InstancedMesh(hutGeo, M.chalk, n);
    const roofGeo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 0.5, 0);
    const roofs = new THREE.InstancedMesh(roofGeo, M.ochre, n);
    const o = new THREE.Object3D();
    let placed = 0;
    let tries = 0;
    while (placed < n && tries++ < 400) {
      const u = 0.015 + rng() * 0.24;
      const side = rng() < 0.5 ? -1 : 1;
      const lat = side * (11 + rng() * 38);
      if (stationDist(u) < 0.05 && Math.abs(lat) < 32) continue;
      const p = lateralPoint(u, lat);
      const f = frameAtU(u);
      const ang = Math.atan2(-f.Th.z, f.Th.x);
      o.position.set(p.x, p.y + 0.7, p.z);
      o.rotation.set(0, ang, 0);
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      walls.setMatrixAt(placed, o.matrix);
      o.position.y = p.y + 1.4;
      o.scale.set(3.2, 1.3, 2.8);
      o.updateMatrix();
      roofs.setMatrixAt(placed, o.matrix);
      placed++;
    }
    walls.count = roofs.count = placed;
    walls.castShadow = roofs.castShadow = true;
    walls.receiveShadow = true;
    scene.add(walls, roofs);
  }

  /* city towers */
  {
    const texA = windowTexture('light', 11);
    const texB = windowTexture('blue', 12);
    const mats = [new THREE.MeshStandardMaterial({ map: texA, roughness: 1 }), new THREE.MeshStandardMaterial({ map: texB, roughness: 1 }), new THREE.MeshStandardMaterial({ map: texA, color: 0xd5ddf6, roughness: 1 })];
    const roofMat = M.chalk;
    for (let s = 0.3 * L; s < 0.985 * L; s += 9) {
      for (const side of [-1, 1]) {
        if (rng() < 0.4) continue;
        const u = s / L;
        const lat = side * (17 + rng() * 38);
        if (stationDist(u) < 0.05 && lat > -14 && lat < 36) continue;
        if (Math.abs(u - proj.u) < 0.09 && lat > -14 && lat < 42) continue;
        const w = 3.4 + rng() * 3.6, d = 3.4 + rng() * 3, h = 7 + rng() * rng() * 24 * (1 + (Math.abs(lat) - 17) / 80);
        const p = lateralPoint(u, lat);
        const f = frameAtU(u);
        const t = new THREE.Mesh(towerGeometry(w, h, d), mats[Math.floor(rng() * 3)]);
        t.position.set(p.x, p.y - 0.05, p.z);
        t.rotation.y = Math.atan2(-f.Th.z, f.Th.x);
        t.castShadow = true;
        t.receiveShadow = true;
        scene.add(t);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(w * 0.55, 0.7, d * 0.55), roofMat);
        cap.position.set(0, h + 0.35, 0);
        cap.castShadow = true;
        t.add(cap);
      }
    }
  }

  /* clouds */
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const u = rng();
    const side = rng() < 0.5 ? -1 : 1;
    const g = new THREE.Group();
    const parts = 3 + Math.floor(rng() * 2);
    for (let k = 0; k < parts; k++) {
      const r = 4 + rng() * 4;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1.2, 20), new THREE.MeshBasicMaterial({ color: 0xeef1ec }));
      c.position.set(k * 5.2 - parts * 2.6, rng() * 1.2, (rng() - 0.5) * 3);
      g.add(c);
    }
    const p = lateralPoint(u, side * (90 + rng() * 120));
    g.position.set(p.x, 60 + rng() * 40, p.z);
    g.scale.setScalar(1.6);
    g.userData = { base: g.position.clone(), ph: rng() * 6 };
    scene.add(g);
    clouds.push(g);
  }

  /* stations */
  const baseGroups = [];
  const platform = (st) => {
    const g = new THREE.Group();
    blk(g, 20, 0.42, 3, M.chalk, 0, 0.21, 3.6);
    blk(g, 20, 0.45, 0.16, M.signal, 0, 0.225, 2.2);
    for (const x of [-7.5, -2.5, 2.5, 7.5]) cyl(g, 0.08, 2.6, M.ink, x, 1.72, 4.6);
    blk(g, 17, 0.16, 3.2, M.vermilion, 0, 3.05, 3.9);
    for (const x of [-9, 9]) {
      cyl(g, 0.06, 2.2, M.ink, x, 1.5, 2.6);
      blk(g, 0.4, 0.22, 0.4, M.lamp, x, 2.7, 2.6, false);
    }
    const board = signBoard(st.name, st.name.length > 12 ? 6.4 : 4.6, 1.15);
    board.position.set(-4.2, 2.1, 2.55);
    g.add(board);
    for (const x of [-6.2, -2.2]) cyl(g, 0.07, 1.9, M.ink, x, 1.2, 2.7);
    return g;
  };

  const extras = {
    hero(g) {
      blk(g, 11, 3.4, 5.6, M.chalk, -1, 1.7, 11);
      const r = hipRoof(12.4, 6.8, 2, M.vermilion);
      r.position.set(-1, 3.4, 11);
      g.add(r);
      blk(g, 1.6, 2.2, 0.2, M.ink, -1, 1.1, 8.1);
    },
    school(g) {
      blk(g, 17, 3.2, 5, M.chalk, 0, 1.6, 13);
      const r = hipRoof(18.4, 6.2, 1.8, M.ochre);
      r.position.set(0, 3.2, 13);
      g.add(r);
      blk(g, 2.4, 6, 2.4, M.chalk, -6, 3, 13);
      const tr = hipRoof(3.4, 3.4, 1.6, M.ochre);
      tr.position.set(-6, 6, 13);
      g.add(tr);
      for (let i = 0; i < 5; i++) blk(g, 1.4, 1.2, 0.12, M.blue, -3 + i * 2.6, 1.9, 10.45, false);
    },
    college(g) {
      const tex = windowTexture('light', 31);
      const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
      const t = new THREE.Mesh(towerGeometry(15, 9, 6), m);
      t.position.set(0, 0, 14);
      t.castShadow = t.receiveShadow = true;
      g.add(t);
      blk(g, 15.6, 0.5, 6.6, M.vermilion, 0, 9.25, 14);
      blk(g, 5, 4, 5, M.chalk, 11, 2, 12);
    },
    internship(g) {
      const tex = [windowTexture('blue', 41), windowTexture('light', 42), windowTexture('blue', 43)];
      const spec = [[-5, 15, 5.2, 5.2, 21], [2.5, 19, 6, 5.6, 29], [9.5, 14.5, 4.4, 4.4, 15]];
      spec.forEach(([x, z, w, d, h], i) => {
        const t = new THREE.Mesh(towerGeometry(w, h, d), new THREE.MeshStandardMaterial({ map: tex[i], roughness: 1 }));
        t.position.set(x, 0, z);
        t.castShadow = t.receiveShadow = true;
        g.add(t);
        blk(g, w * 0.5, 0.8, d * 0.5, M.chalk, x, h + 0.4, z);
      });
      const b = signBoard('LLMNEXTGEN2AI', 5.6, 1.2);
      b.position.set(-5, 6.4, 15 - 2.7);
      g.add(b);
    },
    project(g) {
      const y = buildYard();
      g.add(y.group);
      g.userData.yard = y;
    },
    skills(g) {
      blk(g, 9, 3.2, 5, M.chalk, 3, 1.6, 12);
      const r = hipRoof(10.4, 6.2, 1.8, M.vermilion);
      r.position.set(3, 3.2, 12);
      g.add(r);
      ['PYTHON', 'SQL', 'POWER BI', 'EXCEL'].forEach((t, i) => {
        const b = signBoard(t, 3.2, 0.86);
        b.position.set(-6.9 + i * 4.6, 3.78, 2.35);
        g.add(b);
      });
    },
    interests(g) {
      // tripod and camera
      const tx = 3, tz = 3.7;
      for (const [dx, dz] of [[0.5, 0], [-0.3, 0.45], [-0.3, -0.45]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.5, 6), M.ink);
        leg.position.set(tx + dx * 0.45, 0.42 + 0.7, tz + dz * 0.45);
        leg.rotation.set(dz * 0.4, 0, -dx * 0.4);
        leg.castShadow = true;
        g.add(leg);
      }
      blk(g, 0.5, 0.34, 0.3, M.ink, tx, 2.08, tz);
      const lens = cyl(g, 0.12, 0.3, M.chalk, tx, 2.08, tz - 0.3, 14);
      lens.rotation.x = Math.PI / 2;
      // bench
      blk(g, 2.2, 0.12, 0.6, M.ochre, -5, 0.8, 3.9);
      blk(g, 2.2, 0.5, 0.1, M.ochre, -5, 1.15, 4.2);
      blk(g, 11, 3.0, 5, M.chalk, 1, 1.5, 12);
      const r = hipRoof(12.4, 6.2, 1.8, M.blue);
      r.position.set(1, 3, 12);
      g.add(r);
    },
    contact(g) {
      blk(g, 4.4, 11, 4.4, M.chalk, -7, 5.5, 10);
      const r = hipRoof(5.6, 5.6, 2.6, M.vermilion);
      r.position.set(-7, 11, 10);
      g.add(r);
      const face = cyl(g, 1.3, 0.16, M.ink, -7, 8.4, 10 - 2.28, 28);
      face.rotation.x = Math.PI / 2;
      const rim = cyl(g, 1.5, 0.12, M.signal, -7, 8.4, 10 - 2.24, 28);
      rim.rotation.x = Math.PI / 2;
      blk(g, 0.12, 0.95, 0.06, M.chalk, -7, 8.7, 10 - 2.4, false);
      blk(g, 0.8, 0.12, 0.06, M.chalk, -6.6, 8.4, 10 - 2.4, false);
      blk(g, 11, 3.2, 5, M.chalk, 2, 1.6, 11);
      const r2 = hipRoof(12.4, 6.2, 1.8, M.vermilion);
      r2.position.set(2, 3.2, 11);
      g.add(r2);
    },
  };

  STATIONS.forEach((st) => {
    const g = platform(st);
    extras[st.kind](g);
    place(g, st.u);
    scene.add(g);
    baseGroups.push(g);
  });
  const yard = baseGroups[STATIONS.findIndex((s) => s.kind === 'project')].userData.yard;

  // buffer stop at the end of the line
  {
    const g = new THREE.Group();
    blk(g, 0.5, 1.1, 2.2, M.ink, 0, 0.7, 0);
    blk(g, 0.54, 0.22, 2.24, M.signal, 0, 1.1, 0);
    blk(g, 3, 0.3, 0.3, M.ink, -1.5, 0.35, 0.8, false);
    blk(g, 3, 0.3, 0.3, M.ink, -1.5, 0.35, -0.8, false);
    place(g, 0.988);
    scene.add(g);
  }

  /* train */
  const cars = makeTrain();
  cars.forEach((c) => scene.add(c.obj));
  const tmpM = new THREE.Matrix4();
  const tmpN = new THREE.Vector3();
  const tmpU = new THREE.Vector3();
  const tmpP = new THREE.Vector3();
  const tmpT = new THREE.Vector3();
  function positionTrain(uCenter) {
    const noseS = uCenter * L + NOSE_OFFSET;
    cars.forEach((c) => {
      const s = noseS - c.dist;
      const u = clamp(s / L, 0, 1);
      curve.getPointAt(u, tmpP);
      curve.getTangentAt(u, tmpT);
      tmpN.crossVectors(tmpT, UP).normalize();
      tmpU.crossVectors(tmpN, tmpT).normalize();
      tmpM.makeBasis(tmpT, tmpU, tmpN);
      c.obj.quaternion.setFromRotationMatrix(tmpM);
      c.obj.position.copy(tmpP);
      c.obj.position.y += 0.06;
    });
  }

  const cur = new THREE.Vector3();
  function update({ u, yardPhase, time }) {
    positionTrain(u);
    curve.getPointAt(clamp(u, 0, 1), cur);
    sun.position.copy(cur).addScaledVector(LIGHT_DIR, 140);
    sun.target.position.copy(cur);
    sun.target.updateMatrixWorld();
    sky.position.copy(camera.position);
    clouds.forEach((c) => {
      c.position.x = c.userData.base.x + Math.sin(time * 0.04 + c.userData.ph) * 9;
    });
    yard.update(yardPhase);
  }

  return { frames, update, sunRig };
}
