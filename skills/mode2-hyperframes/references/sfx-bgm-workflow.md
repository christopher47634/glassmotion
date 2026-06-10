# SFX + BGM 工作流

## 音效清单（FFmpeg 合成）

所有音效用 FFmpeg lavfi 滤镜纯代码生成，零外部依赖。

### ⚠️ 音量铁律

FFmpeg 合成源默认振幅极低（a=0.3 → 实测 max=-19dB，几乎静音）。必须：
1. 源振幅 a≥0.6，合成后 volume=3.0~4.0
2. **每个 SFX 生成后必须 `volumedetect` 检查 max_volume**
3. 目标 max：SFX -3~-8 dB，BGM -15~-18 dB（voiceover 约 -2 dB）
4. amix normalize=0 不会自动提升音量——源信号太弱等于没加
5. amix 多层嵌套（45个SFX → 再混voiceover+BGM）会进一步压低信号。尽量扁平化。

### 验证命令

```bash
for f in typing_key whoosh pop tick blip chime bgm; do
  max=$(ffmpeg -i "sfx/$f.wav" -af volumedetect -f null /dev/null 2>&1 \
    | grep max_volume | sed 's/.*max_volume: //')
  echo "$f: max=$max"
done
```

### 经验证的音量参数

| 名称 | 用途 | 时长 | FFmpeg 核心 | 实测 max |
|------|------|------|-------------|----------|
| typing_key | 打字机逐字 | 40ms | `anoisesrc:d=0.04:c=pink:a=0.8` + HP/LP + `volume=4.0` | -2.7 dB |
| whoosh | 场景切换 | 500ms | `anoisesrc:d=0.5:c=white:a=0.6` + bandpass + aecho + `volume=3.0` | -5.6 dB |
| pop | 消息气泡出现 | 120ms | 双音 1000+600Hz + adelay + `volume=3.0` | -4.7 dB |
| tick | 代码行/图标出现 | 30ms | `sine=f=5000:d=0.03` + `volume=3.0` | -8.5 dB |
| blip | 数据指标卡片 | 150ms | 双音 1500+2200Hz + adelay + `volume=3.0` | -4.7 dB |
| chime | 结尾收束 | 1.2s | 四和弦 523+659+784+1047Hz + adelay 错开 + `volume=2.0` | -3.3 dB |
| percussive_synth | 高科技音效 | 150ms | `sine=f=3500:d=0.15` + HP200/LP6000 + tremolo f=30 d=0.3 + aecho + `volume=6.0` | -6.1 dB |
| double_pop | 强调音效 | 300ms | 两个 pop 间隔 0.15s，频率微变（1200+800 → 1100+700） | -6.3 dB |
| note_c4 | 多声部和弦低音 | 500ms | `sine=f=262:d=0.5` + tremolo f=4 d=0.3 + volume=1.5 | -12 dB |
| note_e4 | 多声部和弦中音 | 500ms | `sine=f=330:d=0.5` + tremolo f=5 d=0.25 + volume=1.5 | -12 dB |

## BGM 素材

### 推荐：真实素材（替代 FFmpeg 合成）

FFmpeg 合成的正弦波 BGM 在低音量下几乎无质感。对于需要"音乐感"的视频，使用免费素材：

- **Mixkit** (mixkit.co/music) — 免费商用，无需署名，Technology/Ambient 分类
- **Pixabay Music** (pixabay.com/music) — 免费商用
- 搜索关键词：ambient electronic, technology, chill, modern

### 下载注意事项

- **Mixkit CDN**：页面可以浏览。直链格式有多种，部分会 403。实测 `/music/{id}/{id}.mp3` 格式可用（如 `https://assets.mixkit.co/music/623/623.mp3`），但 preview/download 格式（如 `mixkit-deep-urban-623.mp3`）会 403。下载后必须验证文件大小（>100KB）和 ffprobe，防止拿到 HTML 错误页。
- **Pixabay CDN 可用**：`cdn.pixabay.com/download/audio/...` 支持直接 curl 下载。
- **下载后验证**：检查文件大小（>100KB）和 ffprobe 输出，确保不是 HTML 错误页面。

```bash
# 下载后处理（保留源文件，不要清理 BGM 源）
cp bgm-source.mp3 bgm-source-backup.mp3  # 备份
ffmpeg -y -i bgm-source.mp3 \
  -af "atrim=0:24,asetpts=PTS-STARTPTS,volume=0.08,afade=t=in:d=2,afade=t=out:st=21:d=3" \
  -ar 44100 -ac 1 bgm-trimmed.wav
```

**⚠️ 不要删除 BGM 源文件。** 混音脚本每次修改 SFX 音量都需要重新生成 mixed-audio.wav，如果源文件丢失就得重新下载（可能下到不同版本，用户会发现 BGM 变了）。

用户偏好：8% BGM 音量（volume=0.08），科普/科技类用 ambient electronic。

### 备选：FFmpeg 合成 BGM

低频电子 ambient pad，5层独立生成后 amix 合并。实测 max=-17.2 dB，在 8% 音量下几乎听不到。仅适合 BGM 音量 >20% 的场景。

| 层 | 频率 | tremolo | volume |
|----|------|---------|--------|
| sub bass | 60 Hz | f=0.15, d=0.6 | 0.8 |
| bass | 120 Hz | f=0.2, d=0.4 | 0.5 |
| mid pad | 180 Hz | f=0.12, d=0.5 | 0.35 |
| high pad | 240 Hz | f=0.1, d=0.7 | 0.2 |
| noise | pink | highpass 200, lowpass 2000 | 2.0 |

合并后加 `lowpass=600,aecho=0.8:0.6:300|500:0.25|0.15`。

## 混音策略

### ⚠️ amix 1/N 缩放陷阱（真实事故）

**amix normalize=0 不是"不缩放"**——它只是"不自动归一化防削波"，但仍然按 1/N 缩放每个输入。N=45 时每个 SFX 被压到 1/45 ≈ 0.022 倍，等于静音。

```bash
# 错：45个 SFX 一次性 amix → 每个被压到 1/45
[s0][s1]...[s44]amix=inputs=45:duration=first:normalize=0[sfx_mix]
# 结果：SFX max 和纯语音完全相同，听不到任何音效
```

### ⚠️ 逐条叠加也会衰减（真实事故 v2）

逐条叠加方案（每次 2-input amix）在实践中：48 次 1/2 缩放累积后，**前半段仍然 -90 dB（静音）**，后半段正常。根因：早期音频信号被逐步压低。

### ✅ 正确方案：预混 SFX + 3 路合并

```python
# 1. 生成静音底轨（精确时长）
silence = f'{WORK}/silence.wav'
subprocess.run(['ffmpeg', '-y', '-f', 'lavfi', '-i',
    'anullsrc=r=44100:cl=stereo', '-t', str(DURATION), '-ar', '44100', silence])

# 2. 所有 SFX 一次性 amix 到静音底轨（normalize=0）
# 关键：apad=whole_dur=DURATION 确保每个 SFX 填充到完整时长
filters = []
for i, (t, name) in enumerate(SCHEDULE):
    delay_ms = int(t * 1000)
    filters.append(f'[{i+1}:a]adelay={delay_ms}|{delay_ms},volume={SFX_VOL},apad=whole_dur={DURATION}[s{i}]')

all_labels = ''.join(f'[s{i}]' for i in range(len(SCHEDULE)))
filters.append(f'{all_labels}amix=inputs={len(SCHEDULE)}:duration=first:dropout_transition=0:normalize=0[sfx_mix]')

# 输出 sfx-only.wav
cmd = ['ffmpeg', '-y', '-i', silence] + sfx_inputs + [
    '-filter_complex', ';'.join(filters),
    '-map', '[sfx_mix]', '-ar', '44100', f'{WORK}/sfx-only.wav'
]

# 3. 最终只做 3 路 amix（VO + BGM + SFX），输入数少，衰减可控
subprocess.run(['ffmpeg', '-y',
    '-i', VO, '-i', BGM_SRC, '-i', f'{WORK}/sfx-only.wav',
    '-filter_complex',
    '[0:a]aformat=sample_rates=44100:channel_layouts=stereo[vo];'
    f'[1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume={BGM_VOL},'
    f'afade=t=in:st=0:d=2,afade=t=out:st=40:d=3[bgm];'
    '[2:a]aformat=sample_rates=44100:channel_layouts=stereo[sfx];'
    '[vo][bgm]amix=inputs=2:duration=first:dropout_transition=0[base];'
    '[base][sfx]amix=inputs=2:duration=first:dropout_transition=0,'
    'alimiter=limit=0.9[out]',
    '-map', '[out]', '-ar', '44100', OUT
])
```

**为什么这个方案有效**：
- SFX 预混用 `normalize=0`，48 路 SFX 不会被 1/48 缩放
- 最终合并只有 3 路输入（VO、BGM、SFX-track），amix 1/3 缩放可控
- 验证结果：前半段 -32.7 dB，后半段 -32.4 dB（一致）

### 音量调节

用户说"音效太响"→ 降低 SFX 合成时的 volume（从 0.65 降到 0.45 左右）。**只改 SFX vol 参数，不改 BGM。**
用户说"听不到"→ 检查 amix 输入数量，如果 >5 就是 1/N 问题。
用户说"音效再小一点"→ 只调 SFX volume，不动 BGM 的 volume=0.08。

**快速调节方法**（不重新生成 SFX 文件，只改混音倍率）：
```python
# 在 mix 脚本中用 volume filter 调节 SFX 整体音量
SFX_VOL = 0.5  # 用户说"稍微小一点"时从 0.65 降到 0.5
# 在 adelay 后加 volume=SFX_VOL
f"'[1]adelay={delay_ms}|{delay_ms},volume={SFX_VOL},apad=whole_dur={DURATION}[sfx];'"
```

### 混音后验证（必须）

```bash
# 对比混音前后
ffmpeg -i mixed-audio.wav -af volumedetect -f null /dev/null 2>&1 | grep max_volume
ffmpeg -i voiceover.mp3 -af volumedetect -f null /dev/null 2>&1 | grep max_volume
# 差值 > 1 dB → SFX/BGM 成功混入
# 差值 < 0.1 dB → 混音失败，SFX/BGM 被 amix 吞了
```

### 时间点提取

从 Playwright capture 脚本中提取：
```python
# capture 脚本中的动画触发
if (t>0.3) document.querySelector('#s0 h1').classList.add('show');
for (let i=0;i<=9;i++) { if(t>0.5+i*0.35) ... }
```

翻译为 SFX schedule：
```python
SCHEDULE.append((0.0, "whoosh.wav"))      # s0 标题
SCHEDULE.append((4.0, "whoosh.wav"))      # s1 场景切换
typing_times = [4.5, 4.85, 5.2, 5.55, 5.9, 6.25, 6.6, 6.95, 7.3, 7.65]
for t in typing_times:
    SCHEDULE.append((t, "typing_key.wav"))
```

## 音轨替换

视频流 + 混音后的音频合并：

```bash
ffmpeg -y \
  -i original_video.mp4 \
  -i mixed-audio.wav \
  -c:v copy -c:a aac -b:a 192k \
  -map 0:v:0 -map 1:a:0 \
  output.mp4
```

## 已知陷阱

### 1. tremolo 频率下限 0.1
FFmpeg tremolo filter 的 `f` 参数最小值 0.1，低于此值报 `Numerical result out of range`。

### 2. 视频流比音频短
用 `tpad=stop_mode=clone:stop_duration=N` 延长视频到音频长度，避免冻帧：
```bash
ffmpeg -y -i short_video.mp4 -i long_audio.wav \
  -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=3.5[v]" \
  -map "[v]" -map 1:a:0 -c:v libx264 -crf 18 -c:a aac output.mp4
```

### 3. 避免 -shortest
当音频比视频长时不要用 `-shortest`，否则会截断到视频长度。不加此参数时以最长流为准。

### 4. SFX 音量控制
tick/typing_key 反复触发容易过响，volume 设 3.0~4.0（不要用旧值 0.5，太安静）。
whoosh/pop/blip 设 3.0。chime 设 2.0。BGM 每层 0.2~0.8（合并后 max≈-17dB）。

### 5. FFmpeg 合成源默认极静
`sine` 和 `anoisesrc` 的 `a` 参数默认值产生的信号在 -30~-50 dB 范围，叠加 volume<1.0 后更是几乎静音。
**必须**在合成时就用高振幅（a≥0.6），再配合 volume=3.0+ 放大。

### 6. 混音前必须验证
生成 SFX → volumedetect → 确认 max>-10 dB → 再混音。跳过验证 = 交付静音版本给用户。
用户会说"音效也不明显，BGM你真的加了吗"。这是真实发生过的。

### 7. 混音后必须和纯语音对比
混音完成后的 **第一个检查**：对比 mixed-audio 和 voiceover 的 volumedetect 输出。如果 max_volume 完全相同（差值 < 0.1 dB），说明 SFX/BGM 根本没混进去。

```bash
# 对比混音前后
ffmpeg -i mixed-audio.wav -af volumedetect -f null /dev/null 2>&1 | grep max_volume
ffmpeg -i voiceover.mp3 -af volumedetect -f null /dev/null 2>&1 | grep max_volume
# 如果两个值一样 → 混音失败，SFX/BGM 被 amix 吞了
```

**真实事故**：第一版混音后 max=-2.3 dB，和纯语音完全相同。原因：SFX 源信号太弱（-30~-50 dB），amix normalize=0 不会放大，弱信号被强信号掩盖。修复：重新生成 SFX（a≥0.6, volume=3.0+），混音后 max=-0.5 dB，说明 SFX 确实叠进去了。

### 8. 削波保护
多个 SFX 同时触发时叠加会超过 0 dB 导致削波失真。如果混音后 max_volume ≈ 0 dB：
- 降低 SFX volume（tick/typing 从 0.8 降到 0.4，其他从 1.0 降到 0.6）
- 或加 alimiter：`-af "alimiter=limit=0.95:attack=5:release=50"`
- 目标：max 在 -0.5 ~ -2 dB 区间

### 9. 场景边界改变时 SFX 时间点必须同步
capture-v5.py 的 `let sceneId = time < X ? 's0' : ...` 决定了场景切换时间。如果改了这些时间点，mix-audio.py 的 SCHEDULE 里的 whoosh 时间和所有动画事件时间也必须同步更新。

**铁律**：改 capture 脚本的场景边界 → 同时改 mix 脚本的 SFX 时间表。不改 = 音效和画面不同步。

### 10. amix normalize=0 的真实行为

`normalize=0` 不是"不缩放"。它禁用了自动防削波归一化，但**仍然按 1/N 缩放每个输入**。N 越大，每个输入越安静。

| amix 输入数 | 每输入缩放 | 效果 |
|-------------|-----------|------|
| 2 | 1/2 = 0.50 | 可接受 |
| 5 | 1/5 = 0.20 | 偏安静 |
| 10 | 1/10 = 0.10 | 很安静 |
| 45 | 1/45 = 0.022 | 等于静音 |

**解决方案**：预混 SFX + 3 路合并。详见上方"正确方案"。

### 11. BGM 音量参考

用户说"BGM 一点都听不到"→ BGM volume 至少 0.15（15%），推荐 0.25（25%）。
用户说"BGM 太吵"→ 降到 0.10（10%）。
User 定稿偏好：volume=0.08（8%），必须用真实素材（合成 BGM 在 8% 下无质感）。
BGM 目标 max：-12 ~ -18 dB（voiceover 约 -2 dB）。

### 批量课程 BGM 轮换

多课并行生产时，每课用不同 BGM 避免听觉疲劳：

```bash
# 4 首 track 轮换
declare -A BGM_MAP=( [04]=897 [05]=738 [06]=443 [07]=32 [08]=897 [09]=738 [10]=443 )
```

| Track | 风格 | 时长 |
|-------|------|------|
| track-897.mp3 | Ambient electronic | ~130s |
| track-738.mp3 | Chill modern | ~115s |
| track-443.mp3 | Soft tech | ~114s |
| track-32.mp3 | Minimal ambient | ~102s |

课程视频 BGM 音量用 0.15（比短视频 0.18 稍低，语音密度高）。
每课 BGM 时长必须 ≥ TTS 时长，不够就换一首。
