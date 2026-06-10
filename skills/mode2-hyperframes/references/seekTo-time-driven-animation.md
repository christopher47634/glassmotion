# seekTo 时间驱动动画（帧级捕获必备）

## 核心问题

旧方案用 `classList.add('show')` + flag 触发，只在实时播放有效。Playwright 逐帧截帧时，
每帧独立调 `seekTo(t)`，flag 会重置，导致动画要么全显示要么全隐藏。

## 正确方案：data-delay + elapsed 时间差

每个元素声明 `data-delay="0.6"`（相对场景开始的秒数），seekTo 计算 elapsed = 
当前时间 - 场景开始时间，根据 elapsed 和 delay 的关系决定元素状态：

```js
function seekTo(seconds) {
  // 1. 找当前场景
  let sceneIdx = 0;
  for (let i = 0; i < sceneBounds.length; i++) {
    if (seconds >= sceneBounds[i].start && seconds < sceneBounds[i].end) {
      sceneIdx = i; break;
    }
    if (i === sceneBounds.length - 1) sceneIdx = i;
  }

  // 2. 切换场景可见性
  document.querySelectorAll('.scene').forEach((s, i) =>
    s.classList.toggle('active', i === sceneIdx));

  // 3. 时间驱动元素动画
  const elapsed = seconds - sceneBounds[sceneIdx].start;
  const scene = document.getElementById('s' + sceneIdx);
  if (scene) {
    scene.querySelectorAll('[data-delay]').forEach(el => {
      const delay = parseFloat(el.getAttribute('data-delay'));
      const dur = 0.4; // 动画持续时间
      if (elapsed >= delay + dur) {
        // 完全显示
        gsap.set(el, {opacity:1, y:0, x:0, scale:1, scaleX:1});
      } else if (elapsed >= delay) {
        // 动画中（easeInOutQuad）
        const t = (elapsed - delay) / dur;
        const ease = t < 0.5 ? 2*t*t : 1-Math.pow(-2*t+2,2)/2;
        gsap.set(el, {
          opacity: ease,
          y: 30 * (1 - ease),
          x: el.classList.contains('tag-card') ? -30 * (1 - ease) : 0,
          scale: 0.9 + 0.1 * ease,
          scaleX: el.classList.contains('intro-line') ? ease : 1
        });
      } else {
        // 未到时间，隐藏
        gsap.set(el, {opacity:0, y:30, scale:0.9});
      }
    });
  }
}
window.seekTo = seekTo; // 必须暴露
```

## 元素 data-delay 分配规范

| 元素类型 | delay | 说明 |
|---------|-------|------|
| scene-header | 0.2s | 最先出现 |
| 第一个 card | 0.6s | header 完成后开始 |
| 后续 card | +0.35s each | 交错入场 |
| quote-card | 1.8s | 画面稳定后 |
| homework-card | 1.2s | 中等延迟 |

## 开场标题卡 (s0)

每课必须以 4 秒开场标题卡开头：
- 场景 s0，class="scene active"（默认显示）
- 元素：icon(0.3s) + 模块号(0.6s) + 标题行1(1.0s) + 标题行2(1.4s) + 装饰线(1.8s)
- 标题用渐变文字 `background-clip: text`
- INTRO_DUR = 4.0s

## 字幕时间偏移

有开场标题卡时，音频从 4s 开始播。VTT 的原始时间需要 +4s 偏移：
```python
offset_subs = [[s[0] + INTRO_DUR, s[1] + INTRO_DUR, s[2]] for s in vtt_subs]
```

## ⚠️ 关键陷阱

1. **字幕必须读 VTT 真实时间**，绝不能手估。VTT 有 N 条就用 N 条，不要合并精简。
2. **场景边界按 VTT 总时长 + INTRO_DUR 计算**，不要按口播稿字数估。
3. **seekTo 必须 window.seekTo = seekTo 暴露**，Playwright 才能调。
4. **中文引号 "" 会导致 JS 语法错误**，字幕中用空格或英文引号替代。
