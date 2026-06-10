# Playwright + WSL + Snap Chromium Pitfalls

## Pitfall 1: Snap Chromium Cannot Read /tmp (tmpfs)

Snap chromium is sandboxed and **cannot access /tmp** which is a tmpfs mount in WSL.

**Symptom:** `Page.goto: net::ERR_FILE_NOT_FOUND at file:///tmp/...` even though the file exists when checked from the terminal.

**Root cause:** Snap confinement restricts filesystem access. `/tmp` (tmpfs) is outside the snap sandbox.

**Fix:** Place HTML files and frame output in `~/` (home directory), NOT `/tmp`:

```python
# WRONG — snap chromium can't see /tmp
HTML_PATH = '/tmp/myproject/scenes.html'
OUT_DIR = '/tmp/myproject/frames'

# CORRECT — home directory is accessible
HTML_PATH = '~/myproject/scenes.html'
OUT_DIR = '~/myproject/frames'
```

**Workaround if you must use /tmp:** Copy files to home before Playwright capture, then copy results back:
```bash
cp -r /tmp/project ~/project-capture
python3 capture.py  # uses ~/project-capture paths
cp -r ~/project-capture/frames /tmp/project/frames
```

## Pitfall 2: Playwright Tries Windows Temp Directory

Playwright in WSL may try to use `C:\Users\...\AppData\Local\Temp` for artifacts, causing:
```
Error: BrowserType.launch: ENOENT: no such file or directory, mkdtemp 'C:\\Users\\...\\Temp/playwright-artifacts-...'
```

**Fix:** Set all temp env vars AND `HOME` before importing playwright:
```python
import os
os.environ['TMPDIR'] = '/tmp'
os.environ['TEMP'] = '/tmp'
os.environ['TMP'] = '/tmp'
os.environ['HOME'] = '~'  # Critical: prevents Windows path resolution

# NOW import playwright
from playwright.sync_api import sync_playwright
```

The env vars must be set **before** the `import playwright` statement — playwright reads them at import time. The `HOME` var is needed because Playwright may resolve artifact paths through `$HOME` which WSL can map to the Windows user directory.

## Pitfall 3: Subagent browser Tool Daemon Failure

The `browser` tool (browser_navigate, browser_click, etc.) uses a daemon process that may fail in `delegate_task` subagent contexts:
```
Daemon process exited during startup with no error output
```

**This does NOT affect** the main process — `browser_navigate` works fine there.

**Workaround for subagents:** Use `terminal` tool with `curl` instead of browser tools:
```python
# In delegate_task context, use terminal + curl
terminal(command='curl -sL "https://example.com" | head -200')
```

**For Playwright capture:** Always run capture scripts in the main process or via `terminal` (background=true), never via delegate_task with browser tools.

## Pitfall 4: edge-tts --file Requires File to Exist

`edge-tts --file /path/to/script.txt` fails with `FileNotFoundError` if the file doesn't exist. When writing TTS scripts, always `write_file` or `echo` the content first, then call edge-tts.

**Common pattern:** Script content comes from user conversation → write to disk → then generate TTS:
```bash
# Step 1: Write script (use write_file or terminal echo)
# Step 2: Generate TTS
edge-tts --voice zh-CN-XiaoxiaoNeural --file /path/to/script.txt \
  --write-media voiceover.mp3 --write-subtitles voiceover.vtt
```

**Do NOT** pipe from stdin — edge-tts `--file` only accepts file paths, not stdin.

## Performance Benchmarks (snap chromium, WSL)

Measured on User's WSL environment (snap chromium, --no-sandbox, --disable-gpu):

| Resolution | Approx FPS | 1-min video (1800 frames) | 3-min video (5640 frames) |
|-----------|-----------|--------------------------|--------------------------|
| 1920×1080 | 20-25 fps | ~1.5 min | ~4-5 min |
| 1080×1920 | 12-14 fps | ~2.5 min | ~7-8 min |

For long videos (>2min), run capture as `background=true, notify_on_complete=true` and poll via `ls frames/ | wc -l`.

**Optimization flags that help:**
- `--disable-software-rasterizer` — minor speedup
- `--disable-dev-shm-usage` — prevents /dev/shm exhaustion on large frame counts
- `--disable-gpu` — required for headless, no impact on speed

## Pitfall 5: CDN Fonts + Images Not Loaded Before Capture

Playwright 截帧时如果 CDN 字体或 `<img>` 还没加载完，中文会变方块，真实截图会显示为空白。

**症状**：截出来的帧里中文全是□，或者 `<img src="real-screenshot.png">` 显示为空白区域。

**修复**：在截帧前等待字体和图片全部加载完：

```python
await page.goto(f'file://{SCENE_FILE}')

# Wait for fonts
await page.evaluate('document.fonts.ready')
await page.wait_for_timeout(3000)  # Extra buffer for slow CDN

# Wait for all images
await page.evaluate('''() => {
    return Promise.all(
        Array.from(document.images)
            .filter(img => !img.complete)
            .map(img => new Promise(resolve => {
                img.onload = img.onerror = resolve;
            }))
    );
}''')
await page.wait_for_timeout(1000)

# Verify before starting capture
img_count = await page.evaluate('document.images.length')
loaded_count = await page.evaluate('Array.from(document.images).filter(i => i.complete).length')
print(f'Images: {loaded_count}/{img_count} loaded', flush=True)

fonts_status = await page.evaluate('''() => {
    const fonts = [];
    document.fonts.forEach(f => fonts.push(f.family + ' ' + f.status));
    return fonts.join(', ');
}''')
print(f'Fonts: {fonts_status}', flush=True)
```

**注意**：`document.fonts.ready` 只等 CSS `@font-face` 声明的字体，不等 `<link rel="stylesheet">` CDN 加载的字体。所以需要额外 `wait_for_timeout(3000)` 做缓冲。如果 CDN 特别慢（国内网络波动），可以增加到 5000ms。

## Pitfall 7: Playwright Not Installed in Hermes Venv

The hermes-agent venv (`~/.hermes/hermes-agent/venv/`) uses Python 3.11 but does NOT have playwright installed by default. The system Python 3.14 at `~/.local/lib/python3.14/site-packages/playwright` may have it, but running scripts from the hermes context uses the venv python.

**Symptom:** `ModuleNotFoundError: No module named 'playwright'` when running capture scripts via `terminal()`.

**Misleading signal:** `pip list` (from system pip, Python 3.14) shows `playwright 1.59.0`, but the venv python can't import it. The package is installed in the system site-packages, not the venv.

**Fix:** Install playwright in the venv explicitly:
```bash
~/.hermes/hermes-agent/venv/bin/python3 -m pip install --default-timeout=120 playwright
```

Use `--default-timeout=120` because PyPI downloads can be slow (47MB wheel). After install, verify:
```bash
python3 -c "from playwright.sync_api import sync_playwright; print('OK')"
```

**Note:** Do NOT run `playwright install chromium` — it will fail on Ubuntu 26.04 ("does not support chromium on ubuntu26.04-x64"). Use the snap chromium instead (see Pitfall 8 / launch config).

## Summary: WSL Playwright Checklist

1. [ ] HTML + frames in `~/` not `/tmp` (snap sandbox)
2. [ ] TMPDIR/TEMP/TMP/HOME set before `import playwright`
3. [ ] `executable_path='/snap/chromium/current/usr/lib/chromium-browser/chrome'` in launch()（用 `current` 代替版本号，避免 snap 更新后路径失效）
4. [ ] `args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer']`
5. [ ] Run capture in main process or terminal, not delegate_task with browser tools
6. [ ] TTS script file must exist before calling `edge-tts --file`
7. [ ] **Wait for fonts + images before capture**: `document.fonts.ready` + `Promise.all(document.images)` + 3s buffer
8. [ ] **Verify loaded state** before starting frame loop (print image count + font status)
9. [ ] **Playwright installed in active venv**: `python3 -c "from playwright.sync_api import sync_playwright"` must succeed

## Pitfall 6: Font Timeout Causes Missing Frames

Playwright 偶发 `TimeoutError: fonts timeout 8000ms`（约 5 帧/3015 帧），这些帧不会生成 PNG 文件。FFmpeg 遇到帧序列缺口会**立即停止编码**，导致视频在第一个缺失帧处截断。

**症状**：
- 截帧完成后 `ls frames/ | wc -l` 少于 TOTAL_FRAMES
- NVENC 编码后的视频时长明显短于 TTS 时长
- `ffprobe` 显示视频只有几十秒

**检测**：
```bash
# 检查帧数
actual=$(ls frames-lXX/ | wc -l)
expected=2265
echo "Frames: $actual/$expected"

# 检查帧序号连续性
ls frames-lXX/frame_*.png | sed 's/.*frame_//' | sed 's/.png//' | sort -n | \
  awk 'NR>1 && $1!=prev+1{print "missing: " prev+1 " to " $1-1}{prev=$1}'
```

**修复**：用前一帧复制填补缺失帧
```bash
# 示例：补帧 01410-01412, 01605, 02218
for f in 01410 01411 01412 01605 02218; do
  prev=$(printf "%05d" $((10#$f - 1)))
  cp frames-lXX/frame_${prev}.png frames-lXX/frame_${f}.png
done

# 验证修复
ls frames-lXX/ | wc -l  # 应等于 TOTAL_FRAMES
```

**⚠️ 不补帧 = 视频截断**。FFmpeg 不会跳过缺失帧，会在第一个缺口处停止。
