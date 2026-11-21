#!/usr/bin/env node
// build-art.js: turn small "what is at this point?" functions into PNG slice strips.
//
//   node tools/build-art.js
//
// Each part below is a box of art pixels: w (front to back, +x is forward), h (side to side) and a number of layers.
// Its function says which material fills the point (x, y) of layer z, measured from the middle of the cell, or null.
// The script writes one PNG per part into art/: the layers side by side, bottom layer first, every cell the same
// size, the stack's axis in the middle of the cell. It also writes art/parts.js (the cell sizes, for the page) and
// media/strips.png (all strips enlarged, for the README). No dependencies: the PNG writer is at the bottom.
//
// You do not need this script to use the technique. Strips drawn by hand in any pixel editor work the same way.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const root = path.join(__dirname, '..');

// A material is three tones: [side in shade, side, top]. Shading is baked into the slices here, once:
// a pixel with nothing above it gets the top tone, the rest get a side tone (the darker one low on the part).
const MAT = {
  suit: ['#aaa493', '#cfc8b6', '#f0ebdd'],
  trouser: ['#565d70', '#6f7689', '#8990a3'],
  pack: ['#84302b', '#ad3f38', '#d4594d'],
  boot: ['#a87c1a', '#d6a428', '#f2c94f'],
  dark: ['#2c303b', '#3d4250', '#525869'],
  visor: ['#10162a', '#1b2440', '#2a3660'],
  glint: ['#7c9bd4', '#9db8e8', '#c4d8f6'],
  panel: ['#2f7f6a', '#3fa487', '#63c9a8']
};
const ell = (x, y, rx, ry) => (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1;

const PARTS = [
  { name: 'head', w: 12, h: 12, layers: 10, fn: function (x, y, z) {
    const zc = z + 0.5 - 5.0, r2 = 5.7 * 5.7 - zc * zc * 1.25; if (r2 <= 0 || x * x + y * y > r2) return null;
    if (x > 1.6 && Math.abs(y) < 3.8 && z >= 3 && z <= 6) return z === 6 && y < -1.4 && y > -3.2 ? 'glint' : 'visor';
    if (Math.abs(y) < 0.9 && x < 1.5 && z >= 7) return 'pack';              // a stripe over the top of the helmet
    return 'suit';
  } },
  { name: 'torso', w: 12, h: 16, layers: 12, fn: function (x, y, z) {
    if (x < -2.4 && x > -5.6 && Math.abs(y) < 3.3 && z >= 4 && z <= 10) return 'pack';   // the backpack
    if (z <= 1) return ell(x, y, 2.5, 4.1) ? 'trouser' : null;
    if (z === 2) return ell(x, y, 2.8, 4.4) ? 'dark' : null;               // the belt
    if (z === 11) return ell(x, y, 1.9, 2.0) ? 'dark' : null;              // the neck ring
    const t = (z - 3) / 6, ry = z >= 9 ? 7.2 : 4.6 + 1.5 * Math.min(1, t), rx = z >= 9 ? 2.7 : 3.0;
    if (!ell(x, y, rx, ry)) return null;
    if (x > 1.6 && Math.abs(y) < 1.6 && (z === 6 || z === 7)) return 'panel';   // the chest panel
    return 'suit';
  } },
  { name: 'arm', w: 5, h: 5, layers: 1, fn: (x, y) => (ell(x, y, 1.8, 1.8) ? 'suit' : null) },
  { name: 'hand', w: 5, h: 5, layers: 1, fn: (x, y) => (ell(x, y, 1.5, 1.5) ? 'boot' : null) },
  { name: 'thigh', w: 5, h: 5, layers: 1, fn: (x, y) => (ell(x, y, 2.4, 2.4) ? 'trouser' : null) },
  { name: 'shin', w: 5, h: 5, layers: 1, fn: (x, y) => (ell(x, y, 2.05, 2.05) ? 'trouser' : null) },
  { name: 'boot', w: 7, h: 5, layers: 3, fn: (x, y, z) => (x > -2.4 && x < (z === 2 ? 1.0 : z === 1 ? 2.8 : 3.3) && Math.abs(y) < 2.0 ? 'boot' : null) }
];

function rgb(hex) { return [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)]; }
function buildStrip(p) {
  const at = (x, y, z) => (x < 0 || y < 0 || x >= p.w || y >= p.h || z < 0 || z >= p.layers ? null : p.fn(x + 0.5 - p.w / 2, y + 0.5 - p.h / 2, z));
  const W = p.w * p.layers, px = Buffer.alloc(W * p.h * 4);
  for (let z = 0; z < p.layers; z++) for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const m = at(x, y, z); if (!m) continue;
    const tone = !at(x, y, z + 1) ? 2 : z < p.layers / 3 ? 0 : 1, c = rgb(MAT[m][tone]), j = (y * W + z * p.w + x) * 4;
    px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
  }
  return { w: W, h: p.h, px: px };
}

fs.mkdirSync(path.join(root, 'art'), { recursive: true }); fs.mkdirSync(path.join(root, 'media'), { recursive: true });
const meta = [], strips = [];
for (const p of PARTS) {
  const s = buildStrip(p); strips.push(s);
  fs.writeFileSync(path.join(root, 'art', p.name + '.png'), png(s.w, s.h, s.px));
  meta.push({ name: p.name, cw: p.w, ch: p.h, n: p.layers });
  console.log(p.name + '.png', s.w + 'x' + s.h, p.layers + (p.layers > 1 ? ' slices' : ' slice'));
}
fs.writeFileSync(path.join(root, 'art', 'parts.js'), '// written by tools/build-art.js: one entry per strip (cell width, cell height, number of slices)\nwindow.PARTS = ' + JSON.stringify(meta) + ';\n');

// media/strips.png: every strip, each pixel Z wide, on a dark sheet with the cells marked
(function () {
  const Z = 10, PAD = 24, BG = [23, 19, 28], CELL = [36, 30, 44];
  const W = Math.max.apply(null, strips.map((s) => s.w)) * Z + PAD * 2, H = strips.reduce((a, s) => a + s.h * Z + PAD, PAD);
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { out[i * 4] = BG[0]; out[i * 4 + 1] = BG[1]; out[i * 4 + 2] = BG[2]; out[i * 4 + 3] = 255; }
  let y0 = PAD;
  strips.forEach(function (s, n) {
    const cw = PARTS[n].w;
    for (let y = 0; y < s.h * Z; y++) for (let x = 0; x < s.w * Z; x++) {
      const j = ((y0 + y) * W + PAD + x) * 4, k = (((y / Z) | 0) * s.w + ((x / Z) | 0)) * 4, gap = x % (cw * Z) >= cw * Z - 2;
      const c = s.px[k + 3] ? [s.px[k], s.px[k + 1], s.px[k + 2]] : gap ? BG : CELL;
      out[j] = c[0]; out[j + 1] = c[1]; out[j + 2] = c[2];
    }
    y0 += s.h * Z + PAD;
  });
  fs.writeFileSync(path.join(root, 'media', 'strips.png'), png(W, H, out));
  console.log('media/strips.png', W + 'x' + H);
})();

// ---------------------------------------------------------------- a minimal PNG writer (8-bit RGBA, no filter)
function crc32(buf) {
  let c, crc = -1;
  for (let i = 0; i < buf.length; i++) { c = (crc ^ buf[i]) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1; crc = (crc >>> 8) ^ c; }
  return (crc ^ -1) >>> 0;
}
function png(w, h, rgba) {
  const block = function (type, data) {
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]), out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0); body.copy(out, 4); out.writeUInt32BE(crc32(body), body.length + 4); return out;
  };
  const head = Buffer.alloc(13); head.writeUInt32BE(w, 0); head.writeUInt32BE(h, 4); head[8] = 8; head[9] = 6;
  const rows = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) rgba.copy(rows, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), block('IHDR', head), block('IDAT', zlib.deflateSync(rows)), block('IEND', Buffer.alloc(0))]);
}
