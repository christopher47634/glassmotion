# seekTo/showScene Instant 模式踩坑记录

## 问题

`capture.js` 每帧间隔仅 200ms。如果 `showScene()` 用 GSAP 异步动画（`gsap.to({opacity:0, duration:0.4})`）做淡出，截帧时动画还没完成就切到下一帧，导致：
- 画面完全空白（所有 scene 都处于 opacity:0 的过渡中）
- 上一场景残留（淡出动画未完成）

## 根因

```
// 错误写法 — 异步动画，200ms 内完不成
document.querySelectorAll('.scene').forEach((s,i)=>{
  if(i!==idx) gsap.to(s, {opacity:0, duration:0.4, onComplete:()=>s.style.display='none'});
});
gsap.fromTo(scene, {opacity:0}, {opacity:1, duration:0.5});
```

`capture.js` 调用 `seekTo(seconds)` → `showScene(target)` 时，hide 动画 400ms、show 动画 500ms，但截帧脚本只等 200ms 就截图了。

## 正确写法

`showScene(idx, instant)` 接受 instant 参数：

```javascript
function showScene(idx, instant){
  if(idx===currentScene&&!isSeeking) return;
  currentScene=idx;
  isSeeking=false;

  // 直接隐藏所有 scene（不用动画）
  document.querySelectorAll('.scene').forEach((s,i)=>{
    if(i!==idx){ s.style.display='none'; s.style.opacity='0'; }
  });

  const scene=document.getElementById('s'+idx);
  if(!scene) return;
  scene.style.display='flex';

  if(instant){
    gsap.set(scene, {opacity:1});  // 即时，无动画
  } else {
    gsap.fromTo(scene, {opacity:0}, {opacity:1, duration:0.5});
  }

  // 字幕：从 subtitles 数组按当前时间匹配（不要用 index 对应）
  if(instant){
    const sub = subtitles.find(s => currentSeekTime >= s.start && currentSeekTime < s.end);
    subtitleEl.textContent = sub ? sub.text : '';
    gsap.set(subtitleEl, {opacity:1});
  } else {
    subtitleEl.textContent = subtitles[idx] || '';
    gsap.fromTo(subtitleEl, {opacity:0}, {opacity:1, duration:0.5, delay:0.3});
  }

  if(!instant) animateScene(idx);
}
```

`seekTo` 需要记录当前秒数供字幕匹配：

```javascript
var currentSeekTime = 0;
function seekTo(seconds){
  isSeeking=true;
  currentSeekTime=seconds;
  let target=0;
  for(let i=0;i<sceneBounds.length;i++){
    if(seconds>=sceneBounds[i].start&&seconds<sceneBounds[i].end){target=i;break;}
    if(i===sceneBounds.length-1) target=i;
  }
  showScene(target, true);  // instant=true
}
```

## 关键规则

1. **所有新建 lesson HTML 必须用 instant 模式的 showScene**，不要用 gsap.to 做 hide。
2. hide 用 `s.style.display='none'; s.style.opacity='0'` 直切，不用 GSAP 动画。
3. 字幕匹配用 `currentSeekTime` + `subtitles.find()` 而非 index 对应（VTT 字幕分段和 scene 分段不一定一一对应）。
4. 播放模式（非截帧）保留淡入动画：`gsap.fromTo`。
5. `animateScene(idx)` 只在非 instant 模式下调用（截帧不需要入场动画）。

## 调试技巧

如果截帧后画面空白：
1. Playwright 中手动调用 `seekTo(0)` + `page.screenshot()` 检查
2. 检查 `document.querySelectorAll('.scene')` 的 `style.display` 和 `style.opacity`
3. 确认没有 GSAP warning（"target not found" 表示 CSS 选择器和 HTML 不匹配）
