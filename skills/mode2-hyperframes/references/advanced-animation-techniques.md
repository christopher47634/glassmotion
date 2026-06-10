# 高级动画技巧（基于GSAP与专业动效设计原则）

## 核心理念

参考 awwwards.com、Stripe.com、Linear.app 等顶级网站，动画应该：
- **有目的**：引导视线，不是装饰
- **有层次**：多属性组合（位移+缩放+模糊+透明度）
- **有节奏**：交错入场，呼吸感
- **有缓动**：选择适合的缓动曲线，不是默认ease

## 一、缓动曲线选择（参考 easings.net）

### 1.1 常用缓动函数

```css
/* 弹性入场（适合容器、卡片） */
cubic-bezier(0.34, 1.56, 0.64, 1)

/* 平滑入场（适合文字、图标） */
cubic-bezier(0.25, 1, 0.5, 1)

/* 强调入场（适合按钮、CTA） */
cubic-bezier(0.68, -0.6, 0.32, 1.6)

/* 自然出场（适合淡出） */
cubic-bezier(0.55, 0, 0.1, 1)
```

### 1.2 GSAP缓动函数

```javascript
// GSAP内置缓动
gsap.to(element, {
  y: 0,
  opacity: 1,
  duration: 0.8,
  ease: "back.out(1.7)"  // 弹性
});

// 其他常用
ease: "power3.out"      // 平滑
ease: "elastic.out(1, 0.3)" // 弹性
ease: "bounce.out"      // 弹跳
```

## 二、多层动画组合（参考 Stripe.com）

### 2.1 容器入场组合

```css
/* 位移+缩放+模糊+透明度 */
.container {
  opacity: 0;
  transform: translateY(40px) scale(0.95);
  filter: blur(10px);
  transition: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.container.show {
  opacity: 1;
  transform: translateY(0) scale(1);
  filter: blur(0);
}
```

### 2.2 GSAP版本

```javascript
gsap.fromTo('.container', 
  { opacity: 0, y: 40, scale: 0.95, filter: 'blur(10px)' },
  { 
    opacity: 1, y: 0, scale: 1, filter: 'blur(0)',
    duration: 0.7,
    ease: "back.out(1.7)"
  }
);
```

## 三、交错入场（Stagger）高级技巧

### 3.1 基础交错

```javascript
// 子元素交错入场
gsap.fromTo('.item', 
  { opacity: 0, y: 30 },
  { 
    opacity: 1, y: 0,
    duration: 0.5,
    stagger: 0.1,  // 每个元素延迟0.1s
    ease: "power2.out"
  }
);
```

### 3.2 高级交错（从中心扩散）

```javascript
gsap.fromTo('.item', 
  { opacity: 0, scale: 0.8 },
  { 
    opacity: 1, scale: 1,
    duration: 0.4,
    stagger: {
      amount: 0.8,  // 总时长
      from: "center",  // 从中心开始
      grid: "auto",
      ease: "power2.inOut"
    },
    ease: "back.out(1.7)"
  }
);
```

## 四、时间线序列（参考 Linear.app）

### 4.1 基础时间线

```javascript
const tl = gsap.timeline();

tl.fromTo('.header', 
  { opacity: 0, y: -20 },
  { opacity: 1, y: 0, duration: 0.5 }
)
.fromTo('.content', 
  { opacity: 0, x: -30 },
  { opacity: 1, x: 0, duration: 0.6 },
  "-=0.3"  // 重叠0.3s
)
.fromTo('.footer', 
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.4 },
  "-=0.2"
);
```

### 4.2 复杂序列（多阶段）

```javascript
const tl = gsap.timeline();

// 阶段1：容器入场
tl.fromTo('.terminal', 
  { opacity: 0, y: 50, scale: 0.95 },
  { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.7)" }
);

// 阶段2：子元素交错
tl.fromTo('.terminal-line', 
  { opacity: 0, x: -20 },
  { 
    opacity: 1, x: 0,
    duration: 0.3,
    stagger: 0.15,
    ease: "power2.out"
  },
  "-=0.4"  // 容器动画还剩0.4s时开始
);

// 阶段3：装饰元素
tl.fromTo('.terminal-dot', 
  { opacity: 0, scale: 0 },
  { 
    opacity: 1, scale: 1,
    duration: 0.2,
    stagger: 0.05,
    ease: "back.out(2)"
  },
  "-=0.6"
);
```

## 五、模糊与光晕效果（参考 Vercel.com）

### 5.1 动态模糊入场

```css
.element {
  opacity: 0;
  transform: translateY(20px);
  filter: blur(8px);
  transition: all 0.6s cubic-bezier(0.25, 1, 0.5, 1);
}

.element.show {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}
```

### 5.2 光晕脉冲

```css
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 20px rgba(8,145,178,0.2); }
  50% { box-shadow: 0 0 40px rgba(8,145,178,0.4); }
}

.element.show {
  animation: glow-pulse 2s ease-in-out infinite;
}
```

## 六、文字动画技巧（参考 awwwards.com）

### 6.1 逐字出现

```javascript
function animateText(element, text, delay = 0) {
  element.textContent = '';
  const chars = text.split('');
  chars.forEach((char, i) => {
    setTimeout(() => {
      element.textContent += char;
    }, delay + i * 50);
  });
}
```

### 6.2 文字遮罩动画

```css
.text-mask {
  position: relative;
  overflow: hidden;
}

.text-mask::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, #000, transparent);
  animation: text-reveal 1.5s ease-in-out;
}

@keyframes text-reveal {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

## 七、与seekTo兼容的GSAP实现

### 7.1 instant模式支持

```javascript
function showScene(idx, instant = false) {
  const scene = document.getElementById('s' + idx);
  if (!scene) return;
  
  if (instant) {
    // 瞬间切换，用于截帧
    gsap.set(scene, { opacity: 1 });
    gsap.set(scene.querySelectorAll('.animatable'), { 
      opacity: 1, 
      x: 0, 
      y: 0, 
      scale: 1,
      filter: 'blur(0)'
    });
  } else {
    // 正常动画
    const tl = gsap.timeline();
    tl.fromTo(scene, 
      { opacity: 0 },
      { opacity: 1, duration: 0.5 }
    );
    
    tl.fromTo(scene.querySelectorAll('.animatable'), 
      { opacity: 0, y: 30, scale: 0.95, filter: 'blur(5px)' },
      { 
        opacity: 1, y: 0, scale: 1, filter: 'blur(0)',
        duration: 0.6,
        stagger: 0.1,
        ease: "back.out(1.7)"
      },
      "-=0.3"
    );
  }
}
```

### 7.2 时间驱动兼容

```javascript
// 结合时间驱动和GSAP
function animateWithTime(elapsed) {
  document.querySelectorAll('.step').forEach(el => {
    const delay = parseFloat(el.dataset.delay);
    if (elapsed >= delay && !el.classList.contains('animated')) {
      el.classList.add('animated');
      gsap.fromTo(el,
        { opacity: 0, y: 20, scale: 0.95 },
        { 
          opacity: 1, y: 0, scale: 1,
          duration: 0.5,
          ease: "back.out(1.7)"
        }
      );
    }
  });
}
```

## 八、性能优化

### 8.1 使用transform和opacity

```javascript
// 好：使用transform和opacity（GPU加速）
gsap.to(element, { x: 100, opacity: 0.5, duration: 0.5 });

// 差：使用left/top（触发重排）
gsap.to(element, { left: 100, opacity: 0.5, duration: 0.5 });
```

### 8.2 will-change提示

```css
.animated-element {
  will-change: transform, opacity;
}
```

## 九、实际应用示例

### 9.1 终端窗口入场

```javascript
const terminalTl = gsap.timeline();

// 容器入场
terminalTl.fromTo('.terminal',
  { opacity: 0, y: 50, scale: 0.95, filter: 'blur(10px)' },
  { opacity: 1, y: 0, scale: 1, filter: 'blur(0)', duration: 0.7, ease: "back.out(1.7)" }
);

// 标题栏
terminalTl.fromTo('.terminal-header',
  { opacity: 0, y: -10 },
  { opacity: 1, y: 0, duration: 0.3 },
  "-=0.5"
);

// 终端行交错
terminalTl.fromTo('.terminal-line',
  { opacity: 0, x: -20 },
  { opacity: 1, x: 0, duration: 0.2, stagger: 0.1, ease: "power2.out" },
  "-=0.4"
);

// 圆点弹性出现
terminalTl.fromTo('.terminal-dot',
  { opacity: 0, scale: 0 },
  { opacity: 1, scale: 1, duration: 0.15, stagger: 0.05, ease: "back.out(2)" },
  "-=0.6"
);
```

### 9.2 数据卡片入场

```javascript
const cardTl = gsap.timeline();

// 卡片容器
cardTl.fromTo('.metric-card',
  { opacity: 0, y: 30, scale: 0.9, filter: 'blur(5px)' },
  { opacity: 1, y: 0, scale: 1, filter: 'blur(0)', duration: 0.5, ease: "back.out(1.7)" }
);

// 数字滚动
cardTl.fromTo('.metric-value',
  { opacity: 0, scale: 0.5 },
  { opacity: 1, scale: 1, duration: 0.3, ease: "elastic.out(1, 0.3)" },
  "-=0.3"
);

// 进度条填充
cardTl.fromTo('.metric-bar-fill',
  { width: '0%' },
  { width: '100%', duration: 1, ease: "power2.out" },
  "-=0.2"
);
```

## 十、检查清单

- [ ] 缓动曲线选择合适（不是默认ease）
- [ ] 动画有多层组合（位移+缩放+模糊）
- [ ] 元素交错入场（不是同时出现）
- [ ] 有呼吸感（动画间有空白）
- [ ] 与seekTo兼容（支持instant模式）
- [ ] 性能优化（使用transform/opacity）
- [ ] 视觉层次分明（主次分明）

## 十一、专业网站动效设计原则

### 11.1 Stripe.com 设计原则

**核心理念**：渐变+微动画，暗色极简

**设计特点**：
1. **网格渐变**：cyan #50e3c2, blue #007cf0, pink #ff0080, amber #f9cb28 融合
2. **单墨色主色**：#171717 用于所有CTA，不使用品牌蓝或次要强调色
3. **堆叠阴影**：4-12%黑色不透明度分层，每张卡片有内嵌发丝环
4. **两种药丸比例**：100px营销CTA和6px导航按钮，不混用

**动画应用**：
```javascript
// Stripe风格的卡片入场
gsap.fromTo('.card', 
  { 
    opacity: 0, 
    y: 30, 
    scale: 0.95,
    boxShadow: '0 4px 12px rgba(0,0,0,0.04)'
  },
  { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
    duration: 0.7,
    ease: "back.out(1.7)",
    stagger: 0.1
  }
);
```

### 11.2 Linear.app 设计原则

**核心理念**：过渡动画干净利落，物理弹簧动画

**设计特点**：
1. **物理缓动**：使用spring、elastic等物理缓动函数
2. **性能优先**：动画不能太慢，影响用户体验
3. **状态转换**：平滑的状态切换动画
4. **微交互**：鼠标悬停、点击等微交互反馈

**动画应用**：
```javascript
// Linear风格的弹簧动画
gsap.fromTo('.element', 
  { opacity: 0, y: 20 },
  { 
    opacity: 1, 
    y: 0,
    duration: 0.6,
    ease: "elastic.out(1, 0.3)"  // 物理弹簧缓动
  }
);

// Linear风格的微交互
element.addEventListener('mouseenter', () => {
  gsap.to(element, { 
    scale: 1.02, 
    duration: 0.2,
    ease: "power2.out"
  });
});

element.addEventListener('mouseleave', () => {
  gsap.to(element, { 
    scale: 1, 
    duration: 0.3,
    ease: "elastic.out(1, 0.3)"
  });
});
```

### 11.3 Vercel.com 设计原则

**核心理念**：暗色主题，动效克制

**设计特点**：
1. **单墨色系统**：#171717 作为主色，200-step灰色刻度
2. **Geist字体**：显示上限权重600，-2.4px字间距
3. **网格渐变**：仅用于hero规模，不滥用
4. **堆叠阴影**：4-12%黑色不透明度分层

**动画应用**：
```javascript
// Vercel风格的入场动画
gsap.fromTo('.hero', 
  { 
    opacity: 0, 
    y: 40,
    filter: 'blur(10px)'
  },
  { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0)',
    duration: 0.8,
    ease: "power3.out"
  }
);

// Vercel风格的卡片悬停
.card {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
}
```

### 11.4 Raycast.com 设计原则

**核心理念**：精确、快速、刻意的暗UI

**设计特点**：
1. **精确动画**：每个动画都有明确目的
2. **快速响应**：动画时长短，响应迅速
3. **暗色物理**：暗UI操作在完全不同的物理规则下
4. **微交互堆栈**：缓动、弹簧、物理模拟组合使用

**动画应用**：
```javascript
// Raycast风格的快速动画
gsap.fromTo('.menu-item', 
  { opacity: 0, x: -10 },
  { 
    opacity: 1, 
    x: 0,
    duration: 0.15,  // 非常短的动画
    ease: "power2.out"
  }
);

// Raycast风格的微交互堆栈
const microTransition = {
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  duration: "150ms",
  properties: "transform, opacity"
};
```

## 十二、高级动画模式

### 12.1 滚动触发动画

```javascript
// 使用GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

gsap.fromTo('.section', 
  { opacity: 0, y: 50 },
  {
    opacity: 1,
    y: 0,
    duration: 1,
    ease: "power3.out",
    scrollTrigger: {
      trigger: '.section',
      start: "top 80%",
      end: "bottom 20%",
      scrub: false
    }
  }
);
```

### 12.2 鼠标跟随动画

```javascript
// 鼠标跟随效果
document.addEventListener('mousemove', (e) => {
  const cards = document.querySelectorAll('.card');
  
  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  });
});

// CSS变量支持
.card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: inherit;
  background: radial-gradient(
    300px circle at var(--mouse-x) var(--mouse-y),
    rgba(80, 227, 194, 0.1),
    transparent 60%
  );
  opacity: 0;
  transition: opacity 0.3s;
}

.card:hover::before {
  opacity: 1;
}
```

### 12.3 组合动画序列

```javascript
// 复杂的时间线序列
const masterTimeline = gsap.timeline();

// 阶段1：背景渐变
masterTimeline.fromTo('.background', 
  { opacity: 0 },
  { opacity: 1, duration: 0.5 }
);

// 阶段2：标题入场（重叠0.2s）
masterTimeline.fromTo('.title', 
  { opacity: 0, y: 30, filter: 'blur(5px)' },
  { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0)',
    duration: 0.6,
    ease: "back.out(1.7)"
  },
  "-=0.2"
);

// 阶段3：内容交错入场（重叠0.3s）
masterTimeline.fromTo('.content-item', 
  { opacity: 0, x: -20 },
  { 
    opacity: 1, 
    x: 0,
    duration: 0.4,
    stagger: 0.1,
    ease: "power2.out"
  },
  "-=0.3"
);

// 阶段4：装饰元素（重叠0.4s）
masterTimeline.fromTo('.decoration', 
  { opacity: 0, scale: 0 },
  { 
    opacity: 1, 
    scale: 1,
    duration: 0.3,
    ease: "elastic.out(1, 0.3)"
  },
  "-=0.4"
);
```

## 十三、性能优化最佳实践

### 13.1 GPU加速属性

```javascript
// 好：使用transform和opacity（GPU加速）
gsap.to(element, { 
  x: 100, 
  y: 50, 
  opacity: 0.5,
  duration: 0.5 
});

// 差：使用left/top（触发重排）
gsap.to(element, { 
  left: 100, 
  top: 50, 
  opacity: 0.5,
  duration: 0.5 
});
```

### 13.2 will-change提示

```css
.animated-element {
  will-change: transform, opacity;
}

/* 动画完成后移除 */
.animated-element.animated {
  will-change: auto;
}
```

### 13.3 避免布局抖动

```javascript
// 好：批量读取布局信息
const elements = document.querySelectorAll('.item');
const rects = elements.map(el => el.getBoundingClientRect());

// 然后批量应用动画
elements.forEach((el, i) => {
  gsap.fromTo(el, 
    { opacity: 0, y: rects[i].height },
    { opacity: 1, y: 0, duration: 0.5 }
  );
});
```

## 十四、实际应用示例（综合）

### 14.1 专业着陆页动画

```javascript
// 1. 头部导航入场
const headerTl = gsap.timeline();
headerTl.fromTo('.header', 
  { opacity: 0, y: -20 },
  { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
);

// 2. 英雄区域入场
const heroTl = gsap.timeline({ delay: 0.3 });
heroTl.fromTo('.hero-badge', 
  { opacity: 0, y: 20, scale: 0.9 },
  { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
);

heroTl.fromTo('.hero-title', 
  { opacity: 0, y: 30, filter: 'blur(5px)' },
  { 
    opacity: 1, 
    y: 0, 
    filter: 'blur(0)',
    duration: 0.6,
    ease: "back.out(1.7)"
  },
  "-=0.2"
);

heroTl.fromTo('.hero-subtitle', 
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
  "-=0.3"
);

heroTl.fromTo('.cta-group', 
  { opacity: 0, y: 20 },
  { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" },
  "-=0.2"
);

// 3. 特性卡片交错入场
const featuresTl = gsap.timeline({ 
  scrollTrigger: {
    trigger: '.features',
    start: "top 80%"
  }
});

featuresTl.fromTo('.feature-card', 
  { opacity: 0, y: 40, scale: 0.95, filter: 'blur(5px)' },
  { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    filter: 'blur(0)',
    duration: 0.6,
    stagger: 0.15,
    ease: "back.out(1.7)"
  }
);

// 4. 统计数据滚动触发
const statsTl = gsap.timeline({
  scrollTrigger: {
    trigger: '.stats',
    start: "top 70%"
  }
});

statsTl.fromTo('.stat-item', 
  { opacity: 0, y: 30 },
  { 
    opacity: 1, 
    y: 0,
    duration: 0.5,
    stagger: 0.1,
    ease: "power2.out"
  }
);
```

## 十五、检查清单（更新版）

- [ ] 缓动曲线选择合适（参考专业网站）
- [ ] 动画有多层组合（位移+缩放+模糊+透明度）
- [ ] 元素交错入场（不是同时出现）
- [ ] 有呼吸感（动画间有空白）
- [ ] 与seekTo兼容（支持instant模式）
- [ ] 性能优化（使用transform/opacity）
- [ ] 视觉层次分明（主次分明）
- [ ] 响应式设计（适配不同屏幕）
- [ ] 物理缓动（弹簧、弹性等）
- [ ] 微交互反馈（悬停、点击等）
- [ ] 滚动触发动画（视口进入时触发）
- [ ] 加载状态动画（加载中、加载完成）
- [ ] 错误状态动画（错误提示、重试）
- [ ] 成功状态动画（完成确认、庆祝）