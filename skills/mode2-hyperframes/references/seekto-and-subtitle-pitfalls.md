# seekTo 截帧 & 字幕适配 Pitfalls

## 1. seekTo + GSAP 动画冲突（截帧空白的头号原因）

截帧脚本每帧等 80ms 就切下一帧，但 gsap.to 的异步动画（0.4s 淡出、0.5s 淡入）还没播完。结果：截到的是动画中间态或空白画面。

**铁律**：showScene 函数必须区分普通播放和 seekTo 模式。seekTo 时用 `gsap.set()` 瞬间切换 opacity，跳过所有动画过渡。

参考 L06 修复（2026-06-06）：
```js
var currentSeekTime=0;
function seekTo(seconds){
  isSeeking=true; currentSeekTime=seconds;
  let target=0;
  for(let i=0;i<sceneBounds.length;i++){
    if(seconds>=sceneBounds[i].start&&seconds<sceneBounds[i].end){target=i;break;}
    if(i===sceneBounds.length-1) target=i;
  }
  showScene(target, true); // instant=true
}
function showScene(idx, instant){
  // hide all instantly
  document.querySelectorAll('.scene').forEach((s,i)=>{
    if(i!==idx){ s.style.display='none'; s.style.opacity='0'; }
  });
  const scene=document.getElementById('s'+idx);
  scene.style.display='flex';
  if(instant){ gsap.set(scene,{opacity:1}); }
  else { gsap.fromTo(scene,{opacity:0},{opacity:1,duration:0.5}); }
  // subtitle
  const sub = subtitles.find(s => currentSeekTime >= s.start && currentSeekTime < s.end);
  subtitleEl.textContent=sub?sub.text:'';
  if(instant){ gsap.set(subtitleEl,{opacity:1}); }
  else { gsap.fromTo(subtitleEl,{opacity:0},{opacity:1,duration:0.5,delay:0.3}); }
}
```

## 2. 字幕 CSS 竖屏适配

9:16 竖屏 1080px 宽，字幕绝不能用 `white-space:nowrap`，否则长句溢出画面。

**标准写法**（对齐 L07）：
```css
.subtitle{position:absolute;bottom:120px;left:60px;right:60px;text-align:center;
  font-size:52px;font-weight:500;color:#fff;line-height:1.5;
  background:rgba(0,0,0,0.75);backdrop-filter:blur(16px);
  border:1px solid rgba(255,255,255,0.1);border-radius:20px;
  padding:16px 36px;max-width:960px;margin:0 auto;z-index:100;
  opacity:0;transition:opacity 0.3s}
```

关键点：
- `left:60px;right:60px` 限宽，不要用 `left:50%;transform:translateX(-50%)`
- `max-width:960px` 兜底
- 去掉 `white-space:nowrap`，允许自动换行
- `line-height:1.5` 保证多行可读

## 3. 字幕文本长度（User 铁律）

**每条字幕最多 1-2 句、15-25 字**。禁止把整段口播稿塞进一条 subtitle 条目。

User 原话："我让你一句或者两句直接显示，你直接给我全堆在上面铺满半个屏幕什么意思"

分段规则：
- 按语义断句，每条独立可读
- 时间区间对应语音节奏（短句 3-5s，长句 5-8s）
- 一条字幕只传达一个信息点
- 总条数会比原来多，但每条短小精悍
