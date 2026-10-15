---
name: mode2-hyperframes
description: "Mode2 纯稿子视频：用 HTML/CSS 动画 + Playwright 逐帧截图 → FFmpeg 合成 MP4。支持多样化组件（终端、代码编辑器、聊天、数据卡片等）。用户只描述需求，AI 写 HTML 并渲染。"
triggers:
  - "纯稿子视频"
  - "无口播视频"
  - "hyperframes"
  - "mode2"
  - "文字动画视频"
  - "HTML视频"
  - "HTML 逐帧截图视频"
  - "程序化视频"
  - "虚拟录屏"
---

# Mode2: 纯稿子视频生产

> 读取顺序：本文件（铁律+流程）→ 按需加载 references/ 下的主题文件。
> 详细索引见 `references/INDEX.md`。

---

## 一、铁律（任何冲突以此为准）

1. **质量 > 速度**。一次一课，禁止批量模板。
2. **逐场景从零设计**。禁止套模板、禁止生成器脚本批量产。引擎（TTS/截图/混音）可复用，画面必须定制。
3. **分镜表是画面唯一权威**。口播稿只用于配音。分镜与本总纲冲突时，按总纲的平滑版本。
4. **做不好先调研**。该出真实素材就不用通用占位。
5. **User 说什么就按什么改**。不听指令 = 最严重故障。
6. **音频 VTT 是唯一时间基准**。视频场景时长必须严格匹配 VTT 实际时间戳，禁止用脚本标注的目标时长。派工程师时必须在规格里写明 VTT→场景映射。详见 `references/wsl-rendering-pitfalls.md`。

---

## 二、设计 Token（每课开头定一次，全片不变）

| 维度 | 规则 |
|------|------|
| 主题 | 科普→米白暖色；硬核/工具→暗色科技。一课一主题不混 |
| 配色 | 1 主色 + 1 强调色 + 中性灰，强调色只用在最该被看见处 |
| 字体 | 字体文件放项目 `fonts/`，@font-face 用相对路径（可从 `$FONTS_DIR` 复制），字幕用 ZCOOL KuaiLe 圆体，禁 CDN/emoji |
| 字号 | h1 ≥ 72px，字幕 58px（User 48+10=58，嫌小看不清） |
| 间距 | 8 的倍数节奏，统一圆角、柔和阴影 |
| 图标 | IconPark / Iconfont / Lucide，禁止 flat+3D+emoji 混搭 |

深色/浅色主题切换见 → `references/cross-theme-animation-adaptation.md`

---

## 三、视觉审美（6 条）

1. **动画克制** — 同屏最多 2 层动画（1 主 + 1 环境微动），入场 0.4-0.7s ease-out，禁止弹跳
2. **呼吸感** — 动画间留 0.3-0.8s 空白
3. **一屏一焦点** — 60-70% 面积给主体，30-40% 给辅助
4. **风格统一** — 全片一组 token
5. **层次分明** — 背景极淡渐变，内容区微妙卡片（白底 3-5% 透明度 + 1px 边框 6-8%）
6. **信息克制** — 每屏 1 个核心观点 + 1 个数据/图表

---

## 四、动画架构

### 核心：seekTo(t) 是 t 的纯函数

截帧脚本对每一帧调用 `window.seekTo(t)` 后立刻截图，不等动画、不保证调用顺序。
所以画面只能由 t 算出来：禁定时器、requestAnimationFrame、performance.now、播放中的 GSAP tween、CSS transition/infinite 动画、flag 状态。

```html
<script src="scripts/seek-animation.js"></script>
<script>
  window.seekTo = function (t) {
    const { index, local } = GMSeek.sceneAt(SCENE_BOUNDS, t);   // SCENE_BOUNDS 来自 VTT
    GMSeek.showScene(document.querySelectorAll('.scene'), index);
    GMSeek.timeDriven(document.getElementById('s' + index), local); // 元素用 data-delay / data-animation
    GMSeek.subtitle(document.getElementById('sub'), SUBTITLES, t);
  };
</script>
```

完整规范与自检 → `references/seekto-runtime.md`；起手模板 → `templates/starter.html`。

### 动画加载顺序

1. 基础组件 → `references/animation-components.md`（stagger、渐进高亮、计数器、打字机等）
2. **动画灵感与提升** → `references/animation-inspiration.md`（参考网站、缓动选择、多层组合、stagger编排、User对动画质量的要求）
3. **高级动画** → `references/advanced-animation-techniques.md`（缓动曲线、多层组合、模糊、时间线；出片时 GSAP 时间线必须 `paused` 并用 `GMSeek.timeline(tl, t)` 驱动）
4. **动画库** → `scripts/seek-animation.js`（GMSeek：容器入场、交错、数字滚动、光晕脉冲等，全部是 t 的纯函数，可出片）；`scripts/interactive-animation.js`（GMLive：鼠标/滚动/实时效果，只用于预览页，不能出片）
5. 背景动效 → `references/background-effects-dark.md`（3 层：光球 + 粒子 + 扫描线）
6. 虚拟录屏 → `references/virtual-recording-engine.md`（终端、代码编辑器、聊天模拟）
   - macOS+Claude界面模拟 → `macos-claude-ui` skill（红黄绿按钮、Claude.ai配色、打字机动画）
7. 科普/技术热点视频默认风格 → `popular-science-video-style` skill（深色科技风、64px字幕、三层背景动效）
8. **Lottie动画** → `lottie-web-integration` skill（loading/转场/图标动效；出片时用 `goToAndStop(t*1000, false)` 由 seekTo 驱动）

### Lottie vs GSAP 选择指南

| 场景 | 推荐 | 原因 |
|------|------|------|
| loading/转场图标 | Lottie | 现成素材省时间，颜色可定制 |
| 终端打字/节点连线 | GSAP | 需要代码精确控制时序 |
| 卡片入场/文字动画 | GSAP | 与seekTo兼容更好 |
| 物理动画（弹跳/流体）| Lottie | AE制作的效果更自然 |

### 双轨对比流程（新场景）

1. 新场景写两版 HTML：`scene-XX-gsap.html` + `scene-XX-lottie.html`
2. 各用 `scripts/verify-template.py --times` 截 2 帧（间隔 1 秒），确认动画在动
3. 把 4 张图发给用户选，选定后再整片渲染

### 常见动画陷阱

- **动画太单调/幼稚/没有动效**（User原话）— 这是最常犯的错。不能只做淡入+位移就完事。必须组合多层动效：位移+缩放+模糊+透明度，配合缓动曲线。参考优秀网站（Stripe/Linear/Vercel的动效）学习高级动画手法。
- **标题做流光效果，禁止抽搐抖动**（User原话："动画闲的没事干抽搐啥，标题有动效不能做流光的吗非得抽搐和老年痴呆一样"）。标题用 CSS shimmer（gradient sweep），不用 GSAP yoyo bounce。作业墙等强调效果用平滑 scale pulse，不用 rapid x/rotation tween。
- **动画质量检查清单**：缓动只用 power2Out / power3Out / sineInOut / backOut（GMSeek.ease 里都有），禁止急转向或快速振荡（看起来像抽搐）。入场动画 0.4-0.7s，环境微动用 `GMSeek.breathe` / `glowPulse`（sin(t)，不用无限循环 tween）。
- 截帧空白、闪烁、半透明帧 → 都是 seekTo 有状态或有过渡，见 `references/seekto-runtime.md`
- 时间驱动元素的 data-delay 编排示例 → `references/time-driven-animation.md`

---

## 五、背景动效

深色主题必须有 3 层动态背景（纯黑/纯白禁止）：
- 层 1: 浮动光球（orb）— radial-gradient + blur
- 层 2: 粒子系统（particle）— 小圆点漂浮
- 层 3: 扫描线（scan line）— 水平渐变扫过

代码模板 → `references/background-effects-dark.md`

浅色主题：保留动效，orbs opacity 降至 0.15，背景换 #F8F6F1 → `references/dark-to-light-mapping.md`

---

## 六、Intro Title Card

每课第一个场景必须是 4 秒 Intro（4×4 grid：模块+课号+标题+亮点+讲师），**绝不允许跳过**。

详见 → `references/intro-card-and-layout.md`

---

## 七、生产流程（6 步）

### 0. 预览（可选）

```bash
cd /path/to/project && python3 -m http.server 8080   # 浏览器里调 seekTo(t) 检查画面；截帧脚本直接读本地文件，不需要服务
```

### 1. TTS 配音（先做，音频时长决定视频时长）

- 默认 edge-tts `zh-CN-YunxiNeural` +5% 语速（免费）；要更自然可用 MiniMax T2A（需自备 API key 和 voice_id，见 `references/minimax-tts-api.md`）
- 稿子写进文件，用 `edge-tts --file script.txt`，不要 `--text "$(cat …)"`
- 每段台词单独 MP3 + 0.3-0.5s 静音间隔，FFmpeg concat 合并，ffprobe 量实际时长生成 VTT
- VTT 是字幕和场景边界的唯一时间来源，禁止 AI 估算
- 详见 `references/wsl-rendering-pitfalls.md` 的「TTS 语音选择」

### 2. 设计 → 写 HTML

- 按分镜表逐场景写 HTML，每场景独立文件
- 组件参考 → `references/html-components-library.md`
- 布局：padding 80px(上) + 180px(下，字幕留空)，左右 120px

### 3. 截帧

```bash
python3 scripts/capture-template.py scenes.html --vtt voiceover.vtt --fps 15 --out frames
```

- 后端统一 Playwright；浏览器：`--chromium` / `CHROMIUM_PATH` / Playwright 自带 Chromium
- viewport 必须和 HTML body 尺寸一致（竖屏 1080×1920，`--width/--height`）
- 任何一帧失败都会以退出码 1 结束并列出失败帧，不会留下断档的帧序列
- 截帧后抽查中间帧：`python3 scripts/verify-template.py scenes.html --times 2 8 15`
- 编码：`bash scripts/nvenc-template.sh frames mixed.m4a out.mp4`（无 NVIDIA GPU 时 `ENCODER=libx264`）

截帧踩坑 → `references/capture-and-subtitle-pitfalls.md`
WSL 环境（TMPDIR、系统 Chromium、FFmpeg 中文路径、字体方块）→ `references/wsl-rendering-pitfalls.md`、`references/playwright-wsl-pitfalls.md`

### 4. 混音

- BGM-only 音量 0.6-0.85
- 人声 + BGM 混合
- SFX 用 FFmpeg lavfi 纯代码生成

详见 → `references/sfx-bgm-workflow.md`

### 5. 字幕集成

- 字幕时间线**必须从 VTT 提取**
- 字幕文本直接用口播稿分段，禁止改写
- **每条字幕 ≤ 20 个中文字**（User 要求碎切，不要又粗又长）
- **推荐 ASS 格式**：精确控制字体与描边（ZCOOL KuaiLe 圆体, 58px, Bold=0, 底部居中）
- **默认不加 Shadow 和背景框**：Shadow=2 会在字幕后生成黑色矩形。白字直接叠在画面上，只用描边（Outline=3, Shadow=0）；要加背景框先和用户确认
- FFmpeg 中文路径问题：先 `cp` ASS/VTT 到 `/tmp` 再引用
- **改字幕 = 同步改 subtitles + sceneBounds + totalDuration 三处**
- 字幕用 VTT 原始时间戳，禁止加 INTRO_DUR 偏移
- 场景边界对齐 VTT 内容断点（找 0.3s+ 间隔），禁止均匀分配
- **ASS时间戳时间基必须和目标视频一致**（2026-06-10 实测踩坑）：
  - 如果ASS烧到原始视频再speedup → ASS用原始时间戳（不除以SPEED）
  - 如果ASS烧到已speedup的视频 → ASS用speedup时间戳（除以SPEED）
  - 混淆两者=字幕全部偏移。rebuild.py旧版bug：ASS除以SPEED但烧到原始视频
- **ASS时间戳格式必须是 `H:MM:SS.CC`**（2026-06-11 实测踩坑）：
  - `{g_start:.2f}` 生成 `3.33`，ASS解析器静默忽略 → 字幕完全不显示
  - 必须用 `f"{h}:{m:02d}:{s:05.2f}"` 生成 `0:00:03.33`
- **字体路径验证**（2026-06-11 实测踩坑）：
  - `fontsdir=/usr/share/fonts` 找不到用户安装的字体
  - ZCOOL KuaiLe 通常在 `~/.fonts/`，用 `fc-list | grep -i zcool` 确认
  - 正确：`fontsdir=/home/user/.fonts`
- **禁止按字数比例分配时间**（2026-06-10 实测踩坑）：中文语速非匀速，"Anthropic"比"昨天"慢。必须用 Whisper 词级时间戳做对齐。详见 `references/whisper-subtitle-alignment.md`

字幕集成 → `references/subtitle-integration.md`（含 ASS 生成代码、碎切脚本、User 风格偏好表）
Whisper词级对齐 → `references/whisper-subtitle-alignment.md`（faster-whisper + 原文映射，解决按字数均分错位问题）
字幕/音频不匹配诊断 → `references/subtitle-audio-mismatch-diagnosis.md`
VTT 验证 → `references/vtt-verification-with-whisper.md`

### 6. 检查 → 交付

质量清单 → `references/quality-checklist.md`（9步流程，31项检查）

- 工程检查：每帧可见、seekTo切换、GSAP兼容、竖屏适配
- 字幕检查：每条≤20字、时间轴与VTT对齐、无间隙无重叠
- 审美审核（5.1-5.6）：动画居中不占满、动效自然流畅、层次分明、留白充足、色彩和谐、整体美观自然
- **最终审核：截图看3秒，觉得不舒服就调，不要交出去**
- 工程正确≠好看，审美审核不过=不交付
- **审核员必须验证播放体验**（2026-06-11 教训）：审核员不能只检查 ffprobe 技术指标，必须实际截帧验证字幕可见、听语音确认字幕同步。本次审核员 27/27 全 PASS 但字幕根本没显示（ASS格式错+字体路径错），说明纯技术检查不够
- **"以后默认用这个风格"=存配置，不是改当前成品**（2026-06-11 教训）：User 说"以后做科普视频默认这个"时，意思是把当前风格存成 skill/模板供未来使用。绝对不能去改已经定稿的当前视频。先确认改的是「配置」还是「产物」再动手
- **版本迭代记录**：每个版本记录改了什么。/tmp 只留最新版，旧版中间产物确认后立即删除
- **清理中间文件前确认新版本可用**（2026-06-11 教训）：不要在 rebuild 过程中删掉 concat_raw.mp4 / speed_12x.mp4 等中间产物，除非新版本已经验证通过。本次清理时删掉了所有中间文件，导致需要从头重建，工程师重建时丢失了动画效果

---

## 八、其他技术参考

| 主题 | 文件 |
|------|------|
| 高级动画技巧（GSAP/缓动/模糊/时间线） | `references/advanced-animation-techniques.md` |
| 动画库 | `scripts/seek-animation.js`（出片）、`scripts/interactive-animation.js`（仅预览） |
| 字体渲染踩坑 | `references/font-rendering-pitfalls.md` |
| 动画-语音同步 | `references/animation-timeline-sync.md` |
| MiniMax TTS API | `references/minimax-tts-api.md` |
| FFmpeg 表达式踩坑 | `references/ffmpeg-expression-pitfalls.md` |
| Fallback 方案 | `references/fallback-pipeline.md`（FFmpeg drawtext，最低优先级） |
| 逐场景工序 | `references/per-scene-workflow.md` |
| 玻璃态质感 | `references/glass-morphism-quality-upgrade.md` |
| **热点AI科普速查** | **`references/trending-ai-news-explainer.md`**（调研→分镜→生产5步流水线） |
| Sub-agent 验证 | `references/sub-agent-verification.md`（防假报告） |

---

## 参考文件索引

完整分类索引见 → `references/INDEX.md`
