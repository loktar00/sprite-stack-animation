#!/bin/sh
# tutorial-images.sh: the pictures in docs/TUTORIAL.md, one per step page, captured by frame number.
# Needs python with Playwright and ffmpeg (see capture.py). Each is a looping GIF, 480x300, 30 frames a second.
set -e
cd "$(dirname "$0")/.."
PY=${PYTHON:-python3}
mkdir -p out docs/img
for n in 01 02 03 04 05 06 07 08 09; do
  $PY tools/capture.py out/step-$n --page docs/steps/$n.html --size 480x300 --step 2
  ffmpeg -v error -y -framerate 30 -i out/step-$n/%04d.png -vf "split[a][b];[a]palettegen=max_colors=128:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -loop 0 docs/img/$n.gif
done
ls -l docs/img
