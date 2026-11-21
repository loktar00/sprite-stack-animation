#!/bin/sh
# encode.sh: capture one lap and make a looping GIF and an MP4.   sh tools/encode.sh [name] [query]
# Needs python with Playwright (see capture.py) and ffmpeg. Output goes to out/.
set -e
cd "$(dirname "$0")/.."
NAME=${1:-walk}; QUERY=$2; PY=${PYTHON:-python3}
mkdir -p out
# GIF: 640x360, every second step of the 60-a-second clock = 30 frames a second. The palette is made from the
# frames themselves (palettegen), and there is no dithering: flat pixel art stays flat and the file stays small.
$PY tools/capture.py out/$NAME-gif --scale 1 --step 2 --query "$QUERY"
ffmpeg -v error -y -framerate 30 -i out/$NAME-gif/%04d.png -vf "split[a][b];[a]palettegen=max_colors=256:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" -loop 0 out/$NAME.gif
# MP4: 1920x1080, every step = 60 frames a second, the lap played twice
$PY tools/capture.py out/$NAME-mp4 --scale 3 --step 1 --query "$QUERY"
ffmpeg -v error -y -stream_loop 1 -framerate 60 -i out/$NAME-mp4/%04d.png -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -movflags +faststart out/$NAME.mp4
ls -l out/$NAME.gif out/$NAME.mp4
