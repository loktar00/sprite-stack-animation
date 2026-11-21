// ik2d.js: two-bone IK in a side view, where a point is [x, z] (forward, up). Used by steps 04 to 06.
// The 3D version in js/rig.js (solveTwoBone) is the same sum with one more coordinate.
//
// hip and foot are known; a and b are the lengths of thigh and shin; hint is the direction the knee should bend to.
// hip, knee and foot make a triangle with sides a, b and d (hip to foot), so the angle at the hip is
//   cosA = (a*a + d*d - b*b) / (2*a*d)                      (the law of cosines)
// and the knee is a*cosA along the hip-to-foot line and a*sinA out to the side the hint points to.
function solveKnee(hip, foot, a, b, hint) {
  let dx = foot[0] - hip[0], dz = foot[1] - hip[1];
  const len = Math.hypot(dx, dz) || 1e-6; dx /= len; dz /= len;
  const d = Math.min(Math.max(len, Math.abs(a - b) + 0.001), a + b - 0.001);   // too far to reach: the leg is straight
  const cosA = (a * a + d * d - b * b) / (2 * a * d), sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  let px = -dz, pz = dx;                                                      // at right angles to the hip-to-foot line...
  if (px * hint[0] + pz * hint[1] < 0) { px = -px; pz = -pz; }                // ...on the side the hint points to
  return [hip[0] + dx * a * cosA + px * a * sinA, hip[1] + dz * a * cosA + pz * a * sinA];
}
