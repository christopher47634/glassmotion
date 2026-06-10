#!/usr/bin/env python3
"""
通用Mode2截帧脚本 — 接受lesson_num参数，自动从VTT读duration
用法: python3 capture-generic.py <lesson_num>
前置: /tmp/lesson-{num}.html 和 /tmp/lesson-{num}-voiceover.vtt 已就绪
输出: /tmp/frames-l{num}/frame_XXXX.png (15fps, 1080x1920)
"""
import os, sys, re
os.environ['TMPDIR'] = '/tmp'
from playwright.sync_api import sync_playwright

num = int(sys.argv[1])
HTML = f'/tmp/lesson-{num}.html'
FRAMES = f'/tmp/frames-l{num}'
FPS = 15

# 从VTT自动读取duration
with open(f'/tmp/lesson-{num}-voiceover.vtt') as f:
    vtt = f.read()
times = re.findall(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})', vtt)
last = times[-1]
dur = int(last[0])*3600 + int(last[1])*60 + int(last[2]) + int(last[3])/1000
EXPECTED = int(dur * FPS)

os.makedirs(FRAMES, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path='/snap/chromium/current/usr/lib/chromium-browser/chrome',
        args=['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
    )
    page = browser.new_page(viewport={'width': 1080, 'height': 1920})
    page.goto(f'file://{HTML}')
    page.wait_for_timeout(3000)  # 等GSAP加载

    for i in range(EXPECTED):
        t = i / FPS
        page.evaluate(f'seekTo({t})')
        page.wait_for_timeout(50)
        page.screenshot(
            path=os.path.join(FRAMES, f'frame_{i:04d}.png'),
            clip={'x': 0, 'y': 0, 'width': 1080, 'height': 1920}
        )

    browser.close()
    print(f'L{num}: {EXPECTED} frames at {FPS}fps')
