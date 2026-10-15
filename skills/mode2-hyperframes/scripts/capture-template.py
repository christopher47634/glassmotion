#!/usr/bin/env python3
"""Mode2 逐帧截图（Playwright）。

  python3 capture-template.py scenes.html --vtt voiceover.vtt --out frames
  python3 capture-template.py scenes.html --duration 47.5 --fps 15 --out frames

- 总时长：--duration，或从 --vtt 最后一条字幕的结束时间 + --tail 得到；
- 帧文件名 frame_00000.png 起连续编号（FFmpeg 用 frame_%05d.png）；
- 任何一帧失败（包括重试一次后仍失败）都会以退出码 1 结束，并列出全部失败帧，
  不会留下序号断档的帧序列让 FFmpeg 悄悄合成出跳帧视频；
- 浏览器：--chromium / 环境变量 CHROMIUM_PATH / Playwright 自带 Chromium（默认）。
"""
import argparse
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

from capture_common import add_browser_args, open_page, parse_vtt


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("html", help="暴露 window.seekTo(t) 的场景 HTML")
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--duration", type=float, help="总时长（秒）")
    src.add_argument("--vtt", help="配音字幕文件，时长取最后一条字幕的结束时间")
    ap.add_argument("--tail", type=float, default=0.0, help="配合 --vtt：在最后一条字幕后追加的秒数")
    ap.add_argument("--fps", type=int, default=15)
    ap.add_argument("--out", default="frames", help="帧输出目录（会先清空其中的 PNG）")
    add_browser_args(ap)
    args = ap.parse_args()

    duration = args.duration if args.duration is not None else parse_vtt(args.vtt)[-1][1] + args.tail
    total = int(round(duration * args.fps))
    if total <= 0:
        sys.exit(f"ERROR: 时长 {duration}s 得到 0 帧")

    out = pathlib.Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("*.png"):
        f.unlink()

    print(f"{args.html}: {total} 帧 @ {args.fps}fps（{duration:.3f}s）-> {out}")
    failed = []
    t0 = time.time()
    with sync_playwright() as p:
        browser, page = open_page(p, args, args.html)
        for i in range(total):
            t = i / args.fps
            path = str(out / f"frame_{i:05d}.png")
            err = None
            for _attempt in range(2):  # 失败重试一次
                try:
                    page.evaluate("t => window.seekTo(t)", t)
                    if args.settle_ms:
                        page.wait_for_timeout(args.settle_ms)
                    page.screenshot(path=path, type="png", timeout=10000)
                    err = None
                    break
                except Exception as e:  # noqa: BLE001 — 记录后统一报告
                    err = str(e).splitlines()[0]
            if err:
                failed.append((i, t, err))
            if (i + 1) % 300 == 0 or i == total - 1:
                el = time.time() - t0
                print(f"  {i + 1}/{total}（{(i + 1) / el if el else 0:.1f} 帧/秒）")
        browser.close()

    if failed:
        print(f"FAILED: {len(failed)}/{total} 帧截图失败，帧序列不完整：", file=sys.stderr)
        for i, t, msg in failed:
            print(f"  frame_{i:05d}.png (t={t:.3f}s): {msg}", file=sys.stderr)
        sys.exit(1)

    count = len(list(out.glob("frame_*.png")))
    if count != total:
        sys.exit(f"ERROR: 期望 {total} 帧，目录里实际 {count} 帧")
    print(f"OK: {total} 帧，用时 {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
