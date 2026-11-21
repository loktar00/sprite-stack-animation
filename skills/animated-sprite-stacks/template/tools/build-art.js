#!/usr/bin/env node
// build-art.js: turn the parts of a character.js into PNG slice strips.
//
//   node tools/build-art.js                    the character in this folder (character.js -> art/)
//   node tools/build-art.js examples/robot     another one (examples/robot/character.js -> examples/robot/art/)
//
// For every part it writes art/<name>.png: the layers side by side, bottom layer first, every cell the same size,
// the stack's turning axis in the middle of the cell. It also writes art/parts.js (the cell sizes, which the page
// needs to cut the strips up) and art/sheet.png (all strips enlarged, to look at).
//
// Shading is baked in here, once: a pixel with nothing above it gets its material's top tone; the rest are only
// ever seen as the side of a layer and get a side tone (the darker one low on the part).
//
// A part without fn is hand-drawn: its PNG is left as it is and only listed in parts.js.
// No dependencies: the PNG writer is at the bottom.
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const dir = path.resolve(process.argv[2] || '.');
const C = require(path.join(dir, 'character.js'));
const artDir = path.join(dir, 'art');
fs.mkdirSync(artDir, { recursive: true });

function rgb(hex) { return [parseInt(hex.substr(1, 2), 16), parseInt(hex.substr(3, 2), 16), parseInt(hex.substr(5, 2), 16)]; }
function buildStrip(p) {
  const at = function (x, y, z) { return x < 0 || y < 0 || x >= p.w || y >= p.h || z < 0 || z >= p.layers ? null : p.fn(x + 0.5 - p.w / 2, y + 0.5 - p.h / 2, z); };
  const W = p.w * p.layers, px = Buffer.alloc(W * p.h * 4);
  for (let z = 0; z < p.layers; z++) for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const m = at(x, y, z); if (!m) continue;
    if (!C.materials[m]) throw new Error(p.name + ': no material called "' + m + '"');
    const tone = !at(x, y, z + 1) ? 2 : z < p.layers / 3 ? 0 : 1, c = rgb(C.materials[m][tone]), j = (y * W + z * p.w + x) * 4;
    px[j] = c[0]; px[j + 1] = c[1]; px[j + 2] = c[2]; px[j + 3] = 255;
  }
  return { w: W, h: p.h, cw: p.w, px: px };
}

const meta = [], strips = [];
for (const p of C.parts) {
  meta.push({ name: p.name, cw: p.w, ch: p.h, n: p.layers });
  if (!p.fn) { console.log(p.name + '.png', 'hand-drawn, left as it is'); continue; }
  const s = buildStrip(p); strips.push(s);
  fs.writeFileSync(path.join(artDir, p.name + '.png'), png(s.w, s.h, s.px));
  console.log(p.name + '.png', s.w + 'x' + s.h, p.layers + (p.layers > 1 ? ' slices' : ' slice'));
}
fs.writeFileSync(path.join(artDir, 'parts.js'), '// written by tools/build-art.js: one entry per strip (cell width, cell height, number of slices)\nwindow.PARTS = ' + JSON.stringify(meta) + ';\n');

// art/sheet.png: every built strip, each pixel Z wide, on a dark sheet with the cells marked
if (strips.length) {
  const Z = 10, PAD = 24, BG = [23, 19, 28], CELL = [36, 30, 44];
  const W = Math.max.apply(null, strips.map(function (s) { return s.w; })) * Z + PAD * 2, H = strips.reduce(function (a, s) { return a + s.h * Z + PAD; }, PAD);
  const out = Buffer.alloc(W * H * 4);
  for (let i = 0; i < W * H; i++) { out[i * 4] = BG[0]; out[i * 4 + 1] = BG[1]; out[i * 4 + 2] = BG[2]; out[i * 4 + 3] = 255; }
  let y0 = PAD;
  for (const s of strips) {
    for (let y = 0; y < s.h * Z; y++) for (let x = 0; x < s.w * Z; x++) {
      const j = ((y0 + y) * W + PAD + x) * 4, k = (((y / Z) | 0) * s.w + ((x / Z) | 0)) * 4, gap = x % (s.cw * Z) >= s.cw * Z - 2;
      const c = s.px[k + 3] ? [s.px[k], s.px[k + 1], s.px[k + 2]] : gap ? BG : CELL;
      out[j] = c[0]; out[j + 1] = c[1]; out[j + 2] = c[2];
    }
    y0 += s.h * Z + PAD;
  }
  fs.writeFileSync(path.join(artDir, 'sheet.png'), png(W, H, out));
  console.log('sheet.png', W + 'x' + H);
}

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
