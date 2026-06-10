# 截帧与字幕对齐：高频踩坑清单

> 2026-06-06 L19-L22 深色主题批次实战总结。后续每批都对照此表检查。

---

## 一、开场 Intro 不可省略

每课第一个场景必须是 4 秒 Intro Title Card：
- 4×4 grid layout：上左"模块X · 第Y课"、上右课程标题大字、下左三大亮点、下右讲师信息
- 动画：文字 fade-in 从下方、亮点 stagger、底部扫描线
- Intro 场景必须有独立的 `<style>` block（不依赖外层 scene 的样式）

**踩坑**：User 反复指出"怎么没有最开始的引入动画还有标题"。根本原因是分镜表第一行是 Intro 但我们直接跳过了。**绝不允许**。

---

## 二、动画必须是时间驱动（elapsed / data-delay）

### 正确做法（seekTo 友好）

```html
<div class="step" data-delay="0.6">内容1</div>
<div class="step" data-delay="1.4">内容2</div>
<div class="step" data-delay="2.2">内容3</div>
```

```js
function animateElements() {
  const elapsed = (performance.now() - startTime) / 1000;
  steps.forEach(el => {
    const delay = parseFloat(el.dataset.delay);
    if (elapsed >= delay && !el.classList.contains('show')) {
      el.classList.add('show');
    }
  });
  requestAnimationFrame(animateElements);
}
```

### 错误做法（绝对时间，seekTo 不触发）

```js
setTimeout(() => el.classList.add('show'), 1400);  // ❌ seekTo 从 0s 开始跑，1.4s 后才触发
```

**核心原理**：seekTo 截帧时 Playwright 从 0s 重新开始跑动画循环。
- 如果用 `setTimeout(1.4s)`，截 1.0s 的帧时元素还没出现
- 如果用 `elapsed >= delay`，截 1.0s 的帧时 elapsed=1.0，delay<1.0 的元素已经 show

### 常见坑

| 问题 | 原因 | 修复 |
|------|------|------|
| 截出来的帧全是空白 | `setTimeout` 用绝对时间 | 改 `elapsed >= delay` |
| 中间帧有元素没显示 | delay 值大于该帧时间 | 检查 delay 是否合理分布 |
| 动画效果只有第一帧有 | 没有用 requestAnimationFrame 持续循环 | 必须持续 rAF 循环 |
| fadeIn 用 CSS animation | CSS animation 依赖 document load 时间 | 用 JS class toggle + CSS transition |

---

## 三、字幕时间线必须从 VTT 提取

### 正确流程

1. 用 TTS 生成音频 → 得到 `.mp3` 和 `.vtt`
2. **读 VTT 文件**，逐句提取 start/end 时间
3. 字幕文本直接用口播稿分段，**不要让 AI 重新改写**
4. timing 和 duration 用 VTT 的精确值，**不要手估**

### 踩坑

- 之前让 AI 估算每句 5-8 秒，结果和真实音频对不上
- VTT 的 start/end 是相对于整段音频的绝对时间
- 字幕的 timing 必须等于 VTT 的 start（或接近整数帧边界）
- **改字幕 = 改 subtitles 数组 + sceneBounds + totalDuration，三个必须同步**

### VTT 提取代码

```python
import re
vtt_lines = open("output.vtt").read().splitlines()
subs = []
for i, line in enumerate(vtt_lines):
    m = re.match(r"(\d+:\d+:\d+\.\d+)\s*-->\s*(\d+:\d+:\d+\.\d+)", line)
    if m:
        start, end = m.group(1), m.group(2)
        text = vtt_lines[i+1].strip() if i+1 < len(vtt_lines) else ""
        # 转秒数
        def to_sec(t):
            h,m2,s = t.split(':')
            return int(h)*3600 + int(m2)*60 + float(s)
        subs.append({"text": text, "start": round(to_sec(start),2), "end": round(to_sec(end),2)})
```

---

## 四、场景边界必须对齐 VTT 内容断点

### 正确做法

读 VTT，找到自然的"换气口"（句子间有 0.5s+ 停顿），在这些位置切场景。

```python
# 从 VTT 字幕找断点
for i, sub in enumerate(subs):
    if i+1 < len(subs):
        gap = subs[i+1]["start"] - sub["end"]
        if gap >= 0.3:  # 0.3秒以上的间隔 = 内容断点
            print(f"  断点在 {sub['end']:.1f}s (gap={gap:.2f}s)")
```

### 错误做法

```python
# ❌ 均匀分配时长
for i in range(num_scenes):
    start = i * (total / num_scenes)
    end = (i+1) * (total / num_scenes)
```

**结果**：场景切换时字幕被截断、字幕和画面不匹配。User 说"字幕和语音时间线对不上"。

### 场景边界计算代码

```python
scene_bounds = []
current_start = 0
for i, sub in enumerate(subs):
    if i+1 < len(subs):
        gap = subs[i+1]["start"] - sub["end"]
        if gap >= 0.3:  # 内容断点
            scene_bounds.append({"start": current_start, "end": subs[i+1]["start"]})
            current_start = subs[i+1]["start"]
scene_bounds.append({"start": current_start, "end": subs[-1]["end"]})
```

---

## 五、背景不能是纯黑

深色主题背景必须有动态效果：
- **Orbs**：3 个大圆（150px），颜色 accent/primary/secondary，blur 80px，从外向内浮动，opacity 0.5
- **Particles**：10 个小点（3-6px），从底部升起，opacity 0.5
- **Scan line**：高度 1px，accent 色，opacity 0.1，从上到下循环 3 秒
- **Grid**：40px 间距，accent 色，opacity 0.03

**踩坑**：User 说"怎么背景纯黑色的"、"背景加点动效"。纯黑背景 = 廉价感。

---

## 六、布局：内容必须撑满画面

- padding: 80px(上) + 180px(下，给字幕留空)，左右 120px
- 组件宽度 calc(100% - 60px)，高度 calc(100% - 120px)
- flex-wrap，gap 24px

**踩坑**：User 说"怎么动画不在中间填满"。之前 padding 太大导致内容区域只占画面中间一小块。

---

## 七、截帧中间帧必须用 vision 检查

截完帧后，选 3-4 个中间帧（0.3s, 0.5s 位置）用 `vision_analyze` 检查：
- 元素是否正确出现
- 动画效果是否可见（淡入、缩放等）
- 布局是否居中
- 是否有溢出/裁切

**评分标准**（0-10）：
- ≥8：通过，进入混音
- 6-7：可接受，记录问题
- ≤5：失败，必须修复 HTML 重截

**踩坑**：之前截完帧直接混音，结果 Intro 是空白、动画没触发，User 问"怎么检查的"。

---

## 八、HTML 模板必须包含 JS 动画循环

```html
<script>
let startTime = performance.now();
function animateElements() {
  const elapsed = (performance.now() - startTime) / 1000;
  // ... 时间驱动的动画逻辑
  requestAnimationFrame(animateElements);
}
animateElements();  // ← 必须调用！
</script>
```

**常见遗漏**：写了 animateElements 函数但忘记调用 `animateElements()`。

---

## 九、音频-字幕对齐：不要加偏移，用原始 VTT 时间戳

### 核心规则

**字幕时间戳必须直接用 VTT 原始值，禁止加 INTRO_DUR 偏移。**

有 Intro Title Card（4秒）时，常见错误是给字幕加 `+4s` 偏移，导致：
- 音频从 0s 开始播放
- 字幕从 4s 才开始显示
- 前 4 秒有声音无字幕

**正确做法**：字幕用 VTT 原始时间（从 ~0.1s 开始）。Intro 期间（0-4s）第一句字幕会显示在底部，完全无害。

```python
# ✅ 正确：直接用 VTT 时间
raw_subs = [[s[0], s[1], s[2]] for s in vtt_entries]

# ❌ 错误：加 INTRO_DUR 偏移
offset_subs = [[s[0]+4, s[1]+4, s[2]] for s in vtt_entries]
```

### 修复数据 vs 修复管道

当音频和字幕时间不对齐时，**永远先考虑修改数据（时间戳），而不是修改管道（音频）**。

本次实战：尝试用 FFmpeg `anullsrc + concat` 给音频前加 4 秒静音 → 超时失败。
正确解法：直接去掉字幕的 +4s 偏移 → 一行代码搞定。

| 场景 | 错误方案 | 正确方案 |
|------|----------|----------|
| 字幕比音频晚 4s | FFmpeg 给音频加 4s 静音 | 去掉字幕的 +4s 偏移 |
| 字幕比音频早 2s | FFmpeg 裁剪音频开头 | 给字幕加 +2s 偏移 |
| 场景边界和字幕不匹配 | 重新截帧 | 调整 sceneBounds |

### capture-v2.py 参数

```bash
# ✅ 正确：传课程编号（整数）
python3 /tmp/capture-v2.py 19

# ❌ 错误：传文件路径
python3 /tmp/capture-v2.py /tmp/lesson-19.html
```

脚本内部自己拼路径：`HTML = f'/tmp/lesson-{num}.html'`，`FRAMES = f'/tmp/frames-l{num}'`。

### FFmpeg 帧序列命名

capture 脚本输出 4 位数帧名：`frame_0000.png` ~ `frame_9999.png`。
FFmpeg 输入必须用 `frame_%04d.png`，**不是** `%05d`。

```bash
# ✅ 正确
ffmpeg -framerate 15 -i /tmp/frames-l19/frame_%04d.png ...

# ❌ 错误（找不到文件）
ffmpeg -framerate 15 -i /tmp/frames-l19/frame_%05d.png ...
```

### 后台进程的 cd 不生效

`terminal(background=true)` 中 `cd /tmp && cmd &` 的子 shell **不继承 cd**。
必须用绝对路径：

```bash
# ✅ 正确
ffmpeg -y -i /tmp/frames-l19/frame_%04d.png -i /tmp/lesson-19-voiceover.mp3 ...

# ❌ 错误（在 /mnt/c/Users/ 下找不到文件）
cd /tmp && ffmpeg -y -i frames-l19/frame_%04d.png ...
```

### Python re.sub + 中文 JSON 的陷阱

`json.dumps(chinese_text)` 产生 `\uXXXX` 转义，`re.sub` 的替换字符串会把 `\u` 当正则转义报错 `bad escape \u`。

```python
# ❌ 错误
html = re.sub(r'const subtitles = .*?;', 'const subtitles = ' + json.dumps(subs) + ';', html)

# ✅ 正确：用字符串切片替换，不用 re.sub
start = html.index('const subtitles = ')
end = html.index('];', start) + 2
html = html[:start] + 'const subtitles = ' + json.dumps(subs, ensure_ascii=True) + ';' + html[end:]
```

### 场景边界（sceneBounds）注意事项

sceneBounds 定义每个场景的显示时间窗口：
- Scene 0（Intro）：[0, 4]
- Scene 1+：按 VTT 内容断点切分

**不需要**因为字幕没偏移就调整 sceneBounds。Intro 期间字幕自然显示，不影响画面。
