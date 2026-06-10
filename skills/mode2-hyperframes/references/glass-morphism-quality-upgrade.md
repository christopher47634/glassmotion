# 玻璃态质感升级参考（2026-06-05）

参考 Linear 设计语言。用于 `popular-web-designs` skill 的 Linear 模板。

## 核心 CSS 模式

### scene-header（场景标题）

```css
.scene-header {
  position: relative;
  padding: 28px 36px;
  background: linear-gradient(135deg, rgba(255,255,255,0.5), rgba(255,255,255,0.2));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 24px;
  box-shadow:
    0 2px 8px rgba(0,0,0,0.04),
    0 8px 24px rgba(0,0,0,0.06),
    0 24px 48px rgba(0,0,0,0.08),
    inset 0 1px 0 rgba(255,255,255,0.6);
  display: flex; align-items: center; gap: 28px;
}
.scene-header::before {
  content: ''; position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 6px; border-radius: 24px 0 0 24px;
}
```

### hint-box（提示框）

```css
.hint-box {
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 16px;
  box-shadow:
    0 2px 8px rgba(0,0,0,0.04),
    0 4px 16px rgba(0,0,0,0.06),
    inset 0 1px 0 rgba(255,255,255,0.6);
}
```

### recap-item（回顾卡片）

```css
.recap-item {
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.4);
  border-radius: 16px;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),
    0 4px 12px rgba(0,0,0,0.06),
    inset 0 1px 0 rgba(255,255,255,0.6);
}
```

### phone-mockup / browser-mockup

```css
.phone-mockup {
  width: 300px; border-radius: 28px;
  border: 3px solid rgba(0,0,0,0.06);  /* 薄边框 */
  background: #fff;
  box-shadow:
    0 2px 4px rgba(0,0,0,0.02),
    0 8px 24px rgba(0,0,0,0.06),
    0 32px 64px rgba(0,0,0,0.12),
    inset 0 1px 0 rgba(255,255,255,0.8);
}
```

### terminal-mockup

```css
.terminal-mockup {
  background: #0D1117;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow:
    0 2px 4px rgba(0,0,0,0.08),
    0 12px 32px rgba(0,0,0,0.16),
    0 32px 64px rgba(0,0,0,0.24),
    0 0 80px rgba(88,166,255,0.06);  /* 蓝色光晕 */
}
```

### template-card

```css
.template-card {
  background: rgba(255,255,255,0.6);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 16px;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),
    0 4px 12px rgba(0,0,0,0.06),
    inset 0 1px 0 rgba(255,255,255,0.6);
}
```

### check-item / feature-tag

```css
.check-item {
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-radius: 16px;
  box-shadow:
    0 1px 2px rgba(0,0,0,0.04),
    0 4px 12px rgba(0,0,0,0.06),
    inset 0 1px 0 rgba(255,255,255,0.6);
}

.feature-tag {
  background: rgba(255,255,255,0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: 8px;
  box-shadow: 0 0 12px rgba(59,130,246,0.06);
}
```

## 背景光斑配置

| 场景 | 光斑1位置 | 颜色 | 光斑2位置 | 颜色 |
|------|-----------|------|-----------|------|
| S0 | center center | rgba(88,166,255,0.04) | — | — |
| S1 | right top | rgba(239,68,68,0.05) | left bottom | rgba(88,166,255,0.05) |
| S2 | left top | rgba(59,130,246,0.05) | right bottom | rgba(139,92,246,0.05) |
| S3 | right top | rgba(16,185,129,0.05) | left bottom | rgba(245,158,11,0.05) |
| S4 | center center | rgba(59,130,246,0.05) | — | — |

实现：场景容器 `::before` 伪元素，`position: absolute; pointer-events: none; border-radius: 50%; width/height 300-500px; margin: -100px（溢出）`

## Emoji → SVG 批量替换

用 Python 脚本批量替换 HTML 中所有 emoji 为 inline SVG：
1. grep 找出所有 emoji 位置和上下文
2. 定义 SVG 图标路径（stroke 风格，24x24 viewBox）
3. 每个替换保持周围 HTML 结构不变
4. 替换后 grep 验证 0 处 emoji 残留

常用 SVG 图标（stroke 风格）：
- 🎬 场记板：rect + path
- 🧩 网格/工作流：四矩形+连接线
- 🧠 灯泡/知识：path
- ✅ 对勾：polyline circle
- 🔧 扳手：path
- 🤖 机器人：circle rect path
- ✂️ 剪刀：circle path
- 📱 手机：rect
- 🔒 锁：path
- 📋 剪贴板：path rect
- 🔌 插头：path rect
- 📊 图表：rect polyline
- 🔍 搜索：circle line
