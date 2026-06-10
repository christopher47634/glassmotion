#!/usr/bin/env python3
"""
Mode2 竖屏课程截帧模板 — 复制后改 LESSON/DURATION/FPS 即可跑。
用法: cp capture-template.py capture-l03.py && 编辑3个参数 && python3 capture-l03.py
"""
import os, time
os.environ['TMPDIR'] = '/tmp'
os.environ['TEMP'] = '/tmp'
os.environ['TMP'] = '/tmp'
os.environ['HOME'] = '~'

from playwright.sync_api import sync_playwright

# ====== 改这里 ======
LESSON = "03"           # 课程编号
DURATION = 191.0        # 总时长(秒)，从VTT最后一条的end+1得到
FPS = 15                # 帧率，固定15
# ====================

BASE = os.path.expanduser("~/course-studio")
HTML_PATH = f"{BASE}/scenes/lesson-{LESSON}.html"
FRAMES_DIR = f"{BASE}/frames-l{LESSON}"

os.makedirs(FRAMES_DIR, exist_ok=True)
for f in os.listdir(FRAMES_DIR):
    if f.endswith('.png'):
        os.remove(os.path.join(FRAMES_DIR, f))

total = int(DURATION * FPS)
step = 1.0 / FPS

print(f"Lesson {LESSON}: {total} frames at {FPS}fps ({DURATION}s)")

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path="/snap/chromium/current/usr/lib/chromium-browser/chrome",
        args=['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none']
    )
    page = browser.new_page(viewport={'width': 1080, 'height': 1920}, device_scale_factor=1)
    page.goto(f'file://{HTML_PATH}', wait_until='networkidle')
    page.wait_for_timeout(3000)  # 等字体+图片加载

    t0 = time.time()
    failed = 0
    for i in range(total):
        t = i * step
        frame_path = os.path.join(FRAMES_DIR, f"frame_{i:05d}.png")
        try:
            page.evaluate(f"seekTo({t:.4f})")
            page.screenshot(path=frame_path, type='png', timeout=8000)
        except Exception as e:
            failed += 1
            if failed <= 5:
                print(f"  frame {i} error: {e}")
        if (i+1) % 300 == 0 or i == total-1:
            elapsed = time.time() - t0
            fps_actual = (i+1) / elapsed if elapsed > 0 else 0
            print(f"  {i+1}/{total} done ({fps_actual:.1f} fps)")

    browser.close()

remaining = [f for f in os.listdir(FRAMES_DIR) if f.endswith('.png')]
elapsed = time.time() - t0
print(f"Done: {len(remaining)} frames, {failed} failed, {elapsed:.1f}s total")
