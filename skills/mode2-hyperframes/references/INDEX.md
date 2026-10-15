# Mode2 参考文件索引

按主题分组，按需加载。本目录每个文件都必须登记在这里（`npm test` 会检查）。

---

## seekTo 与时间驱动（出片必读）
- references/seekto-runtime.md — seekTo 运行时规范：t 的纯函数、禁用清单、标准写法、自检（唯一标准）
- references/time-driven-animation.md — data-delay 时间驱动的元素编排示例

## 动画与交互
- references/animation-components.md — 基础动画组件（stagger、渐进高亮、计数器、打字机）
- references/animation-inspiration.md — 动画灵感与提升（参考网站、缓动选择、多层组合、stagger 编排）
- references/advanced-animation-techniques.md — 高级动画（缓动、模糊、时间线序列）
- references/animation-timeline-sync.md — 动画与语音时间线同步
- references/background-effects-dark.md — 深色三层背景（光球 + 粒子 + 扫描线）
- references/virtual-recording-engine.md — 虚拟录屏引擎（终端、编辑器、聊天模拟）

## 设计与布局
- references/html-components-library.md — HTML 组件库（终端、代码编辑器、聊天、数据卡片）
- references/components-quickref.md — 组件速查表
- references/intro-card-and-layout.md — Intro Title Card 与布局规范
- references/cross-theme-animation-adaptation.md — 深色 / 浅色主题切换
- references/dark-to-light-mapping.md — 深色 → 浅色映射
- references/glass-morphism-quality-upgrade.md — 玻璃态质感

## 配音、字幕与音频
- references/minimax-tts-api.md — MiniMax T2A API（可选付费 TTS）
- references/subtitle-integration.md — 字幕集成流程（ASS 生成、碎切）
- references/whisper-subtitle-alignment.md — Whisper 词级对齐
- references/vtt-verification-with-whisper.md — VTT 验证与 Whisper 转录
- references/subtitle-audio-mismatch-diagnosis.md — 字幕 / 音频不匹配诊断
- references/sfx-bgm-workflow.md — 音效、BGM 校准与混音

## 截帧与渲染
- references/capture-and-subtitle-pitfalls.md — 截帧踩坑与字幕陷阱
- references/wsl-rendering-pitfalls.md — WSL 渲染与合成踩坑（Playwright、TMPDIR、中文路径、字体）
- references/playwright-wsl-pitfalls.md — Playwright + WSL 兼容性问题
- references/font-rendering-pitfalls.md — 字体渲染问题
- references/ffmpeg-expression-pitfalls.md — FFmpeg 表达式踩坑
- references/fallback-pipeline.md — FFmpeg drawtext 兜底方案（最低优先级）

## 流程与规范
- references/per-scene-workflow.md — 逐场景从零设计流程
- references/quality-checklist.md — 质量检查清单（含审美审核）
- references/sub-agent-verification.md — Sub-agent 报告验证（防假报告）
- references/trending-ai-news-explainer.md — 热点 AI 科普：调研 → 分镜 → 生产
- references/script-humorization-and-hooks.md — 脚本幽默化改写、Hook 策略

## 脚本与模板
- scripts/seek-animation.js — GMSeek 逐帧动画库（t 的纯函数，可出片）
- scripts/interactive-animation.js — GMLive 交互 / 实时动画（仅预览页，不能出片）
- scripts/capture-template.py — Playwright 逐帧截图，失败帧以退出码 1 结束
- scripts/verify-template.py — 指定时间点抽帧，检查疑似空白帧
- scripts/capture_common.py — 截帧脚本共用（浏览器启动、VTT 解析）
- scripts/nvenc-template.sh — 帧序列 + 音频编码 MP4（NVENC / libx264）
- scripts/scan-emoji.py — 扫描场景里的 emoji
- templates/starter.html — 竖屏场景起手模板
- demo/animation-demo.html — 交互动效演示页（用 GMLive，仅浏览器预览）
