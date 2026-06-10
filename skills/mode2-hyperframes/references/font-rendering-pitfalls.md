# Font Rendering Pitfalls in Headless Chromium

## Problem: Both Google Fonts CDN AND @font-face file:// Fail in Snap Chromium

Three approaches have been tested:

| Approach | Result |
|----------|--------|
| `@import url('https://fonts.googleapis.com/...')` | ❌ Google blocked in China / headless skips download |
| `@font-face { src: url('file:///home/.../font.ttf') }` | ❌ Snap chromium sandbox隔离读不到本地文件 |
| `<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css" />` | ✅ 通常可用，但间歇性失败（见下方"CDN不稳定性"章节） |
| CDN + woff2 子集嵌入（base64 @font-face） | ✅ 最可靠，CDN 失败时嵌入兜底 |

**根因**：snap 版 chromium 有严格沙箱，`file://` 协议无法访问用户目录下的字体文件。Google Fonts 在国内不通或极慢。

### Solution: CDN Stylesheet + 嵌入后备

```html
<head>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css" />
</head>
```

CSS 中直接用字体名：
```css
body {
  font-family: 'LXGW WenKai', 'Noto Sans CJK SC', 'Microsoft YaHei', system-ui, sans-serif;
}
```

### Verification

渲染后检查字体是否生效：
```python
font = page.evaluate("getComputedStyle(document.body).fontFamily")
# 应返回: "LXGW WenKai", "Noto Sans CJK SC", ...
```

如果视觉检查发现中文为方块□，说明字体未加载成功。

### Available Fonts (CDN)

| Font | CDN | Use |
|------|-----|-----|
| LXGW WenKai | `cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css` | 中文正文、字幕、终端中文 |
| Noto Sans SC | `fonts.font.im/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap` | 备用中文（国内镜像，jsdelivr不可用时用） |
| Noto Sans CJK SC | 系统安装（`fc-cache`）或 Google Fonts | 最后备选 |

### CDN Font Loading Race Condition (2026-06 教训)

jsdelivr CDN 在国内可能慢或间歇性超时。如果截帧时字体未加载完，中文会渲染为系统 fallback 字体（可能正常，也可能变方块）。

**双保险方案**：同时加载 LXGW WenKai（jsdelivr）+ Noto Sans SC（fonts.font.im 国内镜像），font-family 回退链包含两者：

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css" />
<link rel="stylesheet" href="https://fonts.font.im/css2?family=Noto+Sans+SC:wght@400;500;600;700&display=swap" />
```

```css
font-family: 'LXGW WenKai', 'Noto Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', system-ui, sans-serif;
```

**截帧前必须等字体+图片加载完**（见 playwright-wsl-pitfalls.md 的等待模式）。

### ⚠️ JetBrains Mono 不支持中文

JetBrains Mono 是纯英文字体，中文字符会渲染为方块□。如果终端/代码编辑器里有中文内容（如 `vibe "创建一个登录页面"`），必须在 `--mono` 变量中加 LXGW WenKai 做 fallback：

```css
/* 错 — 中文变方块 */
--mono: 'JetBrains Mono', monospace;

/* 对 — 中文 fallback 到 LXGW WenKai */
--mono: 'JetBrains Mono', 'LXGW WenKai', monospace;
```

这个 bug 的表现是：英文部分正常，中文变成□□□。用户会说"动画里有格格"或"识别不出来的中文"。

### Verification
After rendering, visually inspect frames for:
- Chinese characters showing as □ or tofu
- Font weight/style not matching expectations
- Inconsistent rendering between scenes

### Other Fonts That Work
- **JetBrains Mono**: Currently still loaded from Google Fonts. If it also fails, download the TTF and add a local @font-face.
- **System fonts**: `fc-list | grep -i "wenkai\|chakra"` to verify availability.

## 真实截图中的中文方块问题（与HTML字体无关）

**重要区分**：HTML 场景文件的字体渲染和真实截图（`<img>` 嵌入的网页截图）的字体渲染是**两个独立问题**。

- HTML 场景中的中文方块 → CDN 字体没加载完，加等待时间
- 真实截图中的中文方块 → 截图时目标网页没有中文字体，需要在 Playwright 注入

### 真实截图的正确修复方式

用 Playwright 抓取真实网页截图时，在**截图脚本**中注入字体 CSS，不要改 HTML 场景文件：

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--no-sandbox'])
    page = browser.new_page()
    
    # 注入中文字体 CSS（CDN 或 base64 子集均可）
    page.add_init_script("""
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css';
        document.head.appendChild(link);
    """)
    
    page.goto('https://example.com', wait_until='networkidle')
    page.wait_for_timeout(3000)  # 等字体加载
    page.screenshot(path='screenshot.png')
    browser.close()
```

### ⚠️ 不要把 base64 字体嵌入 HTML 场景文件

**事故**：为修复真实截图中的方块，把 113KB base64 字体子集嵌入 HTML 场景文件，导致：
- HTML 从 44KB 膨胀到 156KB
- Playwright 每帧加载大文件，截帧速度降 3-5 倍
- 截帧过程中断多次

**正确做法**：
1. 截图脚本单独注入字体（不影响 HTML 场景文件）
2. 已有截图有方块 → 用注入字体的 Playwright 重新抓取
3. HTML 场景的 CDN 字体保持不变

### CDN 字体在 snap chromium 中的不稳定性

CDN stylesheet（jsdelivr）有时能加载，有时静默失败（同一 HTML 文件，一次截帧正常，下一次变方块）。**根因不明**，可能与 snap 网络沙箱或 DNS 缓存有关。

**诊断方法**：截 3 帧（t=5, t=30, t=100），目视检查中文是否为方块□。如果有方块：

1. **首选**：在 HTML `<head>` 中嵌入 woff2 字体子集作为后备（CDN 保留，嵌入的 @font-face 优先级更高）
2. **次选**：加长 `wait_for_timeout` 到 3000-5000ms

**字体子集嵌入方法**（仅在 CDN 不稳定时使用）：
```bash
# 1. 提取 HTML 中用到的字符
python3 -c "
import re
html = open('scene.html').read()
chars = sorted(set(re.findall(r'[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]', html)))
print(''.join(chars))
" > chars.txt

# 2. 用 pyftsubset 生成 woff2 子集
pyftsubset /path/to/LXGWWenKai-Regular.ttf \
  --text-file=chars.txt --output-file=lxgw-subset.woff2 --flavor=woff2

# 3. base64 编码
base64 -w0 lxgw-subset.woff2 > lxgw-base64.txt

# 4. 嵌入 HTML（放在 CDN link 之后，@font-face 覆盖 CDN）
```

**⚠️ HTML 体积影响**：嵌入后 HTML 从 ~45KB 膨胀到 ~155KB，截帧时间增加约 2-3 倍（191秒@15fps 从 3.5 分钟涨到 ~4 分钟）。可接受范围内，比截帧出来全是方块强。

**铁律**：HTML 字体方案（CDN vs 嵌入）和截图字体注入（Playwright add_init_script）是两个独立问题，不要混为一谈。改一个不动另一个。

### ⚠️ Emoji 渲染：Noto Color Emoji + SVG 图标双方案

LXGW WenKai 不含 emoji 字形。snap chromium 环境默认没有 emoji 字体。**emoji 在 snap chromium 截帧中会显示为方块带X（☒）**。

**方案 A：安装 Noto Color Emoji（推荐，保留原始 emoji）**

```bash
# 下载安装（~10MB，从 jsdelivr CDN 下载比 GitHub 快）
wget -q "https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/fonts/NotoColorEmoji.ttf" \
  -O ~/.local/share/fonts/NotoColorEmoji.ttf
fc-cache -f ~/.local/share/fonts/
# 验证
fc-list | grep -i "emoji"  # 应显示 Noto Color Emoji
```

然后在 CSS font-family 中加 `'Noto Color Emoji'`：
```css
font-family: 'LXGW WenKai', 'Noto Sans CJK SC', 'Noto Color Emoji', system-ui, sans-serif;
```

**2026-06 验证**：snap chromium 能正确渲染 Noto Color Emoji，🎬🧩🧠 等 emoji 全部正常显示。

**方案 B：SVG 图标（比 emoji 更有质感，推荐用于场景标题）**

emoji 渲染正常但视觉偏扁平。用 SVG 线描图标 + 彩色底板 + 光晕替代 emoji，质感大幅提升。

```html
<!-- 替换前（emoji，能用但扁平） -->
<span class="sh-icon">🎬</span>

<!-- 替换后（SVG + 底板 + 光晕，精致） -->
<div class="sh-icon-wrap sh-red">
  <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2">
    <rect x="2" y="2" width="20" height="20" rx="3"/>
    <path d="M7 2v20"/><path d="M2 12h5"/>
  </svg>
</div>
```

详见 SKILL.md 的"SVG 场景标题设计"章节。

**方案 C：CSS 文字 badge（最可靠，兜底方案）**

网络受限无法安装 Noto Color Emoji 时，用 CSS 样式化的文字替代：

```html
<span class="sh-icon" style="background:linear-gradient(135deg,#E74C3C,#C0392B);color:#fff;width:64px;height:64px;border-radius:16px;display:inline-flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;font-family:system-ui,sans-serif">1</span>
```

**替换流程**：
1. 提取 HTML 中所有 emoji 字符（`python3 -c "import re; ... if ord(ch) > 0xFFFF"`）
2. 选择方案 A/B/C 逐个替换
3. 替换后再次扫描确认无残留 emoji（`ord(ch) > 0xFFFF`）
4. 截 3 帧验证无方块

**常见 emoji 替换方案**（方案 C 文字 badge 适用）：
| 原始 emoji | 替代方案 | 适用场景 |
|-----------|---------|---------|
| 🎬🧩🧠 (场景图标) | SVG 图标（首选）或彩色数字 badge | 场景标题 |
| 💡 (提示) | ✦ 金色 | 提示区块 |
| 📊📋🔌 (工具图标) | ◆ 彩色圆点 | 工具卡片 |
| 🔧🤖 (工具图标) | ⚙◆ | 工具卡片 |
| 📱📶🔋 (手机元素) | ⊙▂▃▅ | 手机模型（会淡出） |
| 🔍🔒 (搜索/锁定) | ⊕◉ | 手机模型 |
| 🔢 (验证码) | ⊛ | 手机模型 |

**⚠️ 不要只替换部分 emoji**——15 个 emoji 中有 1 个遗漏就会在某个帧里出现方块。替换后必须用 Python 扫描确认 `ord(ch) > 0xFFFF` 的字符数为 0。

### ⚠️ HTML 体积与 base64 字体嵌入的平衡

**CDN 字体在 snap chromium 中间歇性失败**——同一 HTML 文件，一次截帧正常，下一次中文变方块。根因可能与 snap 网络沙箱或 DNS 缓存有关。

**结论：base64 字体子集必须嵌入 HTML，不能只依赖 CDN。** CDN 作为首选，base64 作为兜底。

**体积优化**：不要用固定的大字符集，只提取 HTML 中实际用到的字符：
```bash
python3 -c "
import re
html = open('scene.html').read()
text = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL)
text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL)
text = re.sub(r'<[^>]+>', '', text)
chars = sorted(set(text.strip()))
print(''.join(chars))
" > chars.txt

pyftsubset LXGWWenKai-Regular.ttf --text-file=chars.txt --output-file=subset.woff2 --flavor=woff2
base64 -w0 subset.woff2 > subset-b64.txt
```

实测：232 个字符 → woff2 39KB → base64 52KB → HTML 约 95KB。比 402 字符的 113KB base64（HTML 158KB）小很多。

| HTML 大小 | 每帧耗时（1080×1920） | 191秒@15fps 总耗时 |
|-----------|---------------------|-------------------|
| < 50KB（无 base64） | ~50ms | ~3min |
| 50-100KB（精简 base64） | ~70ms | ~4min |
| > 150KB（大 base64） | ~100ms+ | ~5min+ |

**95KB 是可接受的折中**——比 158KB 快得多，比 45KB 可靠得多。

---

## Audio-Only Replacement Rule

When user says "在X基础上改" (work from version X as base) and only wants audio changes:

```bash
# CORRECT — copy video stream as-is, replace only audio
ffmpeg -y -i original.mp4 -i new_audio.wav \
  -c:v copy -c:a aac -b:a 192k \
  -map 0:v:0 -map 1:a:0 output.mp4

# WRONG — re-encoding video corrupts baked-in Chinese text
ffmpeg -y -i original.mp4 -i new_audio.wav \
  -filter_complex "[0:v]tpad=stop_mode=clone:stop_duration=3[v]" \
  -map "[v]" -map 1:a:0 -c:v libx264 output.mp4
```

**Why re-encoding breaks Chinese**: When video frames contain baked-in Chinese text (from Playwright capture), re-encoding with libx264 can corrupt the character rendering, especially if the original encoding parameters differ. `-c:v copy` avoids this entirely.

**If video is shorter than audio**: Do NOT use tpad to extend. Instead, re-capture frames with the correct duration first, THEN combine with audio. tpad + re-encoding corrupts baked-in Chinese text.
