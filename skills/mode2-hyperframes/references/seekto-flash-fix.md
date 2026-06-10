# seekTo 闪烁修复：isSeeking 模式

## 问题

Playwright 逐帧 seekTo（15fps = 66ms间隔）时，每次场景切换 `gotoScene` 重置 `triggeredPhases`，GSAP `fromTo`（duration 0.5s）从 opacity:0 重新播放 → 视觉上表现为"切场景时闪三下"。

## 根因

- seekTo 每帧调用，间隔 66ms
- GSAP fromTo duration 500ms >> 帧间隔
- gotoScene 重置 triggeredPhases → 每次切场景重新触发 fromTo(0→1)
- 帧1: opacity 0.3 → 帧2: seekTo 重置 → opacity 0 → fromTo 开始 → 视觉闪烁

## 解决方案

加 `isSeeking` 标志。seekTo 期间用 `gsap.set`（瞬设终态），非 seekTo 用 `gsap.fromTo`（动画过渡）。

```javascript
let isSeeking = false;

function animateScene(idx, elapsed) {
  if (elapsed >= 0.2 && !isTriggered(idx, 'p1')) {
    markTriggered(idx, 'p1');
    const el = document.querySelector('#s' + idx + ' .scene-header');
    if (!el) return;
    if (isSeeking) {
      gsap.set(el, {opacity: 1, y: 0, scale: 1});
    } else {
      gsap.fromTo(el, {opacity:0, y:30, scale:0.97},
        {opacity:1, y:0, scale:1, duration:0.7, ease:'power2.out'});
    }
  }
  // ... p2, p3, p4, p5 同理 — 每个都要处理 isSeeking
}

function seekTo(seconds) {
  isSeeking = true;
  // 场景切换 + animateScene 调用
  isSeeking = false;
}
```

## 注意事项

- `isSeeking` 在 seekTo 开头设 true，结尾设 false
- **每个** animateScene 分支都要处理 isSeeking（不只是 p1）
- gotoScene 中如果也有 fromTo 动画，也要用 isSeeking 守卫
- 人工播放（不用 seekTo 的浏览器预览）时 isSeeking=false，动画正常播放
- 不影响 seekTo 的功能——场景切换、字幕更新、进度条都正常工作
