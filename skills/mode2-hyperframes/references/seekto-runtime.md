# seekTo 运行时规范（逐帧截图的唯一标准）

本文件取代旧的 seekTo-time-driven-animation / seekto-flash-fix / seekto-instant-switch /
gsap-capture-pitfall / seekto-and-subtitle-pitfalls / phase-based-animation 六份文档。
它们给出的 isSeeking、triggeredPhases、instant 参数等做法都是「有状态」补丁，已不再使用。

## 一条规则

`window.seekTo(t)` 必须是 **t 的纯函数**：同一个 t，无论之前调用过什么、调用多快，
DOM 结果完全一样。`scripts/capture-template.py` 对每一帧只做两件事：调用 `seekTo(t)`、立刻截图。
它不等待动画播完，也不保证调用顺序。

由此推出：

| 禁止 | 原因 | 改用 |
|------|------|------|
| `setTimeout` / `setInterval` / `requestAnimationFrame` / `performance.now()` / `Date.now()` | 跟真实时钟走，截图快慢不同结果不同 | 一切从参数 `t` 计算 |
| `gsap.to` / `gsap.fromTo` 播放中的 tween | 异步，截图时停在中间态或空白 | `GMSeek.*` 直接算状态，或 `paused: true` 的时间线 + `GMSeek.timeline(tl, t)` |
| flag（`triggered`、`isSeeking`、`currentScene` 判重） | 跳帧、倒序调用时状态错乱 | 不保存任何「上一帧」状态 |
| CSS `transition` / `animation … infinite` | 切换 class 后截到半透明帧 | 内联 style 由 seekTo 写入；周期效果用 `GMSeek.breathe` / `glowPulse`（sin(t)） |
| `Math.random()` | 每帧不同 | 预先生成固定种子数组 |

## 标准写法

```html
<script src="../scripts/seek-animation.js"></script>
<script>
  const SCENE_BOUNDS = [ { start: 0, end: 4 }, { start: 4, end: 11.2 } ];   // 来自 VTT
  const SUBTITLES = [ [4.00, 6.35, "第一句"], [6.35, 9.10, "第二句"] ];       // 来自 VTT，原样
  const scenes = document.querySelectorAll('.scene');

  window.seekTo = function (t) {
    const { index, local } = GMSeek.sceneAt(SCENE_BOUNDS, t);
    GMSeek.showScene(scenes, index);                    // 直接切换 display/opacity，无过渡
    GMSeek.timeDriven(scenes[index], local);            // 按 data-delay / data-animation 计算每个元素
    GMSeek.subtitle(document.getElementById('sub'), SUBTITLES, t);  // 按时间查找，不按序号
  };
  window.seekTo(0);
</script>
```

元素声明：`<div class="card" data-delay="0.6" data-animation="fadeInUp">`。
`data-delay` 是相对场景开始的秒数；可选 `data-animation`（fadeInUp / scaleIn / blurIn / slideLeft / fade）和 `data-duration`（默认 0.4s）。

### 想用 GSAP 时间线

```js
const tl = gsap.timeline({ paused: true });
tl.from('.title', { y: 40, opacity: 0, duration: 0.6, ease: 'power3.out' });
window.seekTo = (t) => { GMSeek.timeline(tl, t); };
```

时间线必须 `paused: true`，由 `seek(t)` 驱动；GSAP 未加载时 `GMSeek.timeline` 返回 false 而不报错。
`repeat: -1`、`yoyo` 无限循环不能用。

## 场景与字幕

- `SCENE_BOUNDS` 由 VTT 计算：场景边界放在两条字幕之间 ≥0.3s 的停顿处，不按字数均分。
- 有 4 秒 Intro 时，音频整体后移 4s，`SCENE_BOUNDS` 与 `SUBTITLES` 都用加偏移后的时间；
  只在一个地方加偏移（生成数组时），不要在 seekTo 里再加。
- 字幕用 `GMSeek.subtitle` 按 t 查找：VTT 分段和场景分段不是一一对应的。
- 字幕文本含中文引号时用 JSON 序列化写入数组，避免 JS 语法错误。

## 自检

1. 浏览器控制台：`seekTo(5); seekTo(1); seekTo(5)` 前后两次截图必须完全一致。
2. `python3 scripts/verify-template.py scenes.html --times 2 8 15` 在每个场景中间抽帧，小于 50KB 的帧报疑似空白。
3. 仓库自带 lint：`npm run lint:html` 会报出 seekTo 场景里的定时器、无限动画和外链资源。
4. 空白帧通常 < 50KB；帧序列必须连续（capture-template.py 有失败帧会以退出码 1 结束）。

需要鼠标、滚动、实时播放的效果只放在预览页，用 `scripts/interactive-animation.js`（GMLive），不进出片场景。
