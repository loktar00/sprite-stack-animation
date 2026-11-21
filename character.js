// character.js: everything that makes this character this character. Swap the file and you have another one.
//
//   materials  colours, three tones each: [side in shade, side, top]
//   parts      the stacks. w is front to back (+x is forward), h is side to side, layers is the height, all in
//              art pixels. fn(x, y, z) says which material fills that point of layer z (x and y measured from
//              the middle of the cell), or null for empty. A part WITHOUT fn is hand-drawn: put your own
//              art/<name>.png there (see README, "Strip format") and the builder leaves it alone.
//   rig        the skeleton and the walk, in the same art pixels (js/rig.js explains each number)
//   view       how the page shows it
//   walk       the looping demo: one lap of the circle is lapFrames steps of 1/60 s and exactly `strides` strides
//   draw       puts the stacks on the joints, every frame
//
// After changing materials or parts run:  node tools/build-art.js
// The rig, view, walk and draw sections are read by the page directly: just reload.
(function (root, def) {
  if (typeof module === 'object' && module.exports) module.exports = def; else root.CHARACTER = def;
})(typeof self !== 'undefined' ? self : this, (function () {
  const ell = function (x, y, rx, ry) { return (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1; };

  return {
    name: 'explorer',

    materials: {
      suit: ['#aaa493', '#cfc8b6', '#f0ebdd'],
      trouser: ['#565d70', '#6f7689', '#8990a3'],
      pack: ['#84302b', '#ad3f38', '#d4594d'],
      boot: ['#a87c1a', '#d6a428', '#f2c94f'],
      dark: ['#2c303b', '#3d4250', '#525869'],
      visor: ['#10162a', '#1b2440', '#2a3660'],
      glint: ['#7c9bd4', '#9db8e8', '#c4d8f6'],
      panel: ['#2f7f6a', '#3fa487', '#63c9a8']
    },

    parts: [
      { name: 'head', w: 12, h: 12, layers: 10, fn: function (x, y, z) {
        const zc = z + 0.5 - 5.0, r2 = 5.7 * 5.7 - zc * zc * 1.25; if (r2 <= 0 || x * x + y * y > r2) return null;
        if (x > 1.6 && Math.abs(y) < 3.8 && z >= 3 && z <= 6) return z === 6 && y < -1.4 && y > -3.2 ? 'glint' : 'visor';
        if (Math.abs(y) < 0.9 && x < 1.5 && z >= 7) return 'pack';            // a stripe over the top of the helmet
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
      // limbs: one small disc each, repeated along a bone by draw() below
      { name: 'arm', w: 5, h: 5, layers: 1, fn: function (x, y) { return ell(x, y, 1.8, 1.8) ? 'suit' : null; } },
      { name: 'hand', w: 5, h: 5, layers: 1, fn: function (x, y) { return ell(x, y, 1.5, 1.5) ? 'boot' : null; } },
      { name: 'thigh', w: 5, h: 5, layers: 1, fn: function (x, y) { return ell(x, y, 2.4, 2.4) ? 'trouser' : null; } },
      { name: 'shin', w: 5, h: 5, layers: 1, fn: function (x, y) { return ell(x, y, 2.05, 2.05) ? 'trouser' : null; } },
      { name: 'boot', w: 7, h: 5, layers: 3, fn: function (x, y, z) { return x > -2.4 && x < (z === 2 ? 1.0 : z === 1 ? 2.8 : 3.3) && Math.abs(y) < 2.0 ? 'boot' : null; } }
    ],

    rig: {
      thigh: 7, shin: 7, ankle: 1.5,        // leg bones, and the ankle's height over the sole
      hipHalf: 2.4, standHip: 13.2,         // half the hip width; hip height when standing
      kneeHint: 1,                          // 1: knees bend forward; -1: backward, like a bird
      stride: 18, duty: 0.6, lift: 2.4,     // ground covered per cycle (two steps); part of a cycle a foot is down; swing height
      bob: 0.35, twist: 0.16,               // hips rise and fall; hips turn with the leading leg (radians)
      spine: 9.5,                           // from the hips up to the shoulders
      arms: true, shoulderHalf: 7.5, upperArm: 4.6, foreArm: 4.6, armSwing: 0.55
    },

    view: { scale: 8, pitch: 42, shadow: 3.2 },   // screen pixels per art pixel; camera angle above the ground in degrees; shadow radius
    walk: { strides: 10, lapFrames: 540 },

    // P is the pose from Rig.pose(): joints as [x, y, z]. R is the renderer (js/stack.js), art the loaded strips.
    draw: function (R, art, P) {
      for (let i = 0; i < 2; i++) {
        const L = P.legs[i], A = P.arms[i];
        R.stack(art.boot, L.sole[0], L.sole[1], L.sole[2], L.rot);
        R.limb(art.shin, L.ankle, L.knee, 5); R.limb(art.thigh, L.knee, L.hip, 5);
        R.limb(art.arm, A.shoulder, A.elbow, 4); R.limb(art.arm, A.elbow, A.hand, 4);
        R.limb(art.hand, A.hand, A.hand, 1);
      }
      // the torso: every slice has its own angle, from the angle of the hips at the bottom to that of the shoulders at the top
      const T = art.torso, z0 = P.pelvis[2] - 1;
      for (let i = 0; i < T.n; i++) { const t = Math.min(1, i / (T.n - 3)); R.slice(T, i, P.x, P.y, z0 + i, P.hipsAngle + (P.shouldersAngle - P.hipsAngle) * t, 1); }
      R.stack(art.head, P.x, P.y, z0 + T.n, P.heading);
    }
  };
})());
