---
name: animated-sprite-stacks
description: Build and animate sprite-stacked characters and objects (pseudo-3D pixel art drawn from a stack of flat 2D slices) on a plain 2D canvas, with a walking rig. Use when asked for a sprite stack that moves or walks, a rigged or IK-driven sprite-stack character, a skeleton overlay or exploded "spread" view of a stack, a seamless looping GIF or MP4 of one, or when someone doubts that sprite stacks can be animated. Covers slice strips, bottom-to-top drawing with drawImage, part stacks, distance-driven gait, two-bone leg IK, loop seams and deterministic capture.
---

# Animated sprite stacks

A sprite stack is a strip image: the slices of an object side by side, bottom slice first. Drawing it means
drawing every slice with `drawImage`, turned by the object's angle, each a little further up the screen than the
one below. No depth buffer, no geometry, no shader. Animating one means cutting the character into several small
stacks and moving those with a rig.

A working reference is in this repository: `js/stack.js` (drawing), `js/rig.js` (gait and IK), `js/demo.js`
(a man assembled from seven strips), `tools/build-art.js` (strips from functions), `tools/capture.py` and
`tools/encode.sh` (GIF and MP4). Read those before writing your own; they are short.

## 1. Slices and strips

- One PNG per part. Cells of equal size, bottom slice first, the stack's turning axis at the centre of each cell.
- Draw them by hand in a pixel editor, or generate them from a function `(x, y, z) -> colour` as
  `tools/build-art.js` does. Either way the page only ever sees flat images.
- Bake shading into the slices. A pixel with nothing above it is a "top" and gets a lighter tone; the rest are
  seen only as the side of a layer and get a darker tone. Without this, a stack of one colour is a blob.
- Keep +x as "forward" in every strip so one angle turns every part the same way.

## 2. Drawing a stack

World coordinates: x and y on the ground, z up, in art pixels. The camera has a fixed pitch.

```js
const ys = Math.sin(pitch);            // how flat the ground looks
const zk = scale * Math.cos(pitch);    // screen rows per layer of height
// one slice:
ctx.setTransform(1, 0, 0, 1, ox + scale * x, oy + scale * y * ys - z * zk);
ctx.scale(1, ys);
ctx.rotate(angle);
ctx.drawImage(strip, i * cw, 0, cw, ch, -cw * scale / 2, -ch * scale / 2, cw * scale, ch * scale);
```

Rules that matter:

- **Fill the layer's thickness.** A layer is `zk` screen rows tall but a slice is flat, so draw each slice
  `ceil(zk)` times, one row apart. Otherwise the background shows between layers.
- **Sort everything by height, bottom to top.** Queue every slice row of every part with its screen height,
  sort, then draw. Drawing part by part is wrong as soon as two parts overlap (an arm in front of a chest).
  Keep the sort stable so equal heights keep their queue order.
- **Round positions to whole pixels** and set `imageSmoothingEnabled = false`, or the stack shimmers.
- **Draw to a small offscreen canvas and scale that up** with smoothing off. It keeps pixels square at any
  output size and lets you fade the whole stack with one `globalAlpha` (fading slice by slice shows the layers
  through each other).
- Draw calls add up: slices x rows per slice. The demo man is about 450 `drawImage` calls a frame at 8x.
  That is fine for a few characters. For a crowd, lower the scale (fewer rows per layer) or cache a rendered
  stack per angle step.

## 3. Parts

Cut the character where it bends: head, torso, and one small disc image each for thigh, shin and arm, plus
boots and hands. A limb is the disc repeated along a bone.

- Give each torso slice its own angle, blended from the hips' angle at the bottom to the shoulders' at the top.
  That is the whole "twist" of a walk and it costs nothing.
- A disc is one layer thick and is drawn upward from its z. Place discs half a layer under the bone
  (`z - 0.5`) so the bone runs through their middle. If you skip this the skeleton overlay sits visibly low.

## 4. The walk

Two ideas (see `js/rig.js`):

1. **The step clock runs on distance, not time.** `phase += distanceMoved / strideLength`. Each leg uses
   `(phase + i * 0.5) % 1`. Below `duty` (about 0.6 for a walk) the foot is planted, above it the foot swings.
   Feet cannot slide, and stopping the body stops the legs.
2. **A planted foot is a fixed point in the world.** At touchdown, put it half a stance length ahead of the hip
   (stance = duty x stride) and then do not touch its x and y until it lifts. During the swing, ease from the
   lift-off point to where it must land: the hip's position at touchdown plus half a stance. Lift is
   `sin(pi * u)`.

On top of that:

- **Two-bone IK for the knee.** Hip and ankle are known, thigh and shin lengths are fixed. With `d` the
  hip-to-ankle distance, `cosA = (a*a + d*d - b*b) / (2*a*d)`; the knee is `a*cosA` along the hip-to-ankle line
  and `a*sinA` along the bend direction (the heading, with its part along the line removed). Clamp `d` to the
  reach. The same function bends the elbows with the hint pointing backwards.
- **Hip height is solved, not animated.** `hipZ = min(standing, ankle + sqrt(reach^2 - far^2))` where `far` is
  the largest horizontal distance from a hip to its planted foot. The body sinks exactly as much as the legs
  need.
- **Bob** is `-cos(4*pi*phase)` (twice a stride), **twist** is `cos(2*pi*phase)`; hips turn with the leading
  leg, shoulders the other way, arms swing against the legs.
- Keep the rig free of drawing. `pose()` returns plain joints, so the art and the skeleton overlay read the same
  numbers and cannot disagree.

## 5. Skeleton overlay and spread view

- Skeleton: project the pose joints with the same function the slices use, draw lines and small circles in one
  colour on top. Mark a planted foot with a ring on the ground: it visibly stays put while the body passes.
- When the camera follows the character, draw marks fixed to the ground (a dot grid). Without them nothing
  shows that the feet hold still.
- Spread view: multiply the height step between layers and thin each slice to two or three rows.
  **Layers of the same colour merge into one mass** at any normal camera pitch, because each sheet is far
  deeper than the gap you can afford. Draw each slice once more underneath in one dark colour, a few pixels
  lower: the dark edge separates the sheets. Zoom out as the spread grows so the taller stack fits, and say on
  screen that the gaps are for show.

## 6. Seamless loops and capture

- **Make the page a pure function of the frame number.** Simulate the walk once with a fixed step, keep the
  poses in an array, and expose `seek(frame)`. Live playback just asks for `seconds * 60`.
- **Loop seam: walk a whole number of strides.** For a circle, pick the radius so that the lap's chords add up
  to `N x stride`. Walk a few laps before recording so the start-up is forgotten, then keep one lap. Check it:
  compare the pose at the first frame of two successive laps; the difference should be rounding error.
- Every on-screen fade must also return to its start value by the end of the lap.
- Capture with headless Chromium: `seek(f)`, screenshot, repeat (`tools/capture.py`). Never record in real
  time; it drops frames and is not repeatable.
- GIF: `palettegen=stats_mode=full` then `paletteuse=dither=none:diff_mode=rectangle`. No dithering keeps flat
  pixel art flat and the file small (a 9 s, 640x360, 30 fps loop is 2 to 3 MB). MP4: capture at
  `device_scale_factor=3` for 1080p, `libx264 -crf 14 -pix_fmt yuv420p`.

## Pitfalls

| Symptom | Cause | Fix |
| --- | --- | --- |
| Background shows between layers | one draw per slice | repeat each slice `ceil(zk)` rows |
| A near part is hidden by a far one | drawn part by part | one height-sorted queue for all parts |
| Skeleton sits below the limbs | discs drawn upward from the bone | place discs at `z - 0.5` |
| Feet slide | clock driven by time | drive the phase by distance moved |
| Loop jumps at the wrap | lap is not a whole number of strides, or no warm-up lap | size the path to `N x stride`, keep a later lap |
| Spread view looks like a blurred stack | same-colour sheets overlap | dark edge under each slice, thinner slices |
| Fade shows inner layers | per-slice alpha | render the stack opaque offscreen, fade the blit |
| Stack shimmers when turning | fractional positions or smoothing | round positions, smoothing off |

## Is this voxels?

No. The source is a handful of small flat images, the only drawing call is `drawImage`, and nothing stores or
tests depth. Repeating a slice a few rows to fill a layer's thickness is still the same flat image drawn again.
A function that decides what colour each point of each layer has is a convenient way to *author* slices; the
output is ordinary PNG strips that could have been painted by hand.
