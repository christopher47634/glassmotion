# 批量课程视频生产流水线

## 适用场景
同一模块多课（3-5课）需要一致主题+动效时，用此流水线并行生产。

## 核心思路
1. **数据驱动HTML生成** — 不逐课手写HTML，而是定义LESSONS数据结构（每课的scenes、subtitles、cards），用Python生成器统一出HTML
2. **共享CSS/JS模板** — HUD、shimmer、stagger、glow等动效写成一个DARK_CSS常量，所有课复用
3. **并行截帧+编码** — 4课Playwright截帧同时跑（background进程），编码也并行

## 流水线步骤

### Step 1: 提取逐字稿 + TTS（串行，~2分钟）
```bash
for i in 19 20 21 22; do
  edge-tts --voice zh-CN-XiaoxiaoNeural --file lesson-${i}-script.txt \
    --write-media lesson-${i}-voiceover.mp3 \
    --write-subtitles lesson-${i}-voiceover.vtt
done
```

### Step 2: 生成HTML（单次Python脚本）
写一个 `gen-lessons.py`，内含：
- LESSONS字典：每课的title、scenes（含icon/sh/gradient/num/title/cards/homework）、subtitles数组
- DARK_CSS或LIGHT_CSS常量（共享模板）
- generate_scene_html()函数
- generate_lesson()函数 → 输出完整HTML

```python
for num, data in LESSONS.items():
    html, bounds, dur = generate_lesson(num, data)
    with open(f'/tmp/lesson-{num}.html', 'w') as f:
        f.write(html)
```

### Step 3: 验证HTML（串行，~30秒）
```bash
for i in 19 20 21 22; do
  # 测试seekTo函数是否存在、有无JS错误
  python3 -c "..."
done
```

### Step 4: 并行截帧（4进程，~8分钟）
```bash
# 写通用截帧脚本 capture-generic.py（接受lesson_num参数）
# 自动从VTT读取duration，计算EXPECTED帧数
python3 capture-generic.py 19 &
python3 capture-generic.py 20 &
python3 capture-generic.py 21 &
python3 capture-generic.py 22 &
# 用 terminal(background=true, notify_on_complete=true) 启动4个进程
```

### Step 5: 检查帧数（串行，~2分钟）
```bash
for i in 19 20 21 22; do
  total=$(ls frames-l${i}/*.png | wc -l)
  small=$(find frames-l${i} -name "*.png" -size -100k | wc -l)
  echo "L${i}: ${total} frames, ${small} small"
done
```

### Step 6: 并行编码（4进程，~1分钟）
```bash
ffmpeg -y -framerate 15 -i frames-l19/frame_%04d.png -i lesson-19-voiceover.mp3 \
  -c:v h264_nvenc -preset p5 -cq 20 -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a aac -b:a 192k -shortest -movflags +faststart lesson-19-v1.mp4 &
# ... 4个并行
```

### Step 7: 复制+弹出
```bash
for i in 19 20 21 22; do
  cp lesson-${i}-v1.mp4 ~/Downloads/
done
```

## 通用截帧脚本 (capture-generic.py)
位置：/tmp/capture-generic.py
- 参数：lesson_num（整数）
- 自动从VTT读duration → 计算帧数
- 输出到 /tmp/frames-l{num}/
- 帧率15fps，viewport 1080x1920

## 注意事项
- 小帧（<100KB）在场景切换瞬间是正常的，不影响最终视频
- NVENC并行编码时GPU利用率会升高，但不影响速度（~10-14x realtime）
- 4个Playwright进程并行时内存占用约4GB，WSL默认8GB够用
- VTT中避免中文引号（""），会导致JS解析失败
