#!/usr/bin/env python3
"""Mode2 抽帧验证：在指定时间点各截一张图，供人工 / vision 检查。

  python3 verify-template.py scenes.html --times 2.5 5 8 --out-dir verify-frames

每张图同时检查文件大小：纯色/空白帧通常很小（< 50 KB），会给出警告。
任一时间点截图失败则以退出码 1 结束。
"""
import argparse
import pathlib
import sys

from playwright.sync_api import sync_playwright

from capture_common import add_browser_args, open_page


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("html")
    ap.add_argument("--times", type=float, nargs="+", required=True, help="时间点（秒），建议每个场景中间取一个")
    ap.add_argument("--out-dir", default="verify-frames")
    ap.add_argument("--min-kb", type=int, default=50, help="小于该大小的帧给出疑似空白警告")
    add_browser_args(ap)
    args = ap.parse_args()

    out = pathlib.Path(args.out_dir)
    out.mkdir(parents=True, exist_ok=True)
    failed, small = [], []
    with sync_playwright() as p:
        browser, page = open_page(p, args, args.html)
        for t in args.times:
            path = out / f"verify_t{t:g}.png"
            try:
                page.evaluate("t => window.seekTo(t)", t)
                if args.settle_ms:
                    page.wait_for_timeout(args.settle_ms)
                page.screenshot(path=str(path), type="png")
            except Exception as e:  # noqa: BLE001
                failed.append((t, str(e).splitlines()[0]))
                continue
            kb = path.stat().st_size // 1024
            print(f"t={t:g}s -> {path} ({kb} KB)")
            if kb < args.min_kb:
                small.append(t)
        browser.close()

    for t in small:
        print(f"WARN: t={t:g}s 的帧只有不到 {args.min_kb} KB，可能是空白帧", file=sys.stderr)
    if failed:
        for t, msg in failed:
            print(f"FAILED: t={t:g}s: {msg}", file=sys.stderr)
        sys.exit(1)
    print("完成。逐张检查：有无方块字、静帧、元素位置/裁切问题。")


if __name__ == "__main__":
    main()
