# 浅色主题动效映射规范

## 核心原则
- 配色换浅色，动效保留深色风格
- HUD、shimmer扫描、stagger交错入场、glow-pulse呼吸发光全部保留
- 背景从深黑换成米白，surface从深灰换成白色，但结构和动画完全一样

## CSS变量映射

| 变量 | 深色 | 浅色 |
|---|---|---|
| --bg | #0A0A12 | #FBF7F0 |
| --surface | #12121E | #FFFFFF |
| --surface2 | #1A1A2E | #F3EDE4 |
| --text | #E8E8F0 | #1F2937 |
| --text2 | #8888AA | #6B7280 |
| --terminal-bg | #0D1117 | #0D1117（不变） |

强调色（blue/green/red/purple/cyan/orange）全部不变。

## 动效调整

### 卡片阴影
- 深色: `box-shadow: 0 4px 20px rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.06);`
- 浅色: `box-shadow: 0 4px 20px rgba(0,0,0,0.06);` 不需要border

### Shimmer光线扫描
- 深色: `rgba(255,255,255,0.04)`
- 浅色: `rgba(255,255,255,0.08)` 稍强

### Glow-pulse呼吸发光
- 深色: `rgba(77,107,254,0.2)` / `rgba(77,107,254,0.4)`
- 浅色: `rgba(77,107,254,0.15)` / `rgba(77,107,254,0.3)` 稍弱

### 装饰光斑
- 深色: `rgba(77,107,254,0.08)`
- 浅色: `rgba(77,107,254,0.06)` 稍弱

### 字幕条
- 深色: `background: rgba(10,10,18,0.9); border: 1px solid rgba(255,255,255,0.1);`
- 浅色: `background: rgba(255,255,255,0.95); border: 1px solid rgba(0,0,0,0.08); color: var(--text);`

### HUD角框
- 深色: `rgba(77,107,254,0.2)`
- 浅色: `rgba(77,107,254,0.15)` 稍弱

### 背景网格
- 深色: `rgba(77,107,254,0.04)`
- 浅色: `rgba(77,107,254,0.03)` 稍弱

### 终端窗口
终端保持深色（#0D1117），这是视觉锚点，不改。

## Checklist
- [ ] CSS变量换成浅色值
- [ ] 卡片阴影降到0.06
- [ ] 字幕背景换白色半透明
- [ ] 终端保持深色
- [ ] HUD/shimmer/glow/stagger全部保留
- [ ] 渐变色条（scene-header::before）不改
- [ ] 装饰光斑opacity稍降
