import * as THREE from 'three';

const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif';

function signCanvas(text, { w = 1024, h = 256, bg = '#f6b900', fg = '#0e1230' } = {}) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const x = c.getContext('2d');
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  const m = h * 0.07;
  x.strokeStyle = fg;
  x.lineWidth = h * 0.035;
  x.strokeRect(m, m, w - 2 * m, h - 2 * m);
  x.fillStyle = fg;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  let size = h * 0.6;
  x.font = `700 ${size}px ${DISPLAY}`;
  const max = w - 2 * m - h * 0.2;
  const tw = x.measureText(text).width;
  if (tw > max) size *= max / tw;
  x.font = `700 ${size}px ${DISPLAY}`;
  x.fillText(text, w / 2, h / 2 + size * 0.04);
  return c;
}

function texture(text, opts) {
  const t = new THREE.CanvasTexture(signCanvas(text.toUpperCase(), opts));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const inkMat = new THREE.MeshStandardMaterial({ color: 0x0e1230, roughness: 1 });

/** Flat enamel board, face toward local -z, plus a dark backing slab. */
export function signBoard(text, width, height, opts = {}) {
  const g = new THREE.Group();
  const px = 1024;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: texture(text, { w: px, h: Math.round(px * height / width), ...opts }) })
  );
  face.rotation.y = Math.PI;
  g.add(face);
  const back = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, height + 0.1, 0.1), inkMat);
  back.position.z = 0.07;
  back.castShadow = true;
  g.add(back);
  return g;
}

/** Billboard label for the yard. */
export function labelSprite(text, width, height, opts = {}) {
  const px = 768;
  const mat = new THREE.SpriteMaterial({ map: texture(text, { w: px, h: Math.round(px * height / width), ...opts }), depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(width, height, 1);
  return s;
}
