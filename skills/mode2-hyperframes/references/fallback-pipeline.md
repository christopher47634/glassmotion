# Fallback Pipeline: FFmpeg Drawtext Motion Video

当 HyperFrames 和 Playwright 都不可用时（极端情况），用 FFmpeg drawtext 表达式系统生成带动效的视频。

> **注意**：这是最低优先级方案。用户反馈"很丑"、"都不动起来"。首选方案是 Playwright 逐帧截图（见 SKILL.md），它支持多样化组件和真正的 CSS 动画。只有在 Playwright 完全不可用时才用这个。

## 流程概述

1. 生成 TTS 语音（edge-tts）
2. 编写 Python 脚本构建 FFmpeg filter_complex
3. FFmpeg 一步渲染：背景动画 + 文字动效 + HUD + 音频

## Step 1: TTS 语音

```bash
edge-tts --voice zh-CN-XiaoxiaoNeural \
  --text "$(cat script.txt)" \
  --write-media voiceover.mp3

DURATION=$(ffprobe -v error -show_entries format=duration -of csv=p=0 voiceover.mp3)
```

要求"无间隔"时：所有句子写成一段连续文本，不要逐句生成再拼接。

## Step 2: Python 渲染脚本

核心思路：用 Python 拼 FFmpeg filter_complex 字符串，每个场景独立的 drawtext 调用。

### 场景结构

```python
SCENES = [
    (start, end, "主文字", "副文字"),
    (0, 4.0, "标题", "副标题"),
    (4.0, 8.5, "第二句", "补充说明"),
    # ...
]
```

### 动效公式

**文字入场（从底部弹入 + 过冲回弹）**：
```python
local_t = f"(t-{start})"
y_main = (
    f"'if(lt({local_t},0.6),"
    f" {H}-(1.67*{local_t})*({H}/2+20),"
    f" if(lt({local_t},0.9),"
    f"  {H}/2-20+50*({local_t}-0.6)/0.3,"
    f"  {H}/2-20+50*(1-(({local_t}-0.9)/0.3))*0.3"
    f" ))'"
)
```

**文字透明度（淡入/淡出）**：
```python
alpha = (
    f"'if(lt({local_t},0.4),{local_t}/0.4*255,"
    f" if(lt({local_t},{dur}-0.4),255,"
    f"  max(0,({dur}-{local_t})/0.4*255)))'"
)
```

**浮动粒子**：
```python
for p in range(6):
    px = (p * 317 + 100) % W
    speed = 30 + p * 15
    f",drawtext=text='.':fontsize={20+p*4}:"
    f"fontcolor=0x00F0FF@0.2:x={px}:"
    f"y='mod({H+100+p*100}-t*{speed},{H+300})-150'"
```

**HUD 角标（静态 drawbox）**：
```python
hud = (
    f",drawbox=x=25:y=25:w=50:h=2:color=0x00F0FF@0.2:t=fill"
    f",drawbox=x=25:y=25:w=2:h=50:color=0x00F0FF@0.2:t=fill"
    # ... 四角各两条
)
```

**REC 闪烁（drawtext alpha 表达式）**：
```python
rec = (
    f",drawtext=text='REC':fontsize=18:"
    f"fontcolor=0xFF0040:x={W-130}:y=32:"
    f"alpha='if(gt(sin(t*4),0),180,0)'"
)
```

**进度条**：
```python
prog = (
    f",drawbox=x=0:y={H}-4:w={W}:h=4:color=0x111122:t=fill"
    f",drawbox=x=0:y={H}-4:w='{W}*t/{TOTAL_DURATION}':h=4:"
    f"color=0x00F0FF@0.5:t=fill"
)
```

### 背景动画（geq filter）

```python
filters.append(f"color=c=black:s={W}x{H}:d={DURATION}:r={FPS}[bg0]")
filters.append(
    f"[bg0]geq="
    f"r='8+6*sin(2*PI*(N/{FPS}+X/400)/8)':"
    f"g='8+8*sin(2*PI*(N/{FPS}+Y/500)/10)':"
    f"b='18+12*sin(2*PI*(N/{FPS}+X/300+Y/300)/12)'"
    f"[bg]"
)
```

> **注意**：geq 用 `N`（帧号）不是 `t`（时间）。详见 `references/ffmpeg-expression-pitfalls.md`。

### 完整 filter_complex 拼接

每个场景生成一条 filter chain，从上一个场景的 label 接入：

```python
for i, (st, et, main_text, sub_text) in enumerate(SCENES):
    label = f"sc{i}"
    chain = f"[{prev}]{dt_main}{sub_parts}{line}{particles}{hud}{rec}{prog}{flash}[{label}]"
    filters.append(chain)
    prev = label
```

## Step 3: FFmpeg 渲染

```python
cmd = [
    "ffmpeg", "-y",
    "-i", AUDIO_FILE,
    "-filter_complex", filter_string,
    "-map", f"[sc{len(SCENES)-1}]", "-map", "0:a",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-c:a", "aac", "-b:a", "128k",
    "-pix_fmt", "yuv420p",
    "-shortest", "-t", str(TOTAL_DURATION),
    OUTPUT_FILE
]
```

> **注意**：音频是 input 0 时用 `-map 0:a`，不是 `1:a`。

## 完整示例

参考项目目录中的 `render-v3.py`：
`~/Downloads/mode2-hyperframes/output/vibe-coding/render-v3.py`

## 已知限制

1. **drawbox 不支持动态 alpha**：所有 drawbox 的颜色/透明度是静态的
2. **无复杂转场**：只能做闪白效果，没有 xfade 那样的溶解/推拉
3. **文字动画模式有限**：主要是 slide-up/fade，没有打字机、逐字高亮等
4. **性能**：filter_complex 太长时 FFmpeg 初始化慢，6 个场景约 10-15 秒初始化

## 常见错误

详见 `references/ffmpeg-expression-pitfalls.md`，包括：
- clamp() 不存在
- geq 用 N 不是 t
- drawbox alpha 不支持表达式
- 输入流索引匹配
- CJK 字体缺失

## 相关工具路径

- FFmpeg: 系统自带
- edge-tts: `~/.local/bin/edge-tts`
- 中文字体: `~/.local/share/fonts/LXGWWenKai-Regular.ttf`
- 英文字体: `~/.local/share/fonts/ChakraPetch-SemiBold.ttf`
- 项目目录: `~/Downloads/mode2-hyperframes/`
