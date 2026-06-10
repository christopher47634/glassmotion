# 背景动效（深色主题）

## 纯静态网格不够，需要 3 层动效叠加

### 层1: 浮动光球 (bg-orb)

3 个大尺寸模糊圆形，用 CSS animation 缓慢漂移：

```html
<div class="bg-orb bg-orb-1"></div>
<div class="bg-orb bg-orb-2"></div>
<div class="bg-orb bg-orb-3"></div>
```

```css
.bg-orb {
  position: fixed; border-radius: 50%; pointer-events: none;
  z-index: 0; filter: blur(80px); opacity: 0.12;
}
.bg-orb-1 {
  width: 500px; height: 500px; background: var(--blue);
  top: -100px; left: -100px;
  animation: orbFloat1 20s ease-in-out infinite;
}
.bg-orb-2 {
  width: 400px; height: 400px; background: var(--purple);
  bottom: -80px; right: -80px;
  animation: orbFloat2 25s ease-in-out infinite;
}
.bg-orb-3 {
  width: 300px; height: 300px; background: var(--cyan);
  top: 50%; left: 50%; transform: translate(-50%, -50%);
  animation: orbFloat3 18s ease-in-out infinite;
}
@keyframes orbFloat1 {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(120px, 80px); }
  66% { transform: translate(-60px, 150px); }
}
@keyframes orbFloat2 {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(-100px, -60px); }
  66% { transform: translate(50px, -120px); }
}
@keyframes orbFloat3 {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50% { transform: translate(-50%, -50%) scale(1.3); }
}
```

### 层2: 上升粒子 (particles)

8 个粒子从底部缓慢上升，透明度渐变：

```html
<div class="particles">
  <div class="particle"></div> <!-- x8 -->
</div>
```

```css
.particles {
  position: fixed; inset: 0; z-index: 0;
  pointer-events: none; overflow: hidden;
}
.particle {
  position: absolute; width: 3px; height: 3px;
  background: var(--blue); border-radius: 50%; opacity: 0;
  animation: particleRise linear infinite;
}
/* 每个粒子不同位置和速度 */
.particle:nth-child(1) { left: 10%; animation-duration: 12s; animation-delay: 0s; }
.particle:nth-child(2) { left: 25%; animation-duration: 15s; animation-delay: 2s; }
.particle:nth-child(3) { left: 40%; animation-duration: 10s; animation-delay: 4s; }
.particle:nth-child(4) { left: 55%; animation-duration: 14s; animation-delay: 1s; }
.particle:nth-child(5) { left: 70%; animation-duration: 11s; animation-delay: 3s; }
.particle:nth-child(6) { left: 85%; animation-duration: 13s; animation-delay: 5s; }
.particle:nth-child(7) { left: 15%; animation-duration: 16s; animation-delay: 6s; }
.particle:nth-child(8) { left: 60%; animation-duration: 9s; animation-delay: 7s; }
@keyframes particleRise {
  0% { transform: translateY(1920px); opacity: 0; }
  10% { opacity: 0.5; }
  90% { opacity: 0.5; }
  100% { transform: translateY(-20px); opacity: 0; }
}
```

### 层3: 扫描线 (scanline)

从上到下缓慢扫过的半透明线条：

```html
<div class="scanline"></div>
```

```css
.scanline {
  position: fixed; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, var(--blue), transparent);
  opacity: 0.15; z-index: 0;
  animation: scanDown 8s linear infinite;
}
@keyframes scanDown {
  0% { top: -2px; }
  100% { top: 1920px; }
}
```

## 半透明卡片

配合背景动效，卡片必须半透明才能看到光球叠透效果：

```css
.scene-header {
  background: rgba(18, 18, 30, 0.85);
  backdrop-filter: blur(10px);
}
.tag-card {
  background: rgba(18, 18, 30, 0.85);
  backdrop-filter: blur(5px);
}
```

## 文件大小影响

加背景动效后文件会增大（光球 blur 渲染开销），编码后通常 7-9MB（之前 3-4MB）。
