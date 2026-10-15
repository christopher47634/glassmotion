"""capture-template.py / verify-template.py 共用：启动浏览器、加载场景、解析 VTT。

截帧后端统一为 Playwright（Python）。浏览器选择优先级：
  --chromium 参数 > 环境变量 CHROMIUM_PATH > Playwright 自带 Chromium（`playwright install chromium`）
"""
import os
import pathlib
import re
import sys

_TS = re.compile(r"(?:(\d+):)?(\d{2}):(\d{2})[.,](\d{3})")


def ts_to_sec(ts):
    m = _TS.fullmatch(ts.strip())
    if not m:
        raise ValueError(f"无法解析时间戳: {ts!r}")
    h, mi, s, ms = m.groups()
    return int(h or 0) * 3600 + int(mi) * 60 + int(s) + int(ms) / 1000


def parse_vtt(path):
    """返回 [[start, end, text], ...]，支持 VTT（.）与 SRT（,）时间格式。"""
    text = pathlib.Path(path).read_text(encoding="utf-8").replace("\r\n", "\n")
    subs = []
    for block in re.split(r"\n\s*\n", text):
        lines = [ln for ln in block.strip().split("\n") if ln.strip()]
        for i, line in enumerate(lines):
            if "-->" in line:
                a, b = (x.strip().split()[0] for x in line.split("-->"))
                subs.append([ts_to_sec(a), ts_to_sec(b), " ".join(lines[i + 1:])])
                break
    if not subs:
        raise ValueError(f"VTT 里没有字幕条目: {path}")
    return subs


def add_browser_args(ap):
    ap.add_argument("--width", type=int, default=1080, help="viewport 宽，必须等于 HTML body 宽（默认竖屏 1080）")
    ap.add_argument("--height", type=int, default=1920, help="viewport 高（默认 1920）")
    ap.add_argument("--chromium", default=os.environ.get("CHROMIUM_PATH"),
                    help="Chromium 可执行文件路径；默认用 Playwright 自带浏览器")
    ap.add_argument("--settle-ms", type=int, default=0,
                    help="每次 seekTo 后额外等待的毫秒数。seekTo 是纯函数时应为 0")


def open_page(p, args, html):
    """启动浏览器并打开场景，确认 window.seekTo 存在、字体已就绪。返回 (browser, page)。"""
    launch_kw = {"headless": True,
                 "args": ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"]}
    if args.chromium:
        launch_kw["executable_path"] = args.chromium
    browser = p.chromium.launch(**launch_kw)
    page = browser.new_page(viewport={"width": args.width, "height": args.height}, device_scale_factor=1)
    page.goto(pathlib.Path(html).resolve().as_uri(), wait_until="networkidle")
    page.evaluate("document.fonts.ready.then(() => true)")
    if not page.evaluate("typeof window.seekTo === 'function'"):
        browser.close()
        sys.exit(f"ERROR: {html} 没有暴露 window.seekTo(t)，无法逐帧截图")
    return browser, page
