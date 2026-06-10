#!/bin/bash
# Mode2 NVENC合成模板 — 改 LESSON 即可
# 用法: bash nvenc-template.sh

LESSON="03"   # 改这里
BASE="$HOME/course-studio"
FRAMES="$BASE/frames-l${LESSON}"
AUDIO="$BASE/scenes/lesson-${LESSON}-mixed.m4a"
OUTPUT="$BASE/scenes/lesson-${LESSON}-v1.mp4"

ffmpeg -y -framerate 15 \
  -i "${FRAMES}/frame_%04d.png" \
  -i "${AUDIO}" \
  -c:v h264_nvenc -preset p5 -cq 20 \
  -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a copy -shortest -movflags +faststart \
  "${OUTPUT}"

echo "=== 输出: ${OUTPUT} ==="
ls -lh "${OUTPUT}"
