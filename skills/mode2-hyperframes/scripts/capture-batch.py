#!/usr/bin/env python3
"""
⚠️ DEPRECATED (2026-06-06): Batch capture script — batch workflow is forbidden.
Retained for reference only. Use capture-template.py for single-scene capture.
New workflow: see references/per-scene-workflow.md
"""
"""Batch capture with fresh browser per batch to avoid OOM.
Usage: TMPDIR=/tmp python3 scripts/capture-batch.py <lesson_id>

Features:
- Fresh browser per 150 frames (prevents Chromium memory leak)
- 10s screenshot timeout with retry
- Failed frames copy from previous frame
- Resume support (skips already-captured batches)
"""
import os, sys, json, time, re, shutil
os.environ['TMPDIR']='/tmp'
os.environ['TEMP']='/tmp'
os.environ['TMP']='/tmp'

from playwright.sync_api import sync_playwright

BASE = os.path.expanduser('~/course-studio')
FPS = 15
BATCH = 150

def parse_vtt(path):
    with open(path) as f:
        content = f.read()
    entries = re.findall(r'(\d+)\n([\d:,.]+)\s*-->\s*([\d:,.]+)\n(.+?)(?=\n\n|\Z)', content, re.DOTALL)
    result = []
    for _, start, end, text in entries:
        h, m, rest = start.strip().split(':')
        s, ms = rest.split(',')
        sv = int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000
        h2, m2, rest2 = end.strip().split(':')
        s2, ms2 = rest2.split(',')
        ev = int(h2)*3600 + int(m2)*60 + int(s2) + int(ms2)/1000
        result.append([round(sv,3), round(ev,3), text.strip().replace('\n',' ')])
    return result

def capture_lesson(lesson_id):
    html_path = os.path.abspath(os.path.join(BASE, 'scenes', f'lesson-{lesson_id}.html'))
    vtt_path = os.path.join(BASE, 'scenes', f'lesson-{lesson_id}-voiceover.vtt')
    frames_dir = os.path.join(BASE, f'frames-l{lesson_id}')

    subs = parse_vtt(vtt_path)
    total_dur = max(e for _,e,_ in subs) + 1.0
    total_frames = int(total_dur * FPS)
    os.makedirs(frames_dir, exist_ok=True)

    t0 = time.time()
    with sync_playwright() as p:
        for bs in range(0, total_frames, BATCH):
            be = min(bs + BATCH, total_frames)
            # Resume: skip if last frame of batch exists
            if os.path.exists(os.path.join(frames_dir, f'frame_{be-1:05d}.png')):
                continue

            browser = p.chromium.launch(
                executable_path='/snap/chromium/current/usr/lib/chromium-browser/chrome',
                args=['--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--single-process']
            )
            page = browser.new_page(viewport={'width':1080,'height':1920})
            page.goto(f'file://{html_path}', timeout=30000)
            page.wait_for_timeout(2000)

            ok = 0
            for i in range(bs, be):
                t = i / FPS
                try:
                    page.evaluate(f'seekTo({t:.4f})')
                    page.wait_for_timeout(6)
                    page.screenshot(
                        path=os.path.join(frames_dir, f'frame_{i:05d}.png'),
                        clip={'x':0,'y':0,'width':1080,'height':1920},
                        timeout=10000
                    )
                    ok += 1
                except:
                    prev = os.path.join(frames_dir, f'frame_{i-1:05d}.png')
                    dst = os.path.join(frames_dir, f'frame_{i:05d}.png')
                    if os.path.exists(prev):
                        shutil.copy2(prev, dst)
                        ok += 1

            elapsed = time.time() - t0
            print(f"  Batch {bs}-{be}: {ok}/{min(BATCH, be-bs)} ({elapsed:.0f}s)", flush=True)
            page.close()
            browser.close()

    elapsed = time.time() - t0
    actual = len([f for f in os.listdir(frames_dir) if f.endswith('.png')])
    print(f"L{lesson_id}: {actual}/{total_frames} frames in {elapsed:.0f}s")
    return actual

if __name__ == '__main__':
    lessons = sys.argv[1:] if len(sys.argv) > 1 else ['11','12','13','14']
    for lid in lessons:
        print(f"\n=== Capturing L{lid} ===")
        capture_lesson(lid)
    print("\nAll captures complete!")
