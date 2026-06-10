# 浅色主题复用深色主题动画的适配规范

> 2026-06-06 实战总结：User 要求"15-18课用浅色主题，但动画和特效要借鉴深色主题"

---

## 一、设计原则

浅色主题不是"把深色反过来"。保留深色主题的：
- 动效系统（fadeIn、stagger、glow pulse、shimmer、scan line）
- 组件结构（terminal、code-editor、chat、data-card 等）
- 动画时序和 data-delay 值

只改颜色和材质：
- 背景：米白 #F8F6F1（暖白底，不是冷白）
- 文字：深灰 #1A1A2E（不是纯黑 #000）
- 卡片：白底 #FFFFFF + 柔和阴影
- 主色：保留深色主题的 accent 色，但降低饱和度 10-15%
- 高亮：降低 glow 强度（深色 glow 0.3 → 浅色 glow 0.15）

---

## 二、背景适配

### 深色主题背景
```css
body { background: #0a0a0f; }
/* orbs: opacity 0.5, blur 80px */
/* particles: opacity 0.5 */
/* grid: opacity 0.03, accent color */
```

### 浅色主题背景
```css
body { background: #F8F6F1; }
/* orbs: opacity 0.15, blur 100px, 颜色降低饱和度 */
/* particles: opacity 0.1, 用深色 */
/* grid: opacity 0.04, 用灰色 #ccc */
/* scan line: opacity 0.05, 用灰色 */
```

---

## 三、组件适配

### 终端组件
```css
/* 深色 */
.terminal { background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); }

/* 浅色 */
.terminal { background: #F0EDE8; border: 1px solid #E0DDD8; border-radius: 12px; }
.terminal .line { color: #2D2D2D; }
```

### 代码编辑器
```css
/* 深色 */
.code-editor { background: #1e1e2e; }

/* 浅色 */
.code-editor { background: #F5F2ED; }
.code-editor .line-num { color: #999; }
.code-editor .line-content { color: #1A1A2E; }
```

### 数据卡片
```css
/* 深色 */
.card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); }

/* 浅色 */
.card { background: #FFFFFF; border: 1px solid #E8E5E0; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
```

### 输入框
```css
/* 深色 */
.input { background: rgba(255,255,255,0.06); color: #F5F5F5; }

/* 浅色 */
.input { background: #F0EDE8; color: #1A1A2E; border: 1px solid #D8D5D0; }
```

---

## 四、动效保留清单

以下深色主题动效**必须保留**到浅色主题，只调整参数：

| 动效 | 深色参数 | 浅色参数 |
|------|---------|---------|
| 文字 fadeIn | opacity 0→1 | 同 |
| 卡片 slideIn | translateY(30px) | 同 |
| Glow pulse | box-shadow 0 0 20px rgba(accent, 0.3) | 降低为 0.15 |
| Shimmer | linear-gradient 透明→白5%→透明 | 透明→黑3%→透明 |
| Stagger delay | 0.3s | 同 |
| Scan line | accent色, opacity 0.1 | 灰色, opacity 0.05 |
| Orbs float | blur 80px, opacity 0.5 | blur 100px, opacity 0.15 |
| Particles rise | accent色, opacity 0.5 | 深灰色, opacity 0.1 |

---

## 五、字体不变

字体 E:\Fonts\ 两个主题共用，不改。字号不改。只改字体颜色：
- 标题：深色 #F5F5F5 → 浅色 #1A1A2E
- 正文：深色 #CCCCCC → 浅色 #4A4A5A
- 高亮：accent 色保持不变（或略降饱和度）

---

## 六、常见错误

| 错误 | 正确做法 |
|------|---------|
| 浅色主题去掉所有动效 | 保留动效，只调颜色和透明度 |
| 背景纯白 #FFFFFF | 用暖白 #F8F6F1，带一点米色 |
| 文字纯黑 #000000 | 用深灰 #1A1A2E，更柔和 |
| Glow 效果完全去掉 | 保留但降低强度 |
| 去掉背景 orbs/particles | 保留但大幅降低 opacity |
