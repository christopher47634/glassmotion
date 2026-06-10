# ⚠️ 已废弃 — 批量课程视频生产管线（L04-L10 实战沉淀）

> **2026-06-06 废弃**：此文件描述的批量模板驱动流程已被禁止。
> 新工序见 `references/per-scene-workflow.md`（逐场景从零设计）。
> 保留此文件仅作技术参考（BGM 校准数据、NVENC 参数、混音方案等仍有效）。
> **禁止按此文件的"批量管线顺序"和"模板驱动 HTML 生成"执行。**

---

## 触发条件

User 给出多课逐字稿（如"第4-10课逐字稿"），要求批量生产视频。

## 完整管线顺序

```
1. 批量 TTS（顺序执行，edge-tts 不能并行）
2. 批量 VTT → JSON 解析
3. 逐课生成字体子集（每课独立 pyftsubset）
4. 逐课生成 HTML（模板 + 占位符替换）
5. 逐课 3 帧验证（vision_analyze）
6. 逐课截帧（background=true）
7. 逐课混音 + NVENC 编码
8. 逐课弹出给 User（cp + explorer.exe /select）
```

## 关键决策

### 字体子集按课独立
- 合并多课字符集 → 185KB+ base64，拖慢 Playwright
- 每课独立子集 → 50-85KB，合理范围
- 命令：`pyftsubset --text="<该课HTML用到的字符>" --output-file=/tmp/lxgw-lXX.woff2 --flavor=woff2`

### BGM 轮换
User 会要求"切换下 BGM 丰富一点"。默认每课不同 track：
- L04=track-897, L05=track-738, L06=track-443, L07=track-32
- L08=track-897, L09=track-738, L10=track-443（循环）
- 音量：课程视频 volume=0.15（比短视频 0.18 稍低）
- BGM 时长必须 ≥ TTS 时长，不够换一首

### 大脚本用 write_file 不用 heredoc
User 会阻断超过 ~100 行的 heredoc（`BLOCKED: User denied this command`）。
- 小脚本 <50 行 → terminal 直接执行
- 大脚本 >50 行 → write_file 写到文件再 terminal 执行
- 模板脚本 → write_file 写模板，terminal Python 做占位符替换

## 场景边界自动计算

从 VTT 字幕自动计算：
1. 解析 VTT → 获取每条字幕的 start/end
2. 按语义分组（每组 ≈ 20-40 秒）
3. 每组 = 一个场景，边界 = 第一条 start 到最后一条 end
4. totalDuration = 最后一条 VTT end + 1s buffer

## 混音方案（无 SFX 课程视频）

**⚠️ 铁律：voiceover volume=1.0，amix normalize=0。**

之前用 volume=-0.2 导致 L05/L06 混音后 mean_volume=-41dB（几乎听不到）。已修正。

```bash
ffmpeg -y -i lesson-XX-voiceover.mp3 \
  -i assets/bgm-lXX.mp3 \
  -filter_complex \
  "[0:a]volume=1.0[vo]; \
   [1:a]volume=<BGM_VOLUME>, \
   afade=t=in:d=2,afade=t=out:st=<DURATION-3>:d=3[bgm]; \
   [vo][bgm]amix=inputs=2:duration=first:normalize=0, \
   alimiter=limit=0.9[out]" \
  -map "[out]" -c:a aac -b:a 192k \
  lesson-XX-mixed.m4a
```

**BGM音量必须逐track校准**（volumedetect检测mean_volume，按响度设volume参数）：

| BGM mean_volume | 推荐volume | 说明 |
|-----------------|-----------|------|
| -29~-31 dB | 0.08 | 偏响，压低 |
| -31~-33 dB | 0.12 | 中等 |
| -34~-36 dB | 0.15 | 标准 |
| -37~-39 dB | 0.20 | 偏静，提升 |

**目标**：混音后 mean_volume 在 **-22 ~ -18 dB**。用 volumedetect 验证。

### L07-L10 BGM 校准实测数据

| 课 | BGM mean | volume | 混音mean | 混音max |
|----|----------|--------|---------|---------|
| L07 | -29.9dB | 0.08 | -19.8dB | -1.8dB |
| L08 | -37.3dB | 0.20 | -19.4dB | -1.7dB |
| L09 | -31.8dB | 0.12 | -19.7dB | -2.8dB |
| L10 | -34.6dB | 0.15 | -19.6dB | -2.6dB |

## 并行流水线

批量生产时不需要等一课全部完成再做下一课。最多3路并发capture + 1路mix+encode：

```
同时启动: L07 mix+encode + L08 capture + L09 capture + L10 capture
L08-L10 capture完成后: 同时启动 L08-L10 mix+encode
```

**实测**：4课（L07-L10）从HTML生成到全部编码完成 ≈ 5分钟（串行要15-20分钟）。

## 批量HTML生成（模板驱动）

用Python生成器脚本从L05模板批量生成L07-L10的HTML。详见 `scripts/gen-l07-l10-html.py`。

流程：
1. 解析每课VTT → 获取字幕数组和时长
2. 定义LESSONS字典（每课的场景结构：icon/color/title/content_items）
3. 生成器从L05模板提取CSS+字体，替换场景+字幕+边界 → 输出HTML
4. 场景内容必须逐课根据脚本设计，不能从其他课复制

## NVENC 编码

```bash
ffmpeg -y -framerate 15 \
  -i frames-lXX/frame_%05d.png \
  -i lesson-XX-mixed.m4a \
  -c:v h264_nvenc -preset p5 -cq 20 \
  -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a copy -shortest -movflags +faststart \
  lesson-XX-v1.mp4
```

## 弹出给 User

```bash
# Step 1: 复制到 E:\Downloads\
cp ~/course-studio/scenes/lesson-XX-v1.mp4 ~/Downloads/lesson-XX-v1.mp4

# Step 2: 弹出（单独命令，不和 cp 合并）
cmd.exe /c "explorer.exe /select,\"E:\\Downloads\\lesson-XX-v1.mp4\""
```

**必须用 E:\Downloads\**，不是 Windows 默认 Downloads。cp 和 explorer 必须分两条命令。

## 截帧超时补帧

Playwright 偶发 TimeoutError（约 5 帧/3000 帧），这些帧不会生成 PNG。
FFmpeg 遇到帧序列缺口会立即停止编码。

```bash
# 检查缺失帧
python3 -c "
import os
missing = [i for i in range(TOTAL) if not os.path.exists(f'frame_{i:05d}.png')]
print(f'Missing: {len(missing)}')
"

# 用前一帧填补
for f in 01410 01411 01412; do
  prev=$(printf "%05d" $((10#$f - 1)))
  cp frames-lXX/frame_${prev}.png frames-lXX/frame_${f}.png
done
```

## L04-L10 实战参数速查

| 课 | TTS时长 | 字幕数 | BGM track | 帧数 | 输出大小 |
|----|---------|--------|-----------|------|----------|
| L04 | 150.8s | 19 | track-897 | 2272 | 6.2MB |
| L05 | 103.4s | 19 | track-738 | 1551 | 4.2MB |
| L06 | 97.8s | 15 | track-443 | 1466 | 3.9MB |
| L07 | 90.3s | 23 | track-32 | 1368 | 2.1MB |
| L08 | 105.3s | 20 | track-897 | 1593 | 2.4MB |
| L09 | 111.8s | 14 | track-738 | 1690 | 2.7MB |
| L10 | 109.4s | 21 | track-443 | 1655 | 2.5MB |

## VTT 解析注意事项

edge-tts VTT 用逗号分隔秒和毫秒：`00:00:00,100`（不是 `00:00:00.100`）。
正则解析时用 `[,\.]` 兼容两种格式，或直接用 line-based parser（见 subtitle-integration.md）。
