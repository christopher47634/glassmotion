# HTML 组件库：多样化科技风视频组件

所有组件都是纯 HTML/CSS/JS，Playwright 逐帧截图时通过 JS 控制 CSS 类触发动画。

## 通用动画模式

所有组件共用这套 CSS 动画：

```css
@keyframes slideUp {
  from { opacity:0; transform:translateY(30px); }
  to { opacity:1; transform:translateY(0); }
}
@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes scaleIn {
  from { opacity:0; transform:scale(0.93); }
  to { opacity:1; transform:scale(1); }
}
@keyframes slideRight {
  from { opacity:0; transform:translateX(-10px); }
  to { opacity:1; transform:translateX(0); }
}
@keyframes blink { 50% { opacity:0; } }
```

JS 通过 `element.classList.add('show')` 触发动画，用 `time` 参数控制延迟。

## 组件 1：标题页

```html
<div class="scene active" id="s0">
  <div class="title-wrap">
    <h1>TITLE TEXT</h1>
    <div class="tagline">副标题</div>
  </div>
</div>
```

JS: `time > 0.3` 时 add show 到 h1，`time > 0.8` 时 add show 到 tagline。

## 组件 2：终端窗口

macOS 风格窗口框 + 逐行出现的命令输出。

```html
<div class="terminal">
  <div class="terminal-bar">
    <div class="dot dot-r"></div>
    <div class="dot dot-y"></div>
    <div class="dot dot-g"></div>
    <span class="terminal-title">~/project</span>
  </div>
  <div class="terminal-body">
    <div class="terminal-line" id="tl0">
      <span class="prompt">$</span> <span class="cmd">command here</span>
    </div>
    <!-- 更多行... -->
  </div>
</div>
```

样式要点：
- 背景 `#0D1117`，标题栏 `#161B22`
- 红黄绿三圆点 `#FF5F56 / #FFBD2E / #27C93F`
- 命令行绿色 `#3FB950`，输出灰色 `#8B949E`
- 高亮蓝色 `#58A6FF`
- 光标闪烁：`.cursor-blink` 用 `animation: blink 0.7s step-end infinite`

JS: 逐行出现，间隔 0.35s：`if (t > 0.5 + i * 0.35) el.classList.add('show');`

## 组件 3：代码编辑器 + 实时预览

三栏布局：侧边栏文件树 + 代码编辑器 + 浏览器预览。

```html
<div class="editor-wrap">
  <div class="sidebar">
    <div class="sidebar-header">Explorer</div>
    <div class="file-item active" id="fi0">📄 Login.tsx</div>
    <div class="file-item" id="fi1">🎨 auth.css</div>
  </div>
  <div class="editor-main">
    <div class="editor-tabs">
      <div class="editor-tab active">Login.tsx</div>
    </div>
    <div class="editor-content">
      <div class="code-line" id="cl0">
        <span class="line-num">1</span>
        <span class="line-content"><span class="kw">import</span> ...</span>
      </div>
    </div>
  </div>
  <div class="preview-panel">
    <div class="preview-bar">
      <div class="preview-dot"></div>
      <span>Live Preview — localhost:5173</span>
    </div>
    <div class="preview-content" id="previewContent">
      <!-- 预览内容 -->
    </div>
  </div>
</div>
```

语法高亮配色（亮色主题）：
- 关键字 `.kw` → `#8B5CF6`（紫）
- 函数 `.fn` → `#2563EB`（蓝）
- 字符串 `.str` → `#059669`（绿）
- 数字 `.num` → `#D97706`（橙）
- 类型 `.type` → `#DC2626`（红）
- 变量 `.var` → `#E11D48`（玫红）

JS: 文件树 0.15s 间隔，代码行 0.18s 间隔，预览 2s 后出现。

## 组件 4：AI 对话

用户消息 + AI 回复气泡交替出现。

```html
<div class="chat-container">
  <div class="msg user" id="msg0">
    <div class="msg-avatar">V</div>
    <div class="msg-bubble">用户消息</div>
  </div>
  <div class="msg ai" id="msg1">
    <div class="msg-avatar">🤖</div>
    <div class="msg-bubble">AI 回复</div>
  </div>
</div>
```

样式要点：
- 用户消息靠右，紫色背景 `#7C3AED`
- AI 消息靠左，白色背景 + 边框
- 头像圆角 12px
- 气泡圆角 16px，底部尖角 4px

JS: 每条消息间隔 0.9s：`if (t > 0.3 + i * 0.9) el.classList.add('show');`

## 组件 5：数据指标卡片

三列网格，数字动态递增 + 进度条动画。

```html
<div class="metrics-grid">
  <div class="metric-card" id="mc0">
    <div class="metric-icon">⚡</div>
    <div class="metric-value cyan" id="mv0">0x</div>
    <div class="metric-label">指标说明</div>
    <div class="metric-bar">
      <div class="metric-bar-fill cyan" id="mb0"></div>
    </div>
  </div>
</div>
```

JS: 数字递增公式：
```javascript
let progress = Math.min(1, (t - 0.4 - i * 0.3) / 1.5);
document.getElementById('mv0').textContent = Math.round(progress * 10) + 'x';
document.getElementById('mb0').style.width = (progress * 100) + '%';
```

## 组件 6：结尾页 + CTA

```html
<div class="scene" id="s5">
  <h1>TITLE</h1>
  <div class="end-sub">副标题</div>
  <button class="end-cta">开始体验 →</button>
</div>
```

CTA 按钮用 `pulse` 动画持续呼吸发光。

## HUD 装饰层（全局）

所有场景共享，`position: fixed; z-index: 999`：

```html
<div class="hud">
  <div class="hud-corner hud-tl"></div>
  <div class="hud-corner hud-tr"></div>
  <div class="hud-corner hud-bl"></div>
  <div class="hud-corner hud-br"></div>
  <div class="hud-rec">
    <div class="rec-dot"></div>
    <span class="rec-label">REC</span>
  </div>
  <div class="hud-time" id="hudTime">00:00</div>
  <div class="hud-progress">
    <div class="hud-progress-fill" id="progressFill"></div>
  </div>
</div>
```

JS: 每帧更新时间和进度条：
```javascript
document.getElementById('hudTime').textContent = formatTime(time);
document.getElementById('progressFill').style.width = (time/duration*100)+'%';
```

## 背景网格（全局）

```css
.bg-grid {
  position: fixed; inset: 0;
  background-image:
    linear-gradient(rgba(8,145,178,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(8,145,178,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
}
```

暗色主题用 `rgba(0,240,255,0.03)`，亮色主题用 `rgba(8,145,178,0.04)`。
