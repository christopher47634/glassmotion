# 虚拟录屏引擎 — 组件库架构与使用指南

## 概念

用 HTML/CSS/GSAP 动画模拟真实软件界面的录屏效果。不需要实际录屏——所有 UI 元素用代码绘制，交互用动画还原。

**核心优势**：组件建好后跨视频复用。25个视频（引流10+付费15）共享同一套组件库，改内容不改结构。

## 三层架构

```
~/course-studio/
├── core/                    # 基础动画层（所有视频共用）
│   └── engine.html          # 8个组件，API挂window
├── layers/                  # 工具UI组件（模拟录屏画面）
│   ├── chat-generic.html    # 通用AI对话框
│   ├── pipeline-animation.html  # 流水线动画
│   ├── coze-canvas.html     # 扣子工作流画布
│   ├── hermes-terminal.html # Hermes Agent终端（深色终端+子代理流程+进度条+文件操作）
│   └── jianying-text2video.html # 剪映文字成片（紫色主题+时间轴+预览+波形）
├── scenes/                  # 每条视频的场景编排
│   ├── yl-02.html           # 引流02（5场景，33.5s）
│   ├── lesson-01.html       # 正式课第1课（8场景，187s）
│   └── lesson-01-script.md  # 第1课逐字稿+分镜表
├── research/                # 真实UI调研文档+截图
│   ├── coze-ui.md           # 扣子工作流编辑器
│   ├── manus-ui.md          # Manus agent
│   ├── jianying-ui.md       # 剪映文字成片
│   ├── jimeng-ui.md         # 即梦AI
│   └── screenshots/         # Claude Code/Hermes真实界面截图
└── pipeline/                # 管线脚本
    └── capture-yl02.py      # Playwright截帧
```

## core/engine.html — 8个基础组件

| 组件 | window API | 关键功能 |
|------|-----------|---------|
| 虚拟鼠标光标 | `window.virtualCursor` | `.moveTo(x,y,duration)`, `.click(x,y)`, `.followPath(points,duration)` — Catmull-Rom贝塞尔曲线，涟漪点击 |
| 打字机 | `window.typewriter` | `.run(element,text,speed)`, `.clear()` — 逐字显示，光标闪烁，中文支持 |
| 高亮系统 | `window.highlight` | `.box(x,y,w,h,color)`, `.arrow(from,to)`, `.zoom(x,y,w,h,scale)`, `.clearAll()` |
| 场景管理器 | `window.sceneManager` | `.show(sceneId,transition)`, `.hide(sceneId)` — fade/slide/none |
| 字幕渲染器 | `window.subtitle` | `.load(vttData)`, `.show(text)`, `.hide()`, `.play()` — 60px, z-index:90 |
| 数字滚动 | `window.counterRoll` | `.run(element,target,duration,prefix,suffix)` — easeOutCubic |
| 进度条 | `window.progressBar` | `.fill(element,percent,duration)` — 青紫渐变 |
| 工具提示 | `window.tooltip` | `.show(targetEl,text,position)`, `.hide()` — 自动定位 |

## layers/ — 工具UI组件

### chat-generic.html — AI对话界面
- 深色聊天界面(#0f0f1a)
- AI头像(蓝紫渐变)左对齐 / 用户头像(灰色)右对齐
- 消息气泡: AI=#1e1e2e, 用户=#2563eb
- 逐条出现动画(stagger 0.9s), AI消息打字机效果
- API: `window.chatUI.addMessage(type,text,animate)`, `.typeUserInput(text)`, `.clear()`, `.showTypingIndicator()`

### pipeline-animation.html — 流水线动画
- 三节点: 📰行业新闻 → 🤖AI自动整理 → 📱推送到微信
- 节点卡片200×120px, 深色背景#1e1e2e
- 连线: 渐变色(青→紫), 数据流发光粒子
- 完成时全部变绿 + "✓ 流水线完成"
- API: `window.pipeline.play()`, `.reset()`, `.highlightNode(index)`

### coze-canvas.html — 扣子工作流编辑器
- 三栏: 左节点面板(200px) + 中央画布 + 右属性面板(280px)
- 画布: 浅灰#F5F5F5 + 点阵网格
- 预置工作流: 开始(绿▶) → LLM大模型(蓝🤖) → 输出(灰■)
- 连线: SVG贝塞尔曲线, stroke-dashoffset绘制动画
- 虚拟光标点击"运行", 节点依次执行(蓝→绿)
- API: `window.cozeCanvas.playWorkflow()`, `.addNode(type,x,y)`, `.connectNodes(fromId,toId)`, `.selectNode(id)`

### hermes-terminal.html — Hermes Agent终端
- 深色终端窗口(#0D1117)，红黄绿三圆点标题栏
- 模拟Hermes Agent交互：用户输入命令 → AI规划子任务 → 子代理并行执行 → 结果汇总
- 子代理流程可视化：任务分发→进度条→结果收集
- 文件操作动画：读取/写入/编辑文件的终端输出
- 适用于：Agent实操课、Hermes功能演示、终端操作教程

### jianying-text2video.html — 剪映文字成片
- 紫色主题界面，模拟剪映"文字成片"功能
- 左侧：文字输入/脚本编辑区
- 右侧：视频预览窗口 + 时间轴
- 时间轴：多轨道（视频片段+音频波形+字幕轨道）
- 自动匹配素材动画：文字→AI匹配画面→生成视频片段
- 适用于：AI剪辑功能介绍、视频制作流程演示

## 场景文件编写模式

每个视频一个自包含HTML文件，组合 core + layers：

```html
<!-- 场景0: 标题页 -->
<div class="scene active" id="s0">
  <canvas id="particle-canvas"></canvas>
  <h1>大标题 (72px+)</h1>
  <p class="subtitle">副标题</p>
</div>

<!-- 场景1: 使用工具层 -->
<div class="scene" id="s1">
  <!-- 内联或重绘工具UI的关键部分 -->
</div>

<!-- 字幕层 (z-index:90) -->
<div class="subtitle-bar">
  <div id="subtitle-text"></div>
</div>

<!-- HUD层 -->
<div class="hud">
  <div class="rec-dot"></div>
  <div class="progress-bar"><div id="progress-fill"></div></div>
</div>

<script>
// 必须暴露给 Playwright:
window.gotoScene = function(idx) { ... };
window.updateSubtitle = function(t) { ... };
window.updateProgress = function(t) { ... };
</script>
```

## 完整管线流程

1. **调研真实UI** — 搜索工具截图/教程，输出 research/*.md
2. **建组件层** — 按调研文档用HTML/CSS/GSAP还原UI
3. **组装场景** — 写 scenes/xxx.html，组合组件+配时间轴
4. **生成TTS** — edge-tts --voice zh-CN-XiaoxiaoNeural → .mp3 + .vtt
5. **Playwright截帧** — 30fps，按VTT时间轴切场景+更新字幕
6. **FFmpeg合成** — CRF 18, yuv420p, aac 192k
7. **(可选) SFX+BGM** — 叠加音效和背景音乐

## BGM混合（ffmpeg）

voiceover + BGM → mixed.m4a:
```bash
ffmpeg -y -i voiceover.mp3 -i bgm.mp3 \
  -filter_complex "[1:a]volume=0.18,afade=t=in:st=0:d=2,afade=t=out:st=30.5:d=3[bgm];[0:a][bgm]amix=inputs=2:duration=first:dropout_transition=2[out]" \
  -map "[out]" -c:a aac -b:a 192k mixed.m4a
```

注意：bgm的afade out时间 = 语音总时长 - 3s（如33.5s语音 → st=30.5）。

## ⚠️ 关键教训（从实际项目总结）

### 字幕时间轴必须来自VTT
不要预估"0-3s是第一句"。先生成TTS，再读VTT，把实际时间戳抄入场景文件。
预估时间导致字幕和语音严重错位，返工全部重做。

### window API必须显式暴露
场景文件中IIFE内部的updateSubtitle/updateProgress是局部变量，Playwright evaluate调不到。
必须在IIFE末尾添加 `window.updateSubtitle = updateSubtitle;` 等赋值。

### 米白色主题是课程视频默认
AI变现课程系列用 #FBF7F0 米白背景，不是暗色科技风。
暗色只用于工具内部（终端窗口、画布内部）。
从暗色切米白时不要全局替换——功能色（强调/状态/禁用）要逐个判断。

## 已验证的渲染结果

- 中文渲染: LXGW WenKai CDN stylesheet (jsdelivr) 正常，无方块。@font-face file:// 和 Google Fonts 都会失败。
- 暗色主题: #0a0a1a 背景统一
- 米白主题: #FBF7F0 背景，文字 #1a1a1a，字幕用白底+细边框（不要text-shadow）
- 扣子画布: 三节点+连线+运行动画，仿真度高
- 流水线动画: 数据流粒子+完成态绿色
- 聊天气泡: AI左/用户右，头像+打字效果
- 文件大小: 33.5s竖屏 1.1-1.4MB（CRF18动画压缩效率高）

## ⚠️ 竖屏布局注意事项

竖屏（1080×1920）不是横屏的等比缩放。详见 SKILL.md "竖屏 vs 横屏：两套完全不同的布局" 章节。

关键差异：
- 管线节点：横屏水平排列，竖屏垂直排列（节点内部横向：图标左+文字右）
- 字号：竖屏所有元素放大 30-50%
- 字幕：竖屏 48px（横屏 60px），位置上移 bottom:180px
- 动画：seekTo 模式下所有入场动画必须 ≤1 秒完成
