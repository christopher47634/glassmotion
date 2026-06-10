# 时间驱动动画系统（v2 方案）

## 为什么不用 flag 触发（triggeredPhases）

旧方案用 `triggeredPhases[idx + '_1']` 这样的 flag 控制动画触发时机。**问题**：seekTo 跳到任意时间时，flag 状态不确定——可能从未被设置，导致元素永远不出现；或者已经被设置，导致动画不会重播。

**根本原因**：flag 是有状态的（stateful），但 seekTo 需要无状态（stateless）——给定任意时间 T，输出应该完全确定。

## v2 方案：data-delay + elapsed 时间驱动

每个可动画元素标记 `data-delay`（秒，相对于场景开始时间）。seekTo 计算当前场景内已过时间(elapsed)，只显示 delay 已到期的元素，正在过渡中的元素做插值。

### HTML 结构

```html
<div class="scene" id="s1">
  <!-- 容器：delay 0.2s -->
  <div class="scene-header sh-blue shimmer" data-delay="0.2">
    <div class="sh-icon">📦</div>
    <div class="sh-text">
      <div class="sh-num">第一条路</div>
      <div class="sh-title">接单代做</div>
    </div>
  </div>
  
  <!-- 卡片：从 0.6s 开始，stagger 0.35s -->
  <div class="cards-wrap">
    <div class="tag-card" data-delay="0.6">
      <span class="tag-badge">回钱最快</span>
      <span class="tag-text">帮商家做AI视频</span>
    </div>
    <div class="tag-card" data-delay="0.95">
      <span class="tag-badge">起步首选</span>
      <span class="tag-text">今天会做明天就能接</span>
    </div>
    <div class="tag-card" data-delay="1.3">
      <span class="tag-badge">代价</span>
      <span class="tag-text">自己找客户谈价催款</span>
    </div>
  </div>
  
  <!-- 作业卡：delay 1.2s -->
  <div class="homework-card" data-delay="1.2">
    <div class="homework-label">作业</div>
    <div class="homework-text">写三句话说明为什么选这条路</div>
  </div>
</div>
```

### JavaScript

```javascript
const TRANSITION_DUR = 0.4; // 每个元素渐入时长（秒）

function seekTo(seconds) {
  // 1. 找当前场景
  let sceneIdx = 0;
  for (let i = 0; i < sceneBounds.length; i++) {
    if (seconds >= sceneBounds[i].start && seconds < sceneBounds[i].end) {
      sceneIdx = i; break;
    }
    if (i === sceneBounds.length - 1) sceneIdx = i;
  }

  // 2. 切场景（display切换）
  document.querySelectorAll('.scene').forEach((s, i) => 
    s.classList.toggle('active', i === sceneIdx)
  );

  // 3. 时间驱动元素动画
  const elapsed = seconds - sceneBounds[sceneIdx].start;
  const scene = document.getElementById('s' + sceneIdx);
  if (scene) {
    scene.querySelectorAll('[data-delay]').forEach(el => {
      const delay = parseFloat(el.getAttribute('data-delay'));
      
      if (elapsed >= delay + TRANSITION_DUR) {
        // 已完成 → 终态
        gsap.set(el, { opacity: 1, y: 0, x: 0, scale: 1, scaleX: 1 });
        
      } else if (elapsed >= delay) {
        // 渐入中 → 插值（easeInOutQuad）
        const t = (elapsed - delay) / TRANSITION_DUR; // 0..1
        const ease = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2) / 2;
        
        // 不同元素类型有不同的入场方向
        let targetX = 0;
        if (el.classList.contains('tag-card')) targetX = -30; // 从左滑入
        if (el.classList.contains('intro-line')) {           // scaleX 展开
          gsap.set(el, { opacity: ease, scaleX: ease, scaleY: 1 });
          return;
        }
        
        gsap.set(el, {
          opacity: ease,
          y: 30 * (1 - ease),
          x: targetX * (1 - ease),
          scale: 0.9 + 0.1 * ease
        });
        
      } else {
        // 未到时 → 隐藏
        let initX = 0;
        if (el.classList.contains('tag-card')) initX = -30;
        gsap.set(el, { opacity: 0, y: 30, x: initX, scale: 0.9 });
      }
    });
  }

  // 4. 字幕
  const sub = subtitles.find(s => seconds >= s[0] && seconds < s[1]);
  const subEl = document.getElementById('subtitleText');
  if (sub) { subEl.textContent = sub[2]; subEl.classList.add('visible'); }
  else { subEl.classList.remove('visible'); }

  // 5. 进度条 + HUD时间
  document.getElementById('progressFill').style.width = 
    (seconds / totalDuration * 100) + '%';
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  document.getElementById('hudTime').textContent = 
    String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
}

window.seekTo = seekTo; // 必须暴露到全局
```

### delay 推荐值

| 元素类型 | delay | 说明 |
|---------|-------|------|
| scene-header (容器) | 0.2s | 最先出现 |
| 第一个子元素 | 0.6s | 容器出现后 0.4s |
| 后续子元素 | +0.35s each | stagger 效果 |
| warn/truth card | 0.6-1.3s | 同上 |
| quote card | 1.8s | 比较晚，制造节奏感 |
| homework card | 1.2s | 在卡片之后 |

### 开场标题卡（intro scene）

每课开头加一个 4 秒的标题卡，不配音，纯视觉：

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

**intro 元素 CSS**：
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

**时间偏移**：intro 占 4 秒，content 场景的 sceneBounds 从 4.0s 开始。字幕时间也要 +4s 偏移。

```python
INTRO_DUR = 4.0
offset_subs = [[s[0] + INTRO_DUR, s[1] + INTRO_DUR, s[2]] for s in subs]
bounds = [{"start": 0, "end": INTRO_DUR}]  # intro scene
for i in range(n_scenes):
    s = INTRO_DUR + content_dur * i / n_scenes
    e = INTRO_DUR + content_dur * (i + 1) / n_scenes
    bounds.append({"start": round(s, 3), "end": round(e, 3)})
```

### 验证方法

截帧前必须验证动画渐入效果：

```python
# 拍 3 个时间点的截图检查
page.evaluate('seekTo(2.5)')  # intro 卡，应看到标题
page.screenshot(path='verify-intro.png')

page.evaluate('seekTo(5.0)')  # 场景1中间，应看到部分元素渐入
page.screenshot(path='verify-mid-anim.png')

page.evaluate('seekTo(8.0)')  # 场景1完成，应看到所有元素
page.screenshot(path='verify-complete.png')
```

用 vision_analyze 检查：
1. intro 帧：模块号+标题+渐变文字+装饰线，居中
2. mid-anim 帧：部分元素可见、部分半透明（渐入中）、部分不可见
3. complete 帧：所有元素完全显示

### 常见错误

1. **忘记 window.seekTo = seekTo** → seekTo is not defined
2. **字幕时间未加 INTRO_DUR 偏移** → 字幕和画面不同步
3. **intro 元素 data-delay > 4.0s** → intro 场景结束了元素还没出现
4. **TRANSITION_DUR 太大（>0.6s）** → 截帧间隔 66ms 内动画还没完成，看起来抖动
5. **tag-card 的 x 初始值设错** → 应该是 -30（从左滑入），不是 30
