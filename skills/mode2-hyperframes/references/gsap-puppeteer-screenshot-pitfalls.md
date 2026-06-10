# GSAP + Puppeteer 逐帧截取踩坑

> 2026-06-07 从 AI上大学 第1课视频生产中总结

## 1. WSL 上 Puppeteer TMPDIR 问题

puppeteer-core 在 WSL 下 `mkdtemp` 会尝试 Windows 路径（`C:\Users\...\AppData\Local\Temp`），导致 ENOENT 错误。

**Fix**: 运行 node 时设置 `TMPDIR=/tmp`：
```bash
cd /tmp && TMPDIR=/tmp NODE_PATH=/tmp/node_modules node -e "
const puppeteer = require('puppeteer-core');
// ...
"
```

注意：`cd /tmp` 必须在 `TMPDIR=/tmp` 之前，因为 puppeteer 的 `mkdtemp` 用的是进程 cwd。

## 2. NODE_PATH 设置

puppeteer-core 如果装在 `/tmp/node_modules/`（而非全局），需要 `NODE_PATH=/tmp/node_modules`：
```bash
TMPDIR=/tmp NODE_PATH=/tmp/node_modules node capture.js
```

## 3. Chromium 路径

WSL 上 snap 安装的 chromium：
```js
executablePath: '/snap/bin/chromium'
args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
```

## 4. GSAP 时间线从 paused 开始 → 截图空白

**症状**: 截出来的 PNG 全白/全灰，但页面 DOM 里有内容。

**原因**: GSAP timeline 创建时 `paused: true`，需要 JS 触发 `tl.play()`。Puppeteer 截图时如果没触发，所有元素的 opacity/transform 都是初始值（通常 0）。

**Fix 方案**:
1. 在 HTML 里用 `setTimeout(() => tl.play(), 500)` 自动播放
2. 或在 Puppeteer 里 evaluate：`await page.evaluate(() => tl.play())`
3. 截图前等待足够时间让动画执行完

```js
await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 3000)); // 等动画触发
await page.screenshot({ path: 'frame.png' });
```

## 5. 字体 @font-face 路径问题

场景 HTML 引用 `url('~/Fonts/NotoSansCJK-Regular.ttc')`，通过 HTTP server serve 时需要确保该路径可访问。

**Fix**: 在 scenes/ 目录下创建符号链接：
```bash
mkdir -p scenes~/Fonts/
ln -sf /tmp/NotoSansCJK-Regular.ttc scenes~/Fonts/
ln -sf /tmp/NotoSansCJK-Bold.ttc scenes~/Fonts/
```

同时启动 HTTP server 时必须在 scenes/ 目录：
```bash
cd /path/to/scenes && python3 -m http.server 8765
```

## 6. 检查 GSAP 是否加载成功

截帧前检查 CDN 脚本是否加载：
```js
const hasGsap = await page.evaluate(() => typeof gsap !== 'undefined');
console.log('GSAP loaded:', hasGsap);
```

如果 CDN 不可达（内网/防火墙），需要本地化 GSAP：
```bash
curl -o gsap.min.js https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js
# HTML 里改为 <script src="gsap.min.js"></script>
```

## 7. 截帧验证流程

截帧后必须用 vision_analyze 检查至少 3 个关键帧：
1. 第一帧（开场）
2. 中间帧（动画高潮）
3. 最后一帧（结束）

空白帧 = 动画未触发或字体未加载，不要直接合成视频。

## 8. 动画帧率

推荐 15fps（平衡质量和文件大小）。
- 192.5s × 15fps = 2888 帧
- 每帧 ~5KB PNG → ~14MB 总帧数据
- FFmpeg 合成后 ~4MB MP4 (CRF 23)
