# 开场标题卡 + 布局填充规范

## 开场标题卡（intro scene）

每课开头必须有一个 4 秒的纯视觉标题卡，不配音。

### 结构

```html
<div class="scene active" id="s0">
  <div class="intro-wrap">
    <div class="intro-icon" data-delay="0.3">🎬</div>
    <div class="intro-module" data-delay="0.6">模块6</div>
    <div class="intro-title" data-delay="1.0">接单实战</div>
    <div class="intro-title" data-delay="1.4">第一单怎么来</div>
    <div class="intro-line" data-delay="1.8"></div>
  </div>
</div>
```

### CSS

```css
.intro-wrap { display:flex; flex-direction:column; align-items:center; 
              justify-content:center; gap:24px; text-align:center; }
.intro-icon { font-size:80px; opacity:0; transform:scale(0.5); }
.intro-module { font-size:36px; color:var(--blue); font-weight:600; 
                letter-spacing:4px; opacity:0; transform:translateY(20px); }
.intro-title { font-size:64px; font-weight:800; line-height:1.3; 
               opacity:0; transform:translateY(30px);
               background:linear-gradient(135deg,var(--text),var(--blue));
               -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
.intro-line { width:120px; height:4px; 
              background:linear-gradient(90deg,var(--blue),var(--purple)); 
              border-radius:2px; opacity:0; transform:scaleX(0); }
```

### 时间偏移

intro 占 4 秒。content 场景从 4.0s 开始。字幕时间全部 +INTRO_DUR 偏移。

```python
INTRO_DUR = 4.0
offset_subs = [[s[0] + INTRO_DUR, s[1] + INTRO_DUR, s[2]] for s in subs]
bounds = [{"start": 0, "end": INTRO_DUR}]  # intro
for i in range(n_scenes):
    s = INTRO_DUR + content_dur * i / n_scenes
    e = INTRO_DUR + content_dur * (i + 1) / n_scenes
    bounds.append({"start": round(s, 3), "end": round(e, 3)})
```

**铁律**：字幕的 offset 必须和 sceneBounds 用同一个 INTRO_DUR，否则字幕和画面不同步。

---

## 布局 padding 规范（1080x1920 竖屏）

### 问题

padding 过大会浪费画面空间，内容看起来"不居中"、"太空"。

### 实测值

| padding | 可用高度 | 适用场景 |
|---------|---------|---------|
| 120px + 220px = 340px | 1580px | ❌ 太大，内容浮在中间 |
| 80px + 180px = 260px | 1660px | ✅ 推荐 |
| 60px + 160px = 220px | 1700px | ✅ 内容多时用 |

### 规则

- **上 padding**：80px（HUD REC + 时间显示需要 60px 空间）
- **下 padding**：180px（字幕条在 bottom:160px，需要空间）
- **左右 padding**：60px（和 HUD 角框对齐）
- **justify-content: center** — 内容垂直居中在可用空间内

### 内容溢出自检

```
可用高度 = 1920 - top_padding - bottom_padding = 1660px
单个场景内容上限 = 1500px（留 160px 余量）

场景内容高度估算：
  scene-header: ~120px
  margin-bottom: 32px
  tag-card × 3: ~240px (每张 80px)
  margin-top: 24px
  homework-card: ~120px
  ---
  总计: ~536px ✓ 远低于 1500px
```

### 检查清单（vision_analyze 验证）

截帧后用 vision_analyze 检查：
1. 开场卡：模块号+标题+渐变文字+装饰线，居中
2. 内容场景：标题栏+卡片正常显示，内容居中但不过分留白
3. 底部字幕：不被截断，不溢出
