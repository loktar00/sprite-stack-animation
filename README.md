# Sprite stack animation

![A sprite-stacked man walking: the stack, the stack spread apart, the stack with its skeleton, the skeleton](media/walk.gif)

A sprite-stacked character that walks, on a plain 2D canvas. The whole man is seven small PNG strips. Every slice
on screen is one `drawImage` call. The legs are driven by a distance-based gait with planted feet and two-bone IK.

Open `index.html` in a browser. It runs from the file system or any static server; there is nothing to install.

## How it works

**The art** is a strip per body part: its slices side by side, bottom slice first.

![The seven strips, enlarged](media/strips.png)

Head (10 slices), torso with backpack (12), and one small disc each for arm, hand, thigh and shin, plus a boot (3).
A limb is its disc repeated along a bone.

**Drawing** (`js/stack.js`). Each slice is drawn with `translate`, `scale(1, ys)` to flatten the ground,
`rotate` for the facing, then `drawImage`. A slice sits a little further up the screen than the one below it.
Each slice is repeated a few rows so a layer has thickness. All slices of all parts go into one queue, sorted by
height and drawn bottom to top, so nearer and higher things cover what is behind them without any depth test.

**The walk** (`js/rig.js`).

- The step clock runs on distance covered, not time, so feet never slide.
- A planted foot is a fixed point in the world; the body travels over it. A swinging foot eases to where it
  will be needed next.
- The knee is solved every frame from hip and foot with the law of cosines (analytic two-bone IK), bending
  towards the heading. The elbows use the same function.
- Hip height is solved so the planted leg can always reach. The hips bob twice a stride and turn with the
  leading leg; the shoulders turn the other way.

**The loop** (`js/demo.js`). He walks a circle sized to be exactly ten strides, so the last frame leads into the
first. The page is a function of the frame number, which makes capture repeatable.

Views: `?view=stack`, `?view=spread`, `?view=rig`, `?view=bones`, and `?wide` for the whole circle.

## Is this voxels?

No. The inputs are flat images and the only drawing call is `drawImage`. There is no depth buffer, no mesh and
no shader. Repeating a slice a few rows to fill a layer is the same flat image drawn again.

`tools/build-art.js` writes the strips from small functions that say what colour each point of each layer is.
That is just a way to author slices; the output is ordinary PNG strips, and strips painted by hand in a pixel
editor work exactly the same.

In the spread view the layers are pulled apart to show them. The gaps, the thinner slices and the dark edge under
each one are for show and are not part of normal drawing.

## Files

| Path | What |
| --- | --- |
| `index.html` | the demo page |
| `js/stack.js` | sprite stacking on a 2D canvas |
| `js/rig.js` | gait, planted feet, two-bone IK |
| `js/demo.js` | the man, the skeleton overlay, the views, the frame clock |
| `art/` | the PNG strips and their cell sizes |
| `tools/build-art.js` | writes `art/` and `media/strips.png` (`node tools/build-art.js`, no dependencies) |
| `tools/capture.py`, `tools/encode.sh` | frames, GIF and MP4 |
| `skills/animated-sprite-stacks/SKILL.md` | the technique written up as an agent skill |

## Making the GIF

Needs Python with Playwright (`pip install playwright`, `playwright install chromium`) and ffmpeg.

```sh
sh tools/encode.sh walk
```

This steps the page frame by frame in headless Chromium and writes `out/walk.gif` (640x360, 30 fps) and
`out/walk.mp4` (1920x1080, 60 fps). Nothing is recorded in real time, so the result is identical on every run.

## Using the pieces

```html
<script src="js/stack.js"></script>
<script src="js/rig.js"></script>
<script>
  SpriteStack.load([{ name: 'torso', cw: 12, ch: 16, n: 12 }], 'art/').then(function (art) {
    const ctx = document.querySelector('canvas').getContext('2d');
    const r = SpriteStack.createRenderer(ctx, { scale: 6, pitch: 42 * Math.PI / 180 });
    r.begin(160, 140);                 // where the world's origin lands on the canvas
    r.stack(art.torso, 0, 0, 0, 0.6);  // stack, x, y, z, angle
    r.flush();                         // draw everything queued, lowest first
  });
</script>
```

`Rig.createWalker()`, `Rig.step(walker, x, y, heading, dt)` once per fixed step, then `Rig.pose(walker)` gives
hips, knees, ankles, shoulders, elbows and hands as `[x, y, z]`.

## Licence

MIT. See `LICENSE`.
