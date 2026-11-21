// examples/robot/character.js: a second character on the same kit. A small two-legged machine: a boxy body with
// one eye, an aerial, no arms, and knees that bend backwards. Only this file differs from the explorer.
//
//   node tools/build-art.js examples/robot      then open      index.html?char=robot
(function (root, def) {
  if (typeof module === 'object' && module.exports) module.exports = def; else root.CHARACTER = def;
})(typeof self !== 'undefined' ? self : this, (function () {
  const disc = function (x, y, r) { return x * x + y * y <= r * r; };

  return {
    name: 'robot',

    materials: {
      shell: ['#4f3f8f', '#6a57b8', '#8d7bdc'],
      trim: ['#c9c2d8', '#e3ddef', '#fbf8ff'],
      lens: ['#b8862a', '#f0c24a', '#fff0a8'],
      joint: ['#2a2433', '#3b3348', '#51475f'],
      foot: ['#8f879c', '#b3abc0', '#d6cfe0'],
      lamp: ['#c23a6b', '#ef5c8e', '#ff9dbb']
    },

    parts: [
      { name: 'body', w: 12, h: 12, layers: 9, fn: function (x, y, z) {
        const ax = Math.abs(x), ay = Math.abs(y), r = z === 0 || z === 8 ? 4.2 : 5.2;        // a box with its top and bottom edges cut in
        if (ax > r || ay > r || ax + ay > r * 1.62) return null;
        if (x > 3.6 && z >= 3 && z <= 6 && ay < 2.1) return ay < 0.9 && (z === 4 || z === 5) ? 'joint' : 'lens';   // the eye, on the front
        if (z === 2 || z === 7) return 'trim';                                               // two pale bands
        return 'shell';
      } },
      { name: 'aerial', w: 3, h: 3, layers: 6, fn: function (x, y, z) { return z >= 4 ? (disc(x, y, 1.3) ? 'lamp' : null) : disc(x, y, 0.6) ? 'trim' : null; } },
      { name: 'upper', w: 5, h: 5, layers: 1, fn: function (x, y) { return disc(x, y, 1.7) ? 'joint' : null; } },
      { name: 'lower', w: 5, h: 5, layers: 1, fn: function (x, y) { return disc(x, y, 1.3) ? 'trim' : null; } },
      { name: 'foot', w: 6, h: 5, layers: 2, fn: function (x, y, z) { return Math.abs(y) < (z ? 1.2 : 2.1) && x > (z ? -1.2 : -2.1) && x < (z ? 1.2 : 2.7) ? 'foot' : null; } }
    ],

    rig: {
      thigh: 5.5, shin: 6, ankle: 1,
      hipHalf: 3.6, standHip: 9.6,
      kneeHint: -1,                         // backward knees
      stride: 14, duty: 0.62, lift: 2.6,
      bob: 0.55, twist: 0.1,
      spine: 8,
      arms: false
    },

    view: { scale: 10, pitch: 42, shadow: 3.6 },
    walk: { strides: 12, lapFrames: 540 },

    draw: function (R, art, P) {
      for (let i = 0; i < 2; i++) {
        const L = P.legs[i];
        R.stack(art.foot, L.sole[0], L.sole[1], L.sole[2], L.rot);
        R.limb(art.lower, L.ankle, L.knee, 5); R.limb(art.upper, L.knee, L.hip, 4);
      }
      const z0 = P.pelvis[2] - 1, a = P.heading + (P.hipsAngle - P.heading) * 0.6;           // the whole body turns a little with the hips
      R.stack(art.body, P.x, P.y, z0, a);
      R.stack(art.aerial, P.x - Math.cos(a) * 2.5 - Math.sin(a) * 2.5, P.y - Math.sin(a) * 2.5 + Math.cos(a) * 2.5, z0 + art.body.n, a);
    }
  };
})());
