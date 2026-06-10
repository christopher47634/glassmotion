# GSAP动画与截帧冲突（关键pitfall）

## 问题

截帧脚本每帧只等80ms就调seekTo切场景，但showScene里的gsap.to/gsap.fromTo动画需要400-500ms。结果：截到的画面是动画中途的空白帧。

## 修复模式

seekTo/showScene必须支持instant模式：

- showScene增加`instant`参数：instant=true时用`gsap.set()`瞬间切换，跳过所有动画过渡
- seekTo传`instant=true`给showScene
- 非instant模式（正常播放）保留原有淡入淡出动画
- subtitle也需要instant模式处理（用gsap.set替代gsap.fromTo）

## 示例代码

```javascript
function showScene(idx, instant){
  if(idx===currentScene&&!isSeeking) return;
  currentScene=idx;
  isSeeking=false;
  document.querySelectorAll('.scene').forEach((s,i)=>{
    if(i!==idx){ s.style.display='none'; s.style.opacity='0'; }
  });
  const scene=document.getElementById('s'+idx);
  if(!scene) return;
  scene.style.display='flex';
  if(instant){ gsap.set(scene,{opacity:1}); }
  else { gsap.fromTo(scene,{opacity:0},{opacity:1,duration:0.5}); }
  if(!instant) animateScene(idx);
}

function seekTo(seconds){
  isSeeking=true;
  // ...find target scene index...
  showScene(target, true);  // instant=true
}
```

## 自检

截帧后检查frame_00000.png文件大小——空白帧通常<50KB，正常帧>200KB。

## 补充：CSS transition也会导致同样问题

注意：即使不用gsap.to()，如果CSS有 `.scene{transition:opacity .4s}`，用classList切换.active同样会截到半透明帧（L09教训）。修复：seeking时设inline `style.opacity`覆盖CSS transition。详见 `capture-and-subtitle-pitfalls.md` 第2节。
