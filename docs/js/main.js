import * as THREE from 'three';
import { buildWorld, STATIONS } from './world.js';
import { clamp, lerp, smootherstep } from './util.js';

const root = document.documentElement;
const stops = [...document.querySelectorAll('.stop')];
const routeLinks = [...document.querySelectorAll('.route a')];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let vw = innerWidth;
let vh = innerHeight;
let tops = [];
let heights = [];

function measure() {
  vw = innerWidth;
  vh = innerHeight;
  tops = stops.map((el) => el.getBoundingClientRect().top + scrollY);
  heights = stops.map((el) => el.offsetHeight);
}

function currentStop(y) {
  let idx = 0;
  for (let i = 0; i < tops.length; i++) if (y >= tops[i] - vh * 0.5) idx = i;
  return idx;
}

let lastStop = -1;
function updateRoute(y) {
  const i = currentStop(y);
  if (i === lastStop) return;
  lastStop = i;
  routeLinks.forEach((a, k) => (k === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current')));
}

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/* Camera shots, one per stop. Offsets are in the track's own frame:
   back (along the line, negative = behind), side (negative = camera side), height. */
const SHOT_DEFAULT = { back: -13, side: -12, height: 5, ahead: 2, lookSide: 6.5, lookH: 2.5, fov: 42, mscale: 1.25 };
const SHOTS = [
  { back: -22, side: -13, height: 6, ahead: 4, lookSide: 6, lookH: 6, fov: 42, sx: 0.17 },
  { sx: -0.17 },
  { sx: 0.17 },
  { back: -19, side: -17, height: 11, ahead: 1, lookSide: 9, lookH: 6.5, fov: 46, sx: -0.17, mscale: 1.5 },
  { back: -4, side: -17, height: 20, ahead: 2, lookSide: 16, lookH: 0, fov: 42, sx: 0.2, mscale: 1.9 },
  { sx: -0.17 },
  { sx: 0.17 },
  { back: -14, side: -13, height: 6, ahead: 0, lookSide: 8, lookH: 5, fov: 44, sx: -0.17, mscale: 1.4 },
].map((s) => ({ ...SHOT_DEFAULT, sx: 0, ...s }));

const KEYS = ['back', 'side', 'height', 'ahead', 'lookSide', 'lookH', 'fov', 'sx', 'mscale'];

function stateAt(y) {
  const last = tops.length - 1;
  let i = 0;
  for (let k = 0; k <= last; k++) if (y >= tops[k]) i = k;
  const holdEnd = tops[i] + heights[i] - vh;
  if (i === last || y <= holdEnd) {
    const span = Math.max(1, holdEnd - tops[i]);
    return { i, j: i, q: 0, hold: clamp((y - tops[i]) / span) };
  }
  return { i, j: i + 1, q: smootherstep((y - holdEnd) / vh), hold: 1 };
}

async function start() {
  measure();
  updateRoute(scrollY);
  addEventListener('scroll', () => updateRoute(scrollY), { passive: true });
  addEventListener('resize', () => {
    measure();
    updateRoute(scrollY);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  if (!webglAvailable()) {
    root.classList.add('no-webgl');
    return;
  }

  try {
    await Promise.all([document.fonts.load('700 100px "Barlow Condensed"'), document.fonts.load('600 100px "Barlow Condensed"')]);
  } catch {
    /* fall back to the system face in the 3D signs */
  }

  const canvas = document.getElementById('scene');
  const lowPower = matchMedia('(pointer: coarse)').matches || vw < 760;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  let pr = Math.min(devicePixelRatio || 1, lowPower ? 1.5 : 2);
  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let running = true;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    running = false;
    root.classList.add('no-webgl');
  });

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, vw / vh, 0.3, 1600);
  const world = buildWorld({ scene, camera, shadowSize: lowPower ? 1024 : 2048 });

  function resize() {
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);
  resize();

  const projectIdx = STATIONS.findIndex((s) => s.id === 'project');
  const cam = new THREE.Vector3();
  const look = new THREE.Vector3();
  const off = new THREE.Vector3();
  const sunDir = new THREE.Vector3();
  const sunSide = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const shot = {};
  let ySmooth = scrollY;
  let px = 0, py = 0, tx = 0, ty = 0;
  addEventListener('pointermove', (e) => {
    tx = (e.clientX / vw - 0.5) * 2;
    ty = (e.clientY / vh - 0.5) * 2;
  }, { passive: true });

  let prev = performance.now();
  let frames = 0;
  let acc = 0;
  let adapted = false;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;

    if (!adapted) {
      acc += dt;
      if (++frames === 90) {
        adapted = true;
        if (acc / frames > 0.026 && pr > 1) {
          pr = 1;
          renderer.setPixelRatio(1);
          resize();
        }
      }
    }

    const still = reduceMotion.matches;
    ySmooth = still ? scrollY : ySmooth + (scrollY - ySmooth) * (1 - Math.exp(-dt * 7));
    if (Math.abs(scrollY - ySmooth) < 0.2) ySmooth = scrollY;
    const st = stateAt(ySmooth);

    const a = SHOTS[st.i], b = SHOTS[st.j];
    for (const k of KEYS) shot[k] = lerp(a[k], b[k], st.q);
    const uA = STATIONS[st.i].u, uB = STATIONS[st.j].u;
    const u = lerp(uA, uB, st.q);

    const portrait = vw / vh < 0.9;
    const scale = portrait ? shot.mscale : 1;
    const holdDrift = (st.i === st.j ? st.hold : 1) - 0.5;

    const f = world.frames[clamp(Math.round(u * (world.frames.length - 1)), 0, world.frames.length - 1)];
    off.set(0, 0, 0)
      .addScaledVector(f.Th, shot.back * scale)
      .addScaledVector(f.N, shot.side * scale)
      .addScaledVector(up, shot.height * scale);
    off.applyAxisAngle(up, holdDrift * 0.16);
    cam.copy(f.P).add(off);
    look.copy(f.P).addScaledVector(f.Th, shot.ahead).addScaledVector(f.N, shot.lookSide).addScaledVector(up, shot.lookH);

    if (!still) {
      px += (tx - px) * (1 - Math.exp(-dt * 3));
      py += (ty - py) * (1 - Math.exp(-dt * 3));
      cam.addScaledVector(f.N, px * 0.7).addScaledVector(up, -py * 0.35);
    }

    camera.position.copy(cam);
    camera.lookAt(look);
    camera.fov = shot.fov + (portrait ? 6 : 0);
    const sx = portrait ? 0 : shot.sx;
    const sy = portrait ? 0.2 : 0.04;
    camera.setViewOffset(vw, vh, -sx * vw, sy * vh, vw, vh);

    // the paper sun keeps a fixed bearing and height relative to where the camera looks
    sunDir.copy(look).sub(cam).setY(0).normalize();
    sunSide.crossVectors(sunDir, up);
    const az = portrait ? 0.3 : 0.55;
    sunDir.multiplyScalar(Math.cos(az)).addScaledVector(sunSide, Math.sin(az));
    sunDir.multiplyScalar(Math.cos(0.23)).addScaledVector(up, Math.sin(0.23));
    world.sunRig.position.copy(cam).addScaledVector(sunDir, 430);
    world.sunRig.quaternion.copy(camera.quaternion);

    let yardPhase = 0;
    if (st.i === projectIdx && st.j === projectIdx) yardPhase = st.hold;
    else if (st.i >= projectIdx) yardPhase = 1;
    world.update({ u, yardPhase, time: still ? 0 : now / 1000 });

    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);
  root.classList.add('ready');
}

start();
