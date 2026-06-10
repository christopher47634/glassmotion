# 字幕集成：edge-tts VTT → HTML 叠加

## 流程

1. edge-tts `--write-subtitles` 生成 VTT 文件
2. 解析 VTT 提取时间戳和文本
3. 注入 Playwright 页面作为全局变量
4. JS 每帧检查当前时间，匹配字幕并显示

## Step 1: 生成带字幕的 TTS

```bash
~/.local/bin/edge-tts --voice zh-CN-YunxiNeural --rate="+5%" \
  --text "第一句话。第二句话。第三句话。" \
  --write-media voiceover.mp3 \
  --write-subtitles voiceover.vtt
```

VTT 输出格式：
```
1
00:00:00,100 --> 00:00:03,126
第一句话。

2
00:00:03,076 --> 00:00:07,021
第二句话。
```

**注意**：edge-tts 的时间戳是句子级别的，不是逐字的。句间可能有微小重叠（上一句 end > 下一句 start），这正常。

## Step 2: 解析 VTT

```python
def parse_vtt(vtt_path):
    subs = []
    with open(vtt_path) as f:
        lines = f.readlines()
    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if '-->' in line:
            times = line.split(' --> ')
            start = vtt_to_seconds(times[0])
            end = vtt_to_seconds(times[1])
            text = lines[i+1].strip() if i+1 < len(lines) else ''
            subs.append([round(start, 2), round(end, 2), text])
            i += 2
        else:
            i += 1
    return subs

def vtt_to_seconds(ts):
    h, m, rest = ts.split(':')
    s, ms = rest.split(',')
    return int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000
```

## Step 3: 注入 Playwright 页面

```python
# 在 page.goto() 之后注入
page.evaluate(f"window.SUBS = {json.dumps(subtitles)};")
```

## Step 4: JS 更新字幕

在每帧的 update 函数中：

```javascript
// 字幕
let subEl = document.getElementById('subtitleText');
let txt = '';
for (let sub of window.SUBS) {
  if (time >= sub[0] && time <= sub[1]) {
    txt = sub[2];
    break;
  }
}
if (txt) {
  subEl.textContent = txt;
  subEl.classList.add('visible');
} else {
  subEl.classList.remove('visible');
}
```

## 字幕样式

**浅色/米白主题**（推荐）：
```css
.subtitle-bar {
  position: fixed;
  bottom: 180px;  /* 竖屏上移，横屏用 50px */
  left: 60px; right: 60px;
  text-align: center;
  z-index: 90;
  pointer-events: none;
}
.subtitle-text {
  font-family: 'LXGW WenKai', 'Noto Sans CJK SC', sans-serif;
  font-size: 48px;       /* 竖屏 48px，横屏 60px */
  font-weight: 500;
  color: #1a1a1a;
  text-shadow: none;     /* 浅色背景不要阴影 */
  background: rgba(255,255,255,0.95);
  border: 1px solid rgba(0,0,0,0.08);
  border-radius: 20px;
  padding: 16px 36px;
  display: inline-block;
  max-width: 900px;
  line-height: 1.5;
}
```

**暗色主题**：
```css
.subtitle-text {
  font-size: 60px;
  color: #FFFFFF;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
  background: rgba(0,0,0,0.6);
  border-radius: 12px;
  padding: 12px 40px;
}
```

**"无空档"要求**：VTT 句间天然衔接（上一句 end 和下一句 start 通常有微小重叠），所以字幕不会有空白间隙。如果用户特别要求无间隔，确保所有句子写在同一个 `--text` 参数里，不要分开调用 edge-tts。

## ⚠️ VTT 时间戳分隔符是逗号不是点

edge-tts VTT 格式：`00:00:00,100 --> 00:00:05,475`（逗号分隔秒和毫秒）。

**事故**：用正则 `(\d{2}:\d{2}:\d{2}\.\d{3})` 解析，结果 0 条匹配——分隔符是逗号。

**正确做法**：
- 用上方的 `vtt_to_seconds()` 函数（基于 `rest.split(',')`）
- 或正则用 `[,\.]` 兼容：`(\d{2}:\d{2}:\d{2}[,\.]\d{3})`
- **不要假设分隔符是点**

## ⚠️ 字幕时间轴必须来自 VTT

**绝对不要手动估算字幕时间。** 必须用 edge-tts `--write-subtitles` 输出的 VTT 文件解析时间戳。手动估算会导致字幕与语音不同步，尤其在后半段偏差会累积。

流程：先生成 TTS + VTT → 解析 VTT → 注入 capture 脚本。不要跳过 VTT 直接写 SUBTITLES 数组。

## ⚠️ VTT 必须和实际语音文件配对（rate 参数陷阱）

edge-tts 的 `--rate` 参数会**改变语音速度和总时长**，同时改变 VTT 时间戳。如果混用不同 rate 版本的 VTT 和音频，字幕会完全错位。

**真实事故**：用 `--rate="+15%"` 生成了 VTT（最后一句 16.3-20.25s），但实际视频用的是无 rate 的原始语音（23.35s，最后一句 18.8-23.3s）。结果：后半段字幕全部消失（20.25s 后无字幕覆盖），用户说"最后半句话说的时候都没有字幕"。

**铁律**：
1. 生成 TTS 时**同时**生成 media 和 subtitles，用同一条命令
2. 如果需要换 rate，**两个文件都要重新生成**
3. 不要从旧版本的 VTT 复制时间戳到新版本的语音
4. 验证方法：对比 VTT 最后一条 end time 和音频 duration，差值应 < 0.5s

```bash
# 正确 — 一条命令同时生成
edge-tts --voice zh-CN-XiaoxiaoNeural --rate="+15%" \
  --text "..." --write-media voiceover.mp3 --write-subtitles voiceover.vtt

# 错误 — 分开生成容易 rate 不一致
edge-tts --rate="+15%" --write-media voiceover.mp3 ...
edge-tts --write-subtitles voiceover.vtt  # ← 忘了 +15%，时间轴全错
```

## ⚠️ 字幕文本风格

**User 不要句号。** 字幕文本中不加句号（。）。逗号、冒号、引号等可以保留。这是固定偏好，不是偶尔要求。

示例：
```
# 错误 — 有句号
"小龙虾是一款开源的AI编程助手"

# 正确 — 无句号
"小龙虾是一款开源的AI编程助手"
```

TTS 合成时，句号会影响 edge-tts 的停顿。如果原文有句号的位置需要停顿效果，用逗号替代（逗号也会产生短停顿）。

## ⚠️ 字幕碎切规则（铁律）

**User 原话："字幕要切碎，不能又粗又长。"**

每条字幕 ≤ 20 个中文字。VTT 原始字幕通常是一整句（30-50字），必须拆分：

```python
def split_subtitle(text, max_chars=20):
    """将长字幕拆成多条，每条 ≤ max_chars 字"""
    if len(text) <= max_chars:
        return [text]
    # 按标点拆
    import re
    parts = re.split(r'([，、。！？；：])', text)
    result, buf = [], ''
    for p in parts:
        if len(buf) + len(p) <= max_chars:
            buf += p
        else:
            if buf: result.append(buf)
            buf = p
    if buf: result.append(buf)
    # 如果还有超长的，按字数硬切
    final = []
    for r in result:
        while len(r) > max_chars:
            final.append(r[:max_chars])
            r = r[max_chars:]
        if r: final.append(r)
    return final
```

拆分后每条的时间窗口按字符比例分配原始时间区间。

## ASS 格式字幕（推荐用于 FFmpeg 合成）

FFmpeg 的 `subtitles` filter 对 VTT 支持有限（样式控制弱）。**ASS 格式**支持精确的字体、大小、背景框控制。

生成 ASS 文件示例：
```python
def generate_ass(subs, output_path, 
                 fontname='Noto Sans CJK SC', fontsize=20,
                 primary_color='&H00FFFFFF', outline_color='&H80000000'):
    header = f"""[Script Info]
Title: Course Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{fontname},{fontsize},{primary_color},&H000000FF,{outline_color},{outline_color},0,0,0,0,100,100,0,0,3,1,0,2,40,40,60,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = ''
    for s in subs:
        start = seconds_to_ass(s['start'])
        end = seconds_to_ass(s['end'])
        events += f"Dialogue: 0,{start},{end},Default,,0,0,0,,{s['text']}\n"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(header + events)

def seconds_to_ass(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"
```

ASS 关键参数说明：
- `BorderStyle=3` → 背景框模式（半透明黑底白字）
- `BackColour=&H80000000` → 半透明黑色背景（80 = 50% 透明度）
- `Alignment=2` → 底部居中
- `MarginV=60` → 底部距离 60px
- `Bold=0` → 不要粗体，User 不喜欢粗字幕

FFmpeg 合成命令：
```bash
ffmpeg -i input.mp4 -vf "ass=/tmp/subs.ass" -c:v libx264 -crf 20 output.mp4
```

**注意**：ASS 路径也受中文字符影响，同样先复制到 `/tmp`。

## User 的字幕风格偏好（固定）

| 属性 | 要求 |
|------|------|
| 字体 | **ZCOOL KuaiLe**（圆体/动画体，活泼风格）。备选 Noto Sans CJK SC |
| 字号 | **58px**（ASS）。User嫌20px太小→48→最终58 |
| 粗细 | 不要粗体（Bold=0） |
| 背景 | **浅色主题**：深色字(#1A1A1A) + 半透明浅灰背景(BorderStyle=3, BackColour=&HC0E8E8E8)。**暗色主题**：白字 + 半透明黑底 |
| 位置 | 底部居中（Alignment=2, MarginV=80） |
| 每条长度 | ≤ 20 个中文字 |
| 分割方式 | 按标点自然断句，不要硬切 |

### ASS 浅色主题样式（经过验证的正确参数）

```python
# 深色字 + 半透明浅灰背景框（字号58，User最终确认）
"Style: Default,ZCOOL KuaiLe,58,&H001A1A1A,&H000000FF,&H00E8E8E8,&HC0E8E8E8,0,0,0,0,100,100,0,0,3,0,0,2,60,60,80,1"
```

**⚠️ 浅色主题的 ASS 字幕踩坑**：
- ❌ 白字+黑描边(Outline) 在浅色背景上不和谐，User说"谁让你白字黑描边的"
- ❌ 深色字+无背景框(BorderStyle=1, Outline=0) 在浅色背景上几乎看不见
- ❌ 半透明黑底(BackColour=&H80000000) 在浅色主题上对比度不够
- ✅ 深色字(#1A1A1A) + 半透明浅灰背景(BorderStyle=3, BackColour=&HC0E8E8E8) 正确

### ASS 暗色主题样式

```python
# 白字 + 半透明黑底（字号58）
"Style: Default,ZCOOL KuaiLe,58,&H00FFFFFF,&H000000FF,&H00000000,&HB0000000,0,0,0,0,100,100,0,0,3,0,0,2,60,60,80,1"
```

### User 对字幕的核心要求（来自多次纠正）

1. **"字幕样式直接copy mode2里面的"** — 字幕风格必须和视频整体设计语言一致
2. **"字体太小了字号直接翻倍"** — 20px → 48px
3. **"调成那种动画体抖音体"** — 用 ZCOOL KuaiLe 圆体，不用严肃的 Noto Sans
4. **"白字然后后面弄一个半透明的背景"** — 浅色主题用深色字+半透明浅灰背景，不要白字黑描边
5. 字幕和语音必须对齐，字幕不能只和音频对，还要和动画内容对

## 暗色/亮色主题适配

**两种主题字幕样式完全不同**：

**米白/浅色主题**（User 说 text-shadow 在浅色背景上"看起来脏"）：
```css
.subtitle-text {
  font-size: 48px;
  color: #1a1a1a;
  text-shadow: none;                    /* 不要阴影 */
  background: rgba(255,255,255,0.95);   /* 纯白底 */
  border: 1px solid rgba(0,0,0,0.08);   /* 细边框 */
  border-radius: 20px;
  padding: 16px 36px;
}
```

**暗色主题**：
```css
.subtitle-text {
  font-size: 60px;
  color: #FFFFFF;
  text-shadow: 0 2px 8px rgba(0,0,0,0.8);
  background: rgba(0,0,0,0.6);
  border-radius: 12px;
  padding: 12px 40px;
}
```

**竖屏额外调整**：bottom 从 50px → 180px（避开底部系统UI区域）。
