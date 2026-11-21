// step.js: the few lines every tutorial page shares: the canvas, a frame clock, the mouse, and small drawing helpers.
// A page calls Step.run(frames, draw): draw(ctx, f) paints frame f (0 to frames - 1) on a cleared canvas.
// Frames come 60 a second while playing; Step also sets window.demo.seek(f) so tools/capture.py can ask for them one by one.
window.Step = (function () {
  'use strict';
  const cv = document.getElementById('c'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height, TAU = Math.PI * 2;
  const INK = '#ffffff', PIN = '#ff6fae', DIM = '#7a7089', BG = '#17131c';
  const mouse = { x: 0, y: 0, on: false };
  cv.addEventListener('mousemove', function (e) { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; mouse.on = true; });
  cv.addEventListener('mouseleave', function () { mouse.on = false; });

  function run(frames, draw, ready) {
    let playing = true, t0 = null;
    const paint = function (f) {
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.setLineDash([]); ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.fillStyle = INK;
      ctx.font = '12px system-ui, "Segoe UI", Helvetica, Arial, sans-serif'; ctx.textAlign = 'left';
      draw(ctx, f);
    };
    window.demo = { frames: frames, fps: 60, seek: function (f) { playing = false; mouse.on = false; paint(f); return f; } };
    window.demo.ready = Promise.resolve(ready).then(function () {
      requestAnimationFrame(function tick(t) { if (t0 === null) t0 = t; if (playing) paint(Math.floor((t - t0) / 1000 * 60) % frames); requestAnimationFrame(tick); });
      return { frames: frames, fps: 60 };
    });
  }
  function line(a, b, color) { ctx.strokeStyle = color || INK; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  function dot(p, r, fill, color) { ctx.strokeStyle = color || INK; ctx.beginPath(); ctx.arc(p[0], p[1], r || 4, 0, TAU); ctx.fillStyle = fill || BG; ctx.fill(); ctx.stroke(); }
  function text(s, x, y, color) { ctx.fillStyle = color || DIM; ctx.fillText(s, x, y); }
  function ease(t) { return t * t * (3 - 2 * t); }
  return { run: run, mouse: mouse, W: W, H: H, ctx: ctx, line: line, dot: dot, text: text, ease: ease, INK: INK, PIN: PIN, DIM: DIM, BG: BG, TAU: TAU };
})();
