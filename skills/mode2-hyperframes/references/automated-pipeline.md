# 全自动视频生产管线（Automated Pipeline）

当 User 说"直接做"/"全自动"/"不用确认"时，跳过逐步确认，执行完整管线。

## 完整流程

```
1. 提取口播文本 → /tmp/lesson-XX-script.txt
2. edge-tts 生成语音+VTT → /tmp/lesson-XX-voiceover.mp3 + .vtt
3. 按分镜表写HTML → /tmp/lesson-XX.html（逐场景从零设计）
4. 3帧验证 → /tmp/verify-lXX/verify_tN.png
5. 全量截帧 → /tmp/frames-lXX/（background=true, notify_on_complete=true）
6. 质量检查 → 帧数/空白帧/抽查
7. FFmpeg NVENC 编码 → /tmp/lesson-XX-vN.mp4
8. 复制到 E:\Downloads\ + 弹出播放
```

## 质量检查脚本模板

```bash
#!/bin/bash
FRAMES_DIR="/tmp/frames-lXX"
EXPECTED=<DURATION * FPS>

echo "=== 质量检查 ==="

# 帧数
ACTUAL=$(ls "$FRAMES_DIR"/frame_*.png 2>/dev/null | wc -l)
echo "帧数: $ACTUAL / $EXPECTED"
[ "$ACTUAL" -ne "$EXPECTED" ] && echo "❌ 帧数不匹配!" && exit 1
echo "✓ 帧数正确"

# 空白帧
SMALL=$(find "$FRAMES_DIR" -name "frame_*.png" -size -100k | wc -l)
echo "空白帧(<100KB): $SMALL"
[ "$SMALL" -gt 0 ] && echo "❌ 发现空白帧!" && exit 1
echo "✓ 无空白帧"

# 抽查
ls -la "$FRAMES_DIR"/frame_00000.png | awk '{print "  首帧: " $5/1024 " KB"}'
ls -la "$FRAMES_DIR"/frame_$(printf "%05d" $((EXPECTED/2))).png | awk '{print "  中帧: " $5/1024 " KB"}'
ls -la "$FRAMES_DIR"/frame_$(printf "%05d" $((EXPECTED-1))).png | awk '{print "  末帧: " $5/1024 " KB"}'

echo "=== 检查通过 ==="
```

## NVENC 编码脚本模板

```bash
#!/bin/bash
set -e
FRAMES_DIR="/tmp/frames-lXX"
AUDIO="/tmp/lesson-XX-voiceover.mp3"
OUTPUT="/tmp/lesson-XX-vN.mp4"

ffmpeg -y -framerate 15 \
  -i "$FRAMES_DIR"/frame_%05d.png \
  -i "$AUDIO" \
  -c:v h264_nvenc -preset p5 -cq 20 \
  -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a aac -b:a 192k \
  -shortest -movflags +faststart \
  "$OUTPUT"

ffprobe -v error -show_entries stream=width,height,r_frame_rate,duration -of csv=p=0 "$OUTPUT"
cp "$OUTPUT" "~/Downloads/$(basename $OUTPUT)"
cmd.exe /c start "" "E:\\Downloads\\$(basename $OUTPUT)"
```

## 注意事项

- 截帧必须 `background=true, notify_on_complete=true`
- 编码 timeout 设 120s（NVENC 2085帧约10秒）
- cmd.exe start 可能超时但不影响结果，文件已复制
- 版本轮转：新版本放 /tmp 暂存旧版，E:\Downloads 只保留最新
