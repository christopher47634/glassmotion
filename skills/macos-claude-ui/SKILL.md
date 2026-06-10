---
name: macos-claude-ui
description: "用纯 HTML/CSS 模拟 macOS 桌面 + Claude.ai 聊天界面。用于科普视频中的界面演示场景。"
triggers:
  - "模拟Claude界面"
  - "macOS窗口"
  - "Claude聊天界面"
  - "虚拟录屏"
  - "Claude使用演示"
---

# macOS + Claude.ai 界面模拟

用纯 HTML/CSS 还原 macOS 桌面环境下的 Claude.ai 使用场景，用于科普/教学视频的虚拟录屏。

## 何时用

视频需要展示"有人在用 Claude"的画面时。不要真录屏——用代码绘制，动画驱动。

## macOS 窗口三要素

### 1. 交通灯按钮（红黄绿）
```css
.btn-close    { background: #FF5F57; }
.btn-minimize { background: #FEBC2E; }
.btn-maximize { background: #28C840; }
```
12px 圆形，gap: 8px，hover 显示 ×/−/+ 图标。

### 2. 窗口框架
```css
.mac-window {
  background: #FFFFFF;
  border-radius: 10px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(0,0,0,0.1);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
}
.title-bar {
  height: 52px;
  background: #E8E8E8;
  border-bottom: 1px solid rgba(0,0,0,0.1);
}
```

### 3. 桌面背景
```css
/* Sonoma 风格渐变 */
background: linear-gradient(135deg, #1a1a2e 0%, #16213e 40%, #0f3460 100%);
```

## Claude.ai 配色

| 元素 | 颜色 |
|------|------|
| 品牌色 | #D97706 (暖橙) |
| 侧边栏背景 | #171717 |
| 侧边栏文字 | #B4B4B4 |
| 聊天区背景 | #FFFFFF |
| 用户消息气泡 | #F5F5F5 |
| AI消息背景 | #FFFFFF |
| 输入框边框 | #D1D5DB |
| 输入框聚焦 | #D97706 |

## 布局结构

```
macOS桌面背景
  └── mac-window (居中，宽约70%画布)
      ├── title-bar (红黄绿按钮 + 标题)
      └── content
          ├── sidebar (260px, #171717)
          │   ├── logo + "Claude" 文字
          │   ├── 新建对话按钮
          │   └── 历史对话列表
          └── chat-area
              ├── messages (max-width: 720px, 居中)
              │   ├── user-msg (右对齐, #F5F5F5)
              │   └── ai-msg (左对齐, #FFFFFF)
              └── input-bar (底部固定)
                  ├── textarea
                  └── 发送按钮
```

## 动画要点

- 消息逐条出现（stagger 0.9s）
- AI 回复用打字机效果（逐字显示）
- 虚拟光标移动 + 点击
- 输入框打字动画 → 发送 → AI回复

## 竖屏适配 (1080×1920)

- 窗口宽度: 900px（左右留90px）
- 窗口高度: 1400px（上下留260px给标题+字幕）
- 侧边栏隐藏或极窄（竖屏优先展示聊天区）
- 字号放大30-50%

## 踩坑

- SF Pro 字体在 Linux 不可用，fallback 到 -apple-system → Helvetica Neue → sans-serif
- 竖屏时 sidebar 会挤压聊天区，建议竖屏版隐藏 sidebar
- 打字机动画和 seekTo 兼容：用 elapsed 驱动，不用 setTimeout
