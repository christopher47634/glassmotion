#!/usr/bin/env python3
"""
Mode2 3帧验证模板 — 改 LESSON 和 TIMES 即可。
用法: cp verify-template.py verify-l03.py && 编辑参数 && python3 verify-l03.py
"""
import os
os.environ['TMPDIR'] = '/tmp'
os.environ['TEMP'] = '/tmp'
os.environ['TMP'] = '/tmp'

from playwright.sync_api import sync_playwright

# ====== 改这里 ======
LESSON = "03"
TIMES = [45, 95, 150]  # 每个场景中间的时间点(秒)
# ====================

BASE = os.path.expanduser("~/course-studio")
HTML_PATH = f"{BASE}/scenes/lesson-{LESSON}.html"
OUT_DIR = "/tmp/verify-frames"
os.makedirs(OUT_DIR, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/snap/chromium/current/usr/lib/chromium-browser/chrome',
        args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    )
    page = browser.new_page(viewport={'width': 1080, 'height': 1920})
    page.goto(f'file://{HTML_PATH}')
    page.wait_for_timeout(3000)

    for t in TIMES:
        page.evaluate(f"seekTo({t:.4f})")
        page.wait_for_timeout(1200)
        out = os.path.join(OUT_DIR, f"verify_t{t}.png")
        page.screenshot(path=out, type='png')
        size = os.path.getsize(out)
        print(f"t={t}s -> {size//1024} KB")

    browser.close()
print("Done. 用 vision_analyze 检查每帧有无方块/静帧/位置问题。")
