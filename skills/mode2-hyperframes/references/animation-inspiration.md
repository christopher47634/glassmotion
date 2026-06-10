# 动画灵感与参考资源

> User 评价当前动画"太单调、幼稚、没有动效"。以下是提升动画质量的参考方向。
> 另见 `script-humorization-and-hooks.md §3` 了解"可爱化"动画方向（适用于学生/教育类内容）。

## 风格选择指南

> **核心原则**：没有绝对"禁止"的缓动，只有不适合当前受众的缓动。

| 受众/场景 | 风格 | 缓动策略 | 详见 |
|-----------|------|----------|------|
| 职场、专业人士 | 高级感/克制型 | power3.out, expo.out, 禁 elastic/bounce | 本文下方 |
| 学生、轻松教育 | 可爱化 | back.out(1.7), elastic.out, 弹性入场 | script-humorization-and-hooks.md §3 |

选错风格比没有动画更致命。面向小学生用克制型=无聊；面向职场用弹性=不专业。

---

## 参考网站（按优先级）

### 高级感/克制型（适合职场/专业内容）
- **stripe.com** — 首页渐变+微动画，暗色极简，动效克制但有力
- **linear.app** — 过渡动画干净利落，不花哨但高级
- **vercel.com** — 暗色主题，动效精准
- **raycast.com** — 动画非常丝滑，缓动曲线选得好

### 灵感集合
- **awwwards.com** — 全球最佳网页设计，动效质量最高
- **codrops.com** — 每周灵感集，偏实验性动画
- **lapa.ninja** — 精选网页设计，按风格分类

### GSAP 专项
- **gsap.com/showcase** — GSAP 官方作品集
- **codepen.io/search/pens?q=gsap** — CodePen 上的 GSAP 作品

### 动效设计学习
- **motion.dev** — 动效设计原则（12 条动画法则）
- **easings.net** — 缓动曲线可视化
- **cubic-bezier.com** — 自定义贝塞尔曲线调试

## User 认为"幼稚"的根本原因

1. **缓动太简单** — 全是 linear 或 ease-in-out，应该多用 `power2.out`, `power3.out`, `back.out(1.7)`, `expo.out`
2. **动画只有一层** — 淡入就完了，没有位移+缩放+模糊的组合。高级动画 = 多属性同时变化
3. **没有延迟编排** — 所有元素同时动，应该错开 0.1-0.3s（stagger）
4. **没有环境动效** — 背景静止=廉价感。必须有光球漂浮、粒子、扫描线等环境层
5. **缓动曲线选错** — 入场用 ease-out（快入慢停），出场用 ease-in（慢入快出），强调用 back.out

## 动画质量提升清单

### 入场动画组合模板
```
普通入场:   opacity 0→1, y 30→0, duration 0.6, ease: power3.out
强调入场:   opacity 0→1, y 50→0, scale 0.95→1, duration 0.8, ease: back.out(1.7)
标题入场:   opacity 0→1, y 40→0, blur(10px)→blur(0), duration 1, ease: expo.out
卡片入场:   opacity 0→1, y 20→0, stagger 0.15, duration 0.5, ease: power2.out
```

### 缓动选择指南
| 场景 | 缓动 | 效果 |
|------|------|------|
| 元素入场 | power3.out / expo.out | 快入慢停，自然 |
| 元素出场 | power2.in | 慢入快出 |
| 强调/弹出 | back.out(1.7) | 微微过冲再回弹 |
| 环境微动 | sine.inOut | 柔和往复 |
| 扫描/滚动 | none (linear) | 匀速 |
| 禁止（克制型） | elastic, bounce | 太花哨，但可爱化风格可用 |

### 多层动画组合（同时进行）
```js
// 差的做法：只有淡入
tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0);

// 好的做法：位移+缩放+模糊+透明度组合
tl.fromTo(el, 
  { opacity: 0, y: 40, scale: 0.96, filter: 'blur(8px)' }, 
  { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }, 
  0.1  // 错开 0.1s
);
```

### 环境动效（背景层，必须有）
- 光球漂浮：`sine.inOut` + `yoyo: true` + 有限 repeat
- 粒子上升：`power1.out` 淡入 + 缓慢漂移
- 扫描线：匀速从上到下
- 微妙呼吸：整体 opacity 在 0.6-0.8 之间缓慢变化

### 延迟编排（stagger）
```js
// 所有子元素错开入场
tl.fromTo('.card', 
  { opacity: 0, y: 20 }, 
  { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: 'power2.out' }, 
  0.3  // 整体延迟 0.3s 开始
);
```
