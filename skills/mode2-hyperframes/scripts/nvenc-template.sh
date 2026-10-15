#!/usr/bin/env bash
# Mode2 帧序列 + 混音 -> MP4
# 用法: bash nvenc-template.sh <帧目录> <音频文件> <输出.mp4> [fps，默认 15]
# 编码器：默认 h264_nvenc（NVIDIA GPU）；没有 NVENC 时设 ENCODER=libx264
#   ENCODER=libx264 bash nvenc-template.sh frames mixed.m4a out.mp4
set -euo pipefail

if [ $# -lt 3 ]; then
  sed -n '2,5p' "$0"
  exit 2
fi

FRAMES="$1"
AUDIO="$2"
OUTPUT="$3"
FPS="${4:-15}"
ENCODER="${ENCODER:-h264_nvenc}"

[ -f "${FRAMES}/frame_00000.png" ] || { echo "ERROR: ${FRAMES}/frame_00000.png 不存在（帧命名应为 frame_%05d.png）" >&2; exit 1; }
[ -f "$AUDIO" ] || { echo "ERROR: 音频不存在: $AUDIO" >&2; exit 1; }

case "$ENCODER" in
  h264_nvenc) VOPTS=(-c:v h264_nvenc -preset p5 -cq 20) ;;
  libx264)    VOPTS=(-c:v libx264 -preset medium -crf 18) ;;
  *) echo "ERROR: 不支持的 ENCODER=$ENCODER" >&2; exit 1 ;;
esac

ffmpeg -hide_banner -y -framerate "$FPS" \
  -i "${FRAMES}/frame_%05d.png" \
  -i "$AUDIO" \
  "${VOPTS[@]}" \
  -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a aac -b:a 192k -shortest -movflags +faststart \
  "$OUTPUT"

echo "=== 输出: ${OUTPUT} ==="
ls -lh "$OUTPUT"
