// stack.js: sprite stacking on a 2D canvas.
//
// A stack is a strip image: the object's slices side by side, bottom slice first. To draw it, each slice is drawn
// with drawImage, turned by the object's angle, a little further up the screen than the one below. That is all.
// There is no depth buffer and no geometry: what is drawn later covers what was drawn earlier, so everything on
// screen is sorted by height and drawn bottom to top.
//
// World coordinates: x and y lie on the ground, z is height, all in art pixels. The camera looks down at a fixed
// pitch; turning an object is rotate(), the flattened ground is scale(1, ys).
(function (global) {
  'use strict';

  // Load strips. parts: [{ name, cw, ch, n }] (cell width, cell height, slice count); base: folder of <name>.png.
  function load(parts, base) {
    const out = {};
    return Promise.all(parts.map(function (p) {
      return new Promise(function (resolve, reject) {
        const img = new Image();
        img.onload = function () {
          // the same strip in one dark colour: drawn under a slice in the spread view so its edge shows
          const dark = document.createElement('canvas'); dark.width = img.width; dark.height = img.height;
          const d = dark.getContext('2d'); d.drawImage(img, 0, 0); d.globalCompositeOperation = 'source-in'; d.fillStyle = '#05070a'; d.fillRect(0, 0, dark.width, dark.height);
          out[p.name] = { name: p.name, img: img, dark: dark, cw: p.cw, ch: p.ch, n: p.n }; resolve();
        };
        img.onerror = function () { reject(new Error('could not load ' + base + p.name + '.png')); };
        img.src = base + p.name + '.png';
      });
    })).then(function () { return out; });
  }

  // A renderer draws into ctx. scale: screen pixels per art pixel. pitch: camera angle above the ground, in radians
  // (90 degrees is straight down). One layer of height is scale * cos(pitch) screen rows.
  function createRenderer(ctx, opt) {
    const scale = opt.scale, ys = Math.sin(opt.pitch), zk = scale * Math.cos(opt.pitch);
    let items = [], ox = 0, oy = 0, spread = 0;
    const R = {
      scale: scale, ys: ys, zk: zk, calls: 0,
      // start a frame: (x0, y0) is where the world's origin lands on the canvas; s (0 to 1) spreads the layers apart
      begin: function (x0, y0, s) { items = []; ox = x0; oy = y0; spread = s || 0; },
      // where a world point lands on the canvas
      project: function (x, y, z) { return [ox + scale * x, oy + scale * y * ys - z * zk * (1 + 1.2 * spread)]; },
      // queue one slice: slice i of a stack, its axis at (x, y), its underside at height z, turned by rot.
      // thick is its height in layers. A slice is repeated one screen row apart until it is that thick,
      // otherwise the layers of a stack would show gaps between them.
      slice: function (stack, i, x, y, z, rot, thick) {
        const sx = ox + Math.round(scale * x), sy = oy + Math.round(scale * y * ys), up = Math.round(z * zk * (1 + 1.2 * spread));
        const rows = Math.max(1, Math.ceil(zk * (thick || 1) * (1 - 0.8 * spread) - 0.02));
        if (spread > 0) items.push({ s: stack, i: i, x: sx, y: sy - up + Math.max(2, scale / 2), rot: rot, h: up, n: items.length, edge: true });
        for (let k = 0; k < rows; k++) items.push({ s: stack, i: i, x: sx, y: sy - up - k, rot: rot, h: up + k, n: items.length, edge: false });
      },
      // queue a whole stack standing at (x, y, z)
      stack: function (stack, x, y, z, rot) { for (let i = 0; i < stack.n; i++) R.slice(stack, i, x, y, z + i, rot, 1); },
      // draw everything queued, lowest first
      flush: function () {
        items.sort(function (a, b) { return a.h - b.h || a.n - b.n; });
        ctx.imageSmoothingEnabled = false;
        for (let q = 0; q < items.length; q++) {
          const it = items[q], s = it.s;
          ctx.setTransform(1, 0, 0, 1, it.x, it.y); ctx.scale(1, ys); ctx.rotate(it.rot);
          ctx.globalAlpha = it.edge ? spread : 1;
          ctx.drawImage(it.edge ? s.dark : s.img, it.i * s.cw, 0, s.cw, s.ch, -s.cw * scale / 2, -s.ch * scale / 2, s.cw * scale, s.ch * scale);
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1;
        R.calls = items.length;
      }
    };
    return R;
  }

  global.SpriteStack = { load: load, createRenderer: createRenderer };
})(window);
