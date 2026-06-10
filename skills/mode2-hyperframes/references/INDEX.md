# Mode2 参考文件索引

按主题分组，按需加载。

---

## 动画与交互
- references/animation-components.md — 基础动画组件（stagger、渐进高亮、计数器、打字机）
- references/animation-inspiration.md — 动画灵感与提升（参考网站、缓动选择、多层组合、stagger编排）
- references/advanced-animation-techniques.md — GSAP 高级动画（缓动、模糊、时间线序列）
- references/phase-based-animation.md — Phase 动画架构（状态机驱动复杂场景切换）
- references/time-driven-animation.md — elapsed + data-delay 时间驱动机制
- references/seekTo-time-driven-animation.md — seekTo 与时间驱动的协作
- references/background-effects-dark.md — 深色三层背景（光球+粒子+扫描线）
- references/gsap-capture-pitfall.md — seekTo + GSAP 截帧冲突与解决
- references/seekto-flash-fix.md — seekTo 闪烁问题（isSeeking 模式）
- references/seekto-instant-switch.md — seekTo 场景瞬间切换
- scripts/animation-library.js — 可复用 GSAP 动画函数库

## 字幕与音频
- references/subtitle-integration.md — 字幕集成流程
- references/subtitle-sync-pitfalls.md — 字幕同步陷阱（三处联动）
- references/subtitle-audio-mismatch-diagnosis.md — 字幕/音频不匹配诊断
- references/vtt-verification-with-whisper.md — VTT 验证与 Whisper 转录
- references/sfx-bgm-workflow.md — 完整音效与混音工作流

## 截帧与渲染
- references/capture-and-subtitle-pitfalls.md — 截帧踩坑与字幕陷阱
- references/playwright-wsl-pitfalls.md — Playwright WSL 兼容性问题
- references/ffmpeg-expression-pitfalls.md — FFmpeg 表达式踩坑
- references/font-rendering-pitfalls.md — 字体渲染问题

## 设计与布局
- references/html-components-library.md — HTML 组件库（终端、代码编辑器、聊天、数据卡片）
- references/components-quickref.md — 组件速查表
- references/intro-card-and-layout.md — Intro Title Card 与布局规范
- references/cross-theme-animation-adaptation.md — 深色/浅色主题切换
- references/dark-to-light-mapping.md — 深色→浅色映射
- references/glass-morphism-quality-upgrade.md — 玻璃态质感

## 流程与规范
- references/per-scene-workflow.md — 逐场景从零设计流程
- references/quality-checklist.md — 质量检查清单（9步流程，含审美审核）
- references/sub-agent-verification.md — Sub-agent 报告验证（防假报告）

## 脚本与内容策略
- references/script-humorization-and-hooks.md — 脚本幽默化改写、Hook策略、可爱化动效规范

## 虚拟录屏
- references/virtual-recording-engine.md — 虚拟录屏引擎（终端、编辑器、聊天模拟）

## 批量流程（已废弃）
- references/batch-course-pipeline.md — 技术参考（BGM校准、NVENC参数仍有效）
- references/batch-lesson-automation.md
- references/batch-pipeline-pitfalls.md
- references/batch-production-pipeline.md
- references/multi-lesson-production.md
- references/automated-pipeline.md
- references/fallback-pipeline.md — FFmpeg drawtext fallback

## 脚本
- scripts/capture-template.py — 截帧模板
- scripts/verify-template.py — 验证模板
- scripts/capture-generic.py — 通用截帧
- scripts/capture-batch.py — 批量截帧
- scripts/gen-l07-l10-html.py — HTML 生成器
- scripts/scan-emoji.py — Emoji 扫描
- scripts/nvenc-template.sh — NVENC 编码模板
- scripts/animation-library.js — GSAP 动画函数库
- demo/animation-demo.html — 专业动效设计演示页面
