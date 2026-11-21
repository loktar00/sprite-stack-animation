// bones.js: draw a pose from js/rig.js as a skeleton. Used by steps 07 to 09.
// pr(point) turns a joint [x, y, z] into a canvas position; pass the renderer's project.
function drawBones(pr, P, alpha) {
  const S = Step, c = S.ctx, j = function (p) { return pr(p[0], p[1], p[2]); };
  c.save(); c.globalAlpha = alpha === undefined ? 1 : alpha; c.lineWidth = 2;
  c.setLineDash([3, 4]); S.line(j([P.x, P.y, 0]), j(P.pelvis)); c.setLineDash([]);          // hip height
  for (let i = 0; i < 2; i++) {
    const L = P.legs[i], A = P.arms[i];
    S.line(j(L.hip), j(L.knee)); S.line(j(L.knee), j(L.ankle));
    if (A) { S.line(j(A.shoulder), j(A.elbow)); S.line(j(A.elbow), j(A.hand)); S.dot(j(A.shoulder), 3); S.dot(j(A.elbow), 2.5); S.dot(j(A.hand), 2.5); }
    if (L.planted) { const q = j([L.sole[0], L.sole[1], 0]); c.strokeStyle = S.PIN; c.beginPath(); c.ellipse(q[0], q[1], 9, 6, 0, 0, S.TAU); c.stroke(); }
    S.dot(j(L.hip), 3); S.dot(j(L.knee), 3); S.dot(j(L.ankle), 3, L.planted ? S.PIN : S.BG);
  }
  S.line(j(P.legs[0].hip), j(P.legs[1].hip)); S.line(j(P.pelvis), j(P.top));
  if (P.arms.length) S.line(j(P.arms[0].shoulder), j(P.arms[1].shoulder));
  S.dot(j(P.pelvis), 3.5); S.dot(j(P.top), 3);
  c.restore();
}
// ground marks every 3 art pixels, so the eye can tell what moves and what stays
function drawGround(R, ox, oy) {
  const c = Step.ctx, gs = 3 * R.scale; c.fillStyle = '#40374c';
  for (let gy = Math.floor(-oy / (gs * R.ys)); gy * gs * R.ys + oy < Step.H; gy++) for (let gx = Math.floor(-ox / gs); gx * gs + ox < Step.W; gx++) c.fillRect(ox + gx * gs - 1, oy + gy * gs * R.ys - 1, 2, 2);
}
