// demo.js: a stacked man walks a circle. Builds him from the strips, walks him with rig.js, draws him with stack.js.
//
// The loop shows four views in turn: the stack, the stack spread apart, the stack with its skeleton, the skeleton.
// Address options: ?view=stack|spread|rig|bones holds one view, ?wide shows the whole circle, ?bare hides the note,
// ?hold stops the clock (for capture: demo.seek(frame)).
(function () {
  'use strict';
  const TAU = Math.PI * 2, Q = new URLSearchParams(location.search);
  const W = 640, H = 360;                                   // the picture, in its own pixels
  const WIDE = Q.has('wide'), VIEW = Q.get('view');
  const SCALE = WIDE ? 4 : 8, PITCH = 42 * Math.PI / 180;   // screen pixels per art pixel; the camera angle above the ground
  const AX = WIDE ? 410 : 400, AY = WIDE ? 200 : 278;       // the anchor: the middle of the circle, or the ground point under the man
  const PAD = 280;                                          // room above the picture for the spread stack
  const STEP = 1 / 60, LAP = 540, STRIDES = 10;             // one lap: 540 steps of 1/60 s and exactly 10 strides

  const cv = document.getElementById('c'), c = cv.getContext('2d');
  const stage = document.createElement('canvas'); stage.width = W; stage.height = H + PAD;
  const g = stage.getContext('2d'), R = SpriteStack.createRenderer(g, { scale: SCALE, pitch: PITCH });
  const BG = '#17131c', INK = '#ffffff', PIN = '#ff6fae', DIM = '#7a7089', TXT = '#e9e3f1', FONT = 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif';
  let ART = null, FRAMES = [], RADIUS = 0, K = 1;

  // ---------------------------------------------------------------- the walk, worked out once
  // The man walks a circle so he is seen from every side. Its size is chosen so that one lap is a whole number of
  // strides: then the last frame of a lap leads into the first, and the loop has no seam. A few laps are walked
  // first so the start is forgotten; the poses of the last lap are kept.
  function simulate() {
    const w = Rig.createWalker(), da = TAU / LAP, a0 = -0.6;
    RADIUS = STRIDES * w.c.stride / (LAP * 2 * Math.sin(Math.PI / LAP));   // LAP chords of the circle add up to STRIDES strides
    const at = function (f) { const a = a0 + da * f; return [RADIUS * Math.cos(a), RADIUS * Math.sin(a), a + Math.PI / 2]; };
    const p0 = at(0); Rig.place(w, p0[0], p0[1], p0[2]);
    FRAMES = [];
    for (let f = 1; f <= LAP * 4; f++) { const p = at(f); Rig.step(w, p[0], p[1], p[2], STEP); if (f >= LAP * 3) FRAMES.push(Rig.pose(w)); }
    const A = FRAMES[0], B = FRAMES[LAP]; let seam = 0;
    for (let i = 0; i < 2; i++) for (let k = 0; k < 3; k++) seam += Math.abs(A.legs[i].knee[k] - B.legs[i].knee[k]) + Math.abs(A.legs[i].sole[k] - B.legs[i].sole[k]);
    return { frames: LAP, fps: 60, radius: RADIUS, speed: STRIDES * w.c.stride / (LAP * STEP), seam: seam };
  }

  // ---------------------------------------------------------------- the man, as stacks
  // a limb: one small disc image repeated along a bone. Each disc is a layer thick, so it is put half a layer
  // under the bone: then the bone runs through the middle of the discs and the skeleton lines up with the art.
  function limb(disc, a, b, n) { for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; R.slice(disc, 0, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - 0.5, 0, 1); } }
  function drawMan(P) {
    for (let i = 0; i < 2; i++) {
      const L = P.legs[i], A = P.arms[i];
      R.stack(ART.boot, L.sole[0], L.sole[1], L.sole[2], L.rot);
      limb(ART.shin, L.ankle, L.knee, 5); limb(ART.thigh, L.knee, L.hip, 5);
      limb(ART.arm, A.shoulder, A.elbow, 4); limb(ART.arm, A.elbow, A.hand, 4);
      R.slice(ART.hand, 0, A.hand[0], A.hand[1], A.hand[2] - 0.5, 0, 1);
    }
    // the torso: every slice has its own angle, from the angle of the hips at the bottom to that of the shoulders at the top
    const T = ART.torso, pz = P.pelvis[2] - 1;
    for (let i = 0; i < T.n; i++) { const t = Math.min(1, i / (T.n - 3)); R.slice(T, i, P.x, P.y, pz + i, P.hipsAngle + (P.shouldersAngle - P.hipsAngle) * t, 1); }
    R.stack(ART.head, P.x, P.y, pz + T.n, P.heading);
  }

  // ---------------------------------------------------------------- the skeleton: the joints the rig worked out, projected
  function line(a, b) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  function joint(p, r, full) { c.beginPath(); c.arc(p[0], p[1], r, 0, TAU); c.fillStyle = full ? PIN : BG; c.fill(); c.stroke(); }
  function drawSkeleton(P, alpha) {
    if (alpha <= 0) return;
    const pr = function (p) { return R.project(p[0], p[1], p[2]); }, k = SCALE / 8, r = 1.6 + 2.2 * k;
    c.save(); c.globalAlpha = alpha; c.strokeStyle = INK; c.lineWidth = 1 + 1.2 * k; c.lineCap = 'round';
    const pelvis = pr(P.pelvis), neck = pr([P.x, P.y, P.pelvis[2] + 9.5]);   // 9.5: the height of the shoulders over the hips (rig.js)
    c.setLineDash([4 * k, 5 * k]); line(pr([P.x, P.y, 0]), pelvis); c.setLineDash([]);     // hip height, bob included
    for (let i = 0; i < 2; i++) {
      const L = P.legs[i], A = P.arms[i], hip = pr(L.hip), knee = pr(L.knee), ankle = pr(L.ankle), sh = pr(A.shoulder), el = pr(A.elbow), hand = pr(A.hand);
      line(hip, knee); line(knee, ankle); line(sh, el); line(el, hand);
      if (L.planted) { c.strokeStyle = PIN;                                                                     // a planted foot: a ring on the ground that does not move
        const q = pr([L.sole[0], L.sole[1], 0]), rr = 9 * k;
        c.beginPath(); c.ellipse(q[0], q[1], rr, rr * R.ys, 0, 0, TAU); c.stroke();
        line([q[0] - rr * 1.45, q[1]], [q[0] - rr, q[1]]); line([q[0] + rr, q[1]], [q[0] + rr * 1.45, q[1]]); c.strokeStyle = INK;
      }
      joint(hip, r); joint(knee, r); joint(ankle, r, L.planted); joint(sh, r); joint(el, r * 0.85); joint(hand, r * 0.85);
    }
    line(pr(P.legs[0].hip), pr(P.legs[1].hip)); line(pr(P.arms[0].shoulder), pr(P.arms[1].shoulder)); line(pelvis, neck);
    joint(pelvis, r * 1.15); joint(neck, r);
    c.restore();
  }

  // ---------------------------------------------------------------- the picture
  function ramp(u, a, b) { const t = Math.max(0, Math.min(1, (u - a) / (b - a))); return t * t * (3 - 2 * t); }
  function panel(x0, y0) {
    c.font = '9px ' + FONT; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = TXT; c.fillText('Everything he is made of: ' + PARTS.length + ' PNG strips', x0, y0);
    let y = y0 + 16, x = x0, rowH = 0;
    for (let n = 0; n < PARTS.length; n++) {
      const p = PARTS[n], s = ART[p.name], small = p.n <= 3, w = p.cw * p.n;
      if (!small || x + w > x0 + 168) { y += rowH; x = x0; rowH = 0; }
      c.fillStyle = DIM; c.fillText(p.name + (small ? '' : '.png  ' + p.n + ' slices'), x, y);
      c.fillStyle = '#221c2a'; c.fillRect(x, y + 4, w, p.ch); c.drawImage(s.img, x, y + 4);
      if (small) { x += Math.max(w, 30) + 6; rowH = p.ch + 22; } else y += p.ch + 22;
    }
    c.fillStyle = DIM; c.fillText(R.calls + ' drawImage calls this frame', x0, y + rowH + 4);
  }
  const CAPTIONS = ['Flat images. Canvas drawImage. No depth buffer.', 'Spread apart: every layer is one flat image.', 'Two-bone leg IK. Feet planted in the world.', 'The same walk, bones only.'];
  function render(frame) {
    const f = ((Math.round(frame) % LAP) + LAP) % LAP, u = f / LAP, P = FRAMES[f];
    let spread, stackA, bonesA, cap;
    if (VIEW) { spread = VIEW === 'spread' ? 1 : 0; stackA = VIEW === 'bones' ? 0 : 1; bonesA = VIEW === 'rig' || VIEW === 'bones' ? 1 : 0; cap = ['stack', 'spread', 'rig', 'bones'].map(function (v) { return v === VIEW ? 1 : 0; }); }
    else {
      spread = ramp(u, 0.1, 0.2) - ramp(u, 0.36, 0.46);
      stackA = 1 - ramp(u, 0.72, 0.76) + ramp(u, 0.95, 0.995); bonesA = ramp(u, 0.5, 0.54) - ramp(u, 0.95, 0.995);
      cap = [1 - ramp(u, 0.08, 0.1) + ramp(u, 0.46, 0.48) - ramp(u, 0.49, 0.51) + ramp(u, 0.97, 1), ramp(u, 0.1, 0.13) - ramp(u, 0.43, 0.46), ramp(u, 0.51, 0.54) - ramp(u, 0.7, 0.73), ramp(u, 0.73, 0.76) - ramp(u, 0.945, 0.97)];
    }
    // the close view follows the ground point under the man; the wide view keeps the circle still
    const ox = WIDE ? AX : AX - Math.round(SCALE * P.x), oy = WIDE ? AY : AY - Math.round(SCALE * P.y * R.ys);
    const mx = ox + SCALE * P.x, my = oy + SCALE * P.y * R.ys, zoom = 1 - 0.5 * spread;   // spread, the picture draws back so the taller stack fits

    g.clearRect(0, 0, W, H + PAD);
    g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.ellipse(mx, my + PAD, 3.2 * SCALE, 3.2 * SCALE * R.ys, 0, 0, TAU); g.fill();
    R.begin(ox, oy + PAD, spread); drawMan(P); R.flush();
    const calls = R.calls;
    R.begin(ox, oy, 0);                                      // (for project(): the skeleton is drawn on the picture itself)
    R.calls = calls;

    c.setTransform(K, 0, 0, K, 0, 0); c.imageSmoothingEnabled = false;
    c.fillStyle = BG; c.fillRect(0, 0, W, H);
    c.save(); c.translate(mx, my); c.scale(zoom, zoom); c.translate(-mx, -my);
    c.strokeStyle = '#2a2233'; c.lineWidth = 1; c.beginPath(); c.ellipse(ox, oy, SCALE * RADIUS, SCALE * RADIUS * R.ys, 0, 0, TAU); c.stroke();
    if (!WIDE) {                                             // marks fixed to the ground, so the eye can tell what moves and what stays
      c.fillStyle = '#40374c'; const gs = 3 * SCALE, gy0 = Math.floor((-oy - H) / (gs * R.ys)), gx0 = Math.floor((-ox - W) / gs);
      for (let gy = gy0; gy * gs * R.ys + oy < H * 2; gy++) for (let gx = gx0; gx * gs + ox < W * 2; gx++) c.fillRect(ox + gx * gs - 1, oy + gy * gs * R.ys - 1, 2, 2);
    }
    c.restore();
    c.globalAlpha = stackA; c.drawImage(stage, 0, 0, W, H + PAD, mx - mx * zoom, my - (my + PAD) * zoom, W * zoom, (H + PAD) * zoom); c.globalAlpha = 1;
    drawSkeleton(P, bonesA);
    panel(18, 24);
    c.font = '14px ' + FONT; c.fillStyle = TXT; c.textAlign = 'center';
    for (let i = 0; i < 4; i++) if (cap[i] > 0.01) { c.globalAlpha = cap[i]; c.fillText(CAPTIONS[i], W / 2, H - 14); }
    c.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- the clock
  // The page never reads the time to decide what a frame looks like: frame f is always the same picture.
  // Playing is just asking for frame (seconds * 60); capture asks for the frames one by one.
  const BARE = Q.has('bare'); if (BARE) document.getElementById('note').style.display = 'none';
  function fit() {
    const k = Math.max(0.25, Math.min(window.innerWidth / W, (window.innerHeight - (BARE ? 0 : 48)) / H)), dpr = window.devicePixelRatio || 1;
    cv.style.width = Math.floor(W * k) + 'px'; cv.style.height = Math.floor(H * k) + 'px';
    cv.width = Math.round(W * k * dpr); cv.height = Math.round(H * k * dpr); K = cv.width / W;
  }
  let playing = !Q.has('hold'), paused = false, at = 0, t0 = 0;
  function tick(t) { if (playing) { if (paused) t0 = t - at / 60 * 1000; else at = (t - t0) / 1000 * 60; render(at); } requestAnimationFrame(tick); }
  window.addEventListener('resize', function () { fit(); render(at); });
  window.addEventListener('keydown', function (e) { if (e.key === ' ') { paused = !paused; e.preventDefault(); } });
  window.demo = { frames: LAP, fps: 60, info: null, seek: function (f) { playing = false; at = f; fit(); render(f); return f; } };
  window.demo.ready = SpriteStack.load(PARTS, 'art/').then(function (art) {
    ART = art; window.demo.info = simulate(); fit(); render(0);
    requestAnimationFrame(function (t) { t0 = t; tick(t); });
    return window.demo.info;
  });
})();
