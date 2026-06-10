# 动画组件参考（定稿版）

> **进阶技巧**：如需更复杂的动画效果（GSAP、多层组合、缓动曲线、模糊效果），请参考 → `advanced-animation-techniques.md`

## 核心动画技巧

### 1. 子元素交错入场（Stagger）

每个场景的子元素不是同时出现，而是逐个弹入。JS 中用 `t > base + i * interval` 控制：

```js
// 终端行：每 0.35s 出现一行
for (let i=0; i<=9; i++) {
  let e = document.getElementById('tl'+i);
  if (e && t > 0.5 + i*0.35) e.classList.add('show');
}

// 代码行：每 0.18s 出现一行
for (let i=0; i<=14; i++) {
  let e = document.getElementById('cl'+i);
  if (e && t > 0.8 + i*0.18) e.classList.add('show');
}

// 对话气泡：每 0.9s 出现一条（对话需要阅读时间，间隔大）
for (let i=0; i<=3; i++) {
  let e = document.getElementById('msg'+i);
  if (e && t > 0.3 + i*0.9) e.classList.add('show');
}

// 指标卡片：每 0.3s 出现一张
for (let i=0; i<=2; i++) {
  let e = document.getElementById('mc'+i);
  if (e && t > 0.4 + i*0.3) e.classList.add('show');
}

// 侧边栏文件：每 0.15s 出现一个（快速扫过）
for (let i=0; i<=4; i++) {
  let e = document.getElementById('fi'+i);
  if (e && t > 0.5 + i*0.15) e.classList.add('show');
}
```

**间隔参考值（经过验证）：**
| 组件 | 间隔 | 说明 |
|------|------|------|
| 终端行 | 0.35s | 需要阅读，不能太快 |
| 代码行 | 0.18s | 快速扫过，体现"AI 生成速度" |
| 侧边栏文件 | 0.15s | 最快，装饰性 |
| 对话气泡 | 0.9s | 最慢，用户需要阅读内容 |
| 指标卡片 | 0.3s | 中等，数字有动画所以稍快 |

### 2. 多阶段入场

场景不是一步到位，而是分 3 个阶段：
```
阶段1 (t+0.2s): 容器整体入场（terminal/editor-wrap/chat-container）
阶段2 (t+0.5s): 子元素交错入场（行/消息/卡片）
阶段3 (t+2.0s): 装饰/预览元素延迟出现（preview 面板、CTA 按钮）
```

### 3. 容器组合变换

容器入场用 `translateY + scale` 组合，比单独位移更有"重量感"：

```css
/* 好：组合变换，有立体感 */
.terminal { opacity: 0; transform: translateY(30px) scale(0.97); }
.terminal.show { animation: slideUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }

/* 平：只有位移，像 PPT */
.terminal { opacity: 0; transform: translateY(30px); }
```

### 4. 数字滚动 + 进度条同步

指标卡片的数字从 0 滚动到目标值，进度条同步填充：

```js
// 在 JS 中逐帧计算
let p = Math.min(1, (t - startTime) / 1.5);  // 1.5s 完成
if (p > 0) {
  // 数字滚动
  document.getElementById('mv0').textContent = Math.round(p * 10) + 'x';
  // 进度条填充
  document.getElementById('mb0').style.width = (p * 100) + '%';
}
```

CSS 中进度条用 cubic-bezier 缓动：
```css
.metric-bar-fill {
  transition: width 1.5s cubic-bezier(0.16,1,0.3,1);
}
```

### 5. 字幕切换动画

字幕用 `.visible` 类控制显隐，带 opacity + transform transition：

```css
.subtitle-text {
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.25s, transform 0.25s;
}
.subtitle-text.visible {
  opacity: 1;
  transform: translateY(0);
}
```

JS 中：
```js
if (txt) { subEl.textContent = txt; subEl.classList.add('visible'); }
else { subEl.classList.remove('visible'); }
```

### 6. 渐变文字

结尾标题用渐变色文字：

```css
.gradient-text {
  background: linear-gradient(135deg, var(--cyan), var(--purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### 7. CTA 脉冲发光

按钮入场后持续发光脉冲：

```css
.end-cta.show {
  animation: fadeIn 0.5s 0.8s forwards, pulse 2s 1.3s infinite;
}
@keyframes pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(8,145,178,0.3); }
  50% { box-shadow: 0 0 30px 10px rgba(8,145,178,0.15); }
}
```

## 终端窗口

```html
<div class="terminal">
  <div class="terminal-header">
    <div class="terminal-dot red"></div>
    <div class="terminal-dot yellow"></div>
    <div class="terminal-dot green"></div>
    <span class="terminal-title">Terminal</span>
  </div>
  <div class="terminal-body">
    <div class="terminal-line" id="cmd1">
      <span class="prompt">$</span> <span class="cmd-text"></span>
    </div>
  </div>
</div>
```

CSS 要点：
- 背景 #0D1117，圆角 12px，外层 shadow
- 标题栏三圆点：红 #FF5F56，黄 #FFBD2E，绿 #27C93F，直径 12px
- 命令文字逐字出现：JS 控制 `textContent += char`
- 输出行在命令完成后 fade-in

## 代码编辑器

```html
<div class="editor-wrap">
  <div class="sidebar">
    <div class="sidebar-header">Explorer</div>
    <div class="file-item active" id="fi0"><span class="file-icon">📄</span> Login.tsx</div>
    <div class="file-item" id="fi1"><span class="file-icon">🎨</span> auth.css</div>
    <div class="file-item" id="fi2"><span class="file-icon">📦</span> package.json</div>
  </div>
  <div class="editor-main">
    <div class="editor-tabs">
      <div class="editor-tab active">Login.tsx</div>
      <div class="editor-tab">auth.css</div>
    </div>
    <div class="editor-content">
      <div class="code-line" id="cl0"><span class="line-num">1</span><span class="line-content">...</span></div>
    </div>
  </div>
  <div class="preview-panel">
    <div class="preview-bar"><div class="preview-dot"></div><span>Live Preview — localhost:5173</span></div>
    <div class="preview-content" id="previewContent">
      <div class="preview-card">
        <h3>Welcome Back</h3>
        <p>Sign in to your account</p>
        <button class="btn">Sign In →</button>
      </div>
    </div>
  </div>
</div>
```

三栏布局：侧边栏(260px) + 编辑器(flex:1) + 预览面板(550px)。

侧边栏要点：
- 文件图标用 emoji（📄🎨📦⚙️📝），不引入图标库
- 活跃文件有左边框高亮 `border-left: 2px solid var(--cyan)`
- 文件项交错入场，间隔 0.15s

预览面板要点：
- 顶部状态栏有绿色圆点 + "Live Preview — localhost:5173"
- 内容区用渐变背景 `linear-gradient(135deg, #667eea, #764ba2)`
- 白色卡片居中，有大圆角 + 阴影
- 延迟 2s 出现（等代码行先展示完）

语法高亮色（米白主题）：
- keyword (.kw): #8B5CF6 (紫)
- function (.fn): #2563EB (蓝)
- string (.str): #059669 (绿)
- number (.num): #D97706 (橙)
- comment (.cmt): #9CA3AF (灰, italic)
- operator (.op): #0891B2 (青)
- type (.type): #DC2626 (红)
- variable (.var): #E11D48 (玫红)

动画：代码行逐行出现（translateX(-5px) + opacity），每行间隔 0.18s

## AI 对话气泡

```html
<div class="chat-container">
  <div class="chat-bubble ai">
    <div class="avatar">AI</div>
    <div class="bubble-text">你好，我是 AI 助手</div>
  </div>
  <div class="chat-bubble user">
    <div class="bubble-text">帮我写个函数</div>
    <div class="avatar">U</div>
  </div>
</div>
```

动画：每条气泡从底部 slide-up + opacity，间隔 0.8-1.2s

## 数据指标卡片

```html
<div class="metric-card">
  <div class="metric-icon">⚡</div>
  <div class="metric-value" data-target="10">0</div>
  <div class="metric-label">分钟完成</div>
</div>
```

动画：数字从 0 滚动到目标值（JS counter），进度条填充（width 0→100%）

## 标题页

```html
<div class="title-page">
  <h1 class="main-title">Vibe Coding</h1>
  <p class="subtitle">让编程变得像说话一样自然</p>
  <div class="title-decoration"></div>
</div>
```

动画：标题 scale(0.95→1) + opacity，副标题延迟 0.5s fade-in，装饰线宽度动画

## 场景切换

所有场景默认 `display: none`，激活场景加 `active` 类：
```css
.scene { opacity: 0; pointer-events: none; position: absolute; inset: 0; }
.scene.active { opacity: 1; pointer-events: auto; }
```

场景切换时旧场景 fade-out(0.3s) → 新场景 fade-in(0.3s)，同时触发 whoosh SFX。

## CSS 动画缓动函数参考

```css
/* 定稿默认：弹性入场（实际验证效果最好） */
cubic-bezier(0.16, 1, 0.3, 1)

/* 标准缓入缓出 */
cubic-bezier(0.25, 0.46, 0.45, 0.94)

/* 弹性出场（仅用于数据卡片数字） */
cubic-bezier(0.34, 1.56, 0.64, 1)

/* 平滑入场 */
cubic-bezier(0.25, 1, 0.5, 1)
```

**定稿用 `cubic-bezier(0.16,1,0.3,1)`**，比标准 ease-in-out 更有弹性但不过头。

## 对比卡片布局（三列对比）

用于多工具/多方案对比场景。三张卡片等距排列，每张有独立色系标识：

```html
<div class="comparison-cards">
  <div class="comp-card tool-a">
    <div class="comp-icon">🦞</div>
    <div class="comp-name">Tool A</div>
    <div class="comp-verdict">胜在全能</div>
    <div class="comp-desc">描述文字</div>
  </div>
  <div class="comp-card tool-b"><!-- 同结构 --></div>
  <div class="comp-card tool-c"><!-- 同结构 --></div>
</div>
```

CSS 要点：
- 卡片宽度 460px，间距 30px，`border-radius: 16px`
- 顶部 3px 色条 `::before` 伪元素区分工具（黄/紫/青）
- 每张卡片有独立色系：name 和 verdict 用该色系颜色
- 背景 `rgba(255,255,255,0.03)` + 边框 `rgba(255,255,255,0.08)`
- 交错入场间隔 0.3s

布局：`display: flex; gap: 30px; justify-content: center;`

## 背景网格（bg-grid）

用 CSS 渐变画科技感网格背景，不引入图片：

```css
.bg-grid {
  position: fixed; inset: 0;
  background-image:
    linear-gradient(rgba(8,145,178,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(8,145,178,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  z-index: 0;
}
.scene { z-index: 1; }  /* 场景在网格上方 */
```

## HUD 叠加层

```html
<div class="hud">
  <div class="hud-corner hud-tl"></div>
  <div class="hud-corner hud-tr"></div>
  <div class="hud-corner hud-bl"></div>
  <div class="hud-corner hud-br"></div>
  <div class="hud-rec"><div class="rec-dot"></div><span class="rec-label">REC</span></div>
  <div class="hud-time" id="hudTime">00:00</div>
  <div class="hud-progress"><div class="hud-progress-fill" id="progressFill"></div></div>
</div>
```

四角用 80x80px border-only div 做 L 形装饰框（不是文字角标）：
```css
.hud-corner {
  position: absolute; width: 80px; height: 80px;
  border-color: rgba(8,145,178,0.15); border-style: solid; border-width: 0;
}
.hud-tl { top:20px; left:20px; border-top-width:2px; border-left-width:2px; }
/* ... 其他三个角类似 */
```

实时时钟（JS 每帧更新）：
```js
let m = Math.floor(time/60), s = Math.floor(time%60);
document.getElementById('hudTime').textContent =
  String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
```

进度条用渐变填充：
```css
.hud-progress-fill {
  background: linear-gradient(90deg, var(--cyan), var(--purple));
  width: 0%; transition: width 0.1s linear;
}
```

## 字幕驱动机制

Playwright capture 脚本中，每帧根据当前时间查找对应字幕：
```python
page.evaluate("""
  const t = %f;
  const sub = window.SUBS.find(s => t >= s[0] && t <= s[1]);
  document.getElementById('subtitleText').textContent = sub ? sub[2] : '';
""" % t)
```

SUBS 数组格式：`[[start_sec, end_sec, "文本"], ...]`
