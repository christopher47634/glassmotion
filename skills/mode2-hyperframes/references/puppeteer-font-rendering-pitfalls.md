# Puppeteer 字体渲染踩坑（WSL）

## 问题：Puppeteer 逐帧截取时中文显示为方块 □□

**症状**：单张 Puppeteer 截图中文正常显示，但逐帧渲染脚本中文字全部变成方块。

**根因**：HTML 的 `@font-face` 引用了绝对路径字体文件（如 `file://~/Fonts/NotoSansCJK-Regular.ttc`），当页面通过 HTTP 服务时，浏览器将字体 URL 解析为 HTTP 请求（如 `http://127.0.0.1:PORT~/Fonts/...`），HTTP 服务器将此路径映射到 `SCENES_DIR~/Fonts/...`——文件不存在，字体加载失败。

## 修复方案：创建符号链接

```bash
# 在 scenes 目录下创建完整的字体路径结构
mkdir -p /path/to/scenes~/Fonts/
ln -sf /tmp/NotoSansCJK-Regular.ttc /path/to/scenes~/Fonts/NotoSansCJK-Regular.ttc
ln -sf /tmp/NotoSansCJK-Bold.ttc /path/to/scenes~/Fonts/NotoSansCJK-Bold.ttc
```

**原理**：HTTP 服务器解析 `url('~/Fonts/NotoSansCJK-Regular.ttc')` 为 `SCENES_DIR + ~/Fonts/NotoSansCJK-Regular.ttc`，符号链接指向 `/tmp/` 下的实际字体文件。

## 字体文件准备

```bash
# 从项目目录复制字体到 /tmp（避免中文路径问题）
cp "~/Desktop/课程/.../NotoSansCJK-Regular.ttc" /tmp/
cp "~/Desktop/课程/.../NotoSansCJK-Bold.ttc" /tmp/
```

## 验证方法

截帧后用 vision_analyze 检查中间帧：
- ✅ "AI 上大学"、"PPT"、"报告" 等中文字符正常显示
- ❌ 全部显示为 □□ 方块 = 字体没加载

## ⚠️ request interception 方案不如 symlink 可靠

Puppeteer 的 `page.setRequestInterception(true)` 可以拦截字体请求并手动返回文件内容，但实测不如 symlink 方案稳定。symlink 方案让 HTTP 服务器直接返回正确文件，不需要额外代码。

## 检查清单

截帧前必须确认：
1. `/tmp/NotoSansCJK-*.ttc` 文件存在且非空（~19-20MB）
2. `scenes~/Fonts/` 符号链接存在且指向正确
3. 第一帧截取后立即用 vision_analyze 验证中文渲染
