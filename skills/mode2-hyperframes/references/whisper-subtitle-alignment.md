# Whisper 词级字幕对齐

## 问题

VTT 只有一个整段时间戳（如 0.1s→7.3s），按字数均分时间必然错位。
中文语速非匀速，英文比中文慢，标点前后有停顿。

## 解决方案

用 faster-whisper 的 word_timestamps 拿真实词级时间，作为字幕切分的锚点。

## 步骤

### 1. 安装
```bash
pip install faster-whisper
```

### 2. 提取词级时间戳
```python
from faster_whisper import WhisperModel
model = WhisperModel("medium", device="cpu", compute_type="int8")

for mp3_file in scene_mp3_files:
    segments, info = model.transcribe(mp3_file, language="zh", word_timestamps=True)
    words = []
    for seg in segments:
        for w in seg.words:
            words.append({"start": w.start, "end": w.end, "word": w.word.strip()})
```

### 3. 用时间锚点对齐原文
Whisper 对专有名词识别不准（Claude→Cloud, Fable→Fiber），但**时间戳是准的**。
策略：用原文显示，用 Whisper 时间定位。

```python
def build_char_time_map(text, words):
    """Build character-index → time mapping from whisper word timestamps."""
    anchors = []
    text_pos = 0
    for w in words:
        wtext = w["word"].strip()
        if not wtext:
            continue
        # Greedy match in original text
        for sp in range(max(0, text_pos-2), min(len(text), text_pos+6)):
            if text[sp:sp+len(wtext)] == wtext:
                anchors.append((sp, w["start"]))
                anchors.append((sp + len(wtext), w["end"]))
                text_pos = sp + len(wtext)
                break
    return anchors

def interp_time(char_idx, anchors):
    """Interpolate time for a character position."""
    for i in range(len(anchors)-1):
        c0, t0 = anchors[i]
        c1, t1 = anchors[i+1]
        if c0 <= char_idx <= c1:
            if c1 == c0: return t0
            ratio = (char_idx - c0) / (c1 - c0)
            return t0 + ratio * (t1 - t0)
    return anchors[-1][1]
```

### 4. 切分并生成 ASS
```python
def smart_split(text, max_chars=12):
    """Split at natural boundaries: punctuation > space > CJK/English transition."""
    chunks, i = [], 0
    while i < len(text):
        if len(text) - i <= max_chars:
            chunks.append(text[i:]); break
        window = text[i:i+max_chars]
        best_break = max_chars
        for j in range(len(window)-1, max(len(window)-5, 0), -1):
            ch = window[j]
            if ch in '，。、！？；：,.!?;:' or ch == ' ':
                best_break = j + 1; break
            # CJK/English transition
            if j > 0:
                prev, cur = window[j-1], window[j]
                if (prev.isascii() and not cur.isascii()) or (not prev.isascii() and cur.isascii()):
                    best_break = j; break
        chunks.append(text[i:i+best_break])
        i += best_break
    return chunks

# Map chunks to whisper timestamps
char_idx = 0
for chunk in chunks:
    t_start = interp_time(char_idx, anchors)
    t_end = interp_time(char_idx + len(chunk), anchors)
    # Apply scene offset and speedup as needed
    char_idx += len(chunk)
```

## 注意事项

- Whisper small 模型对中文专有名词识别差，用 medium 或更大
- 时间戳准确度高，即使文字识别错误
- 最小显示时长 0.5s，避免闪字
- 如果没有 faster-whisper，备选：edge-tts --write-subtitles（只给句子级，不给词级）

## 陷阱（2026-06-11 实测）

### ASS 时间戳格式必须是 H:MM:SS.CC
`{g_start:.2f}` 生成 `3.33`，ASS 解析器静默忽略。必须用：
```python
def seconds_to_ass(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02d}:{s:05.2f}"
```
生成 `0:00:03.33`。格式错 → 字幕完全不显示，无报错。

### 管道顺序：先速度后字幕，或先字幕后速度（二选一）
两种正确做法：
1. **先加速后烧字幕**：ASS 时间戳用最终视频时间基（÷SPEED），烧到已加速视频上
2. **先烧字幕后加速**：ASS 时间戳用原始视频时间基（不除 SPEED），烧到原始视频上，然后 setpts/atempo 加速

错误做法：ASS 时间戳已除 SPEED，但烧到原始视频上再加速 → 时间被压缩两次，字幕提前出现。

### 字体路径验证
`fontsdir=/usr/share/fonts` 找不到用户字体。检查：
```bash
fc-list | grep -i "zcool\|kuai"
# → /home/user/.fonts/ZCOOLKuaiLe-Regular.ttf
```
用 `fontsdir=/home/user/.fonts`（或 `~/.fonts`）。
