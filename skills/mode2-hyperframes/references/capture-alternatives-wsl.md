# Playwright WSL Pitfalls — Supplementary: Capture Alternatives

> Added 2026-06-07 from AI上大学 lesson 1 production. Append to main playwright-wsl-pitfalls.md checklist.

## Pitfall A: chromium --virtual-time-budget Does NOT Drive GSAP Animations

When previewing/capturing scenes with `chromium --headless --screenshot --virtual-time-budget=N`, GSAP animations don't advance. The `--virtual-time-budget` flag accelerates the browser clock but does **not** trigger `requestAnimationFrame` callbacks that GSAP relies on.

**Symptom:** Screenshots always capture the initial animation state (elements at opacity:0, scale:0.8, etc.), even with large virtual-time-budget values (e.g. 20000ms).

**Root cause:** GSAP uses `requestAnimationFrame` for its animation loop. Chromium's virtual time budget accelerates timers (setTimeout/setInterval) but rAF callbacks are tied to actual paint cycles, which don't fire under virtual time.

**Fix — use Puppeteer-core with real wait times:**
```js
const puppeteer = require('puppeteer-core');

const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1920, height: 1080 }
});
const page = await browser.newPage();
await page.goto('file:///path/to/scene.html', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));  // Let GSAP init
await page.evaluate((t) => { if (window.seekTo) window.seekTo(t); }, 10);
await new Promise(r => setTimeout(r, 800));   // Let seekTo settle
await page.screenshot({ path: 'preview.png' });
```

**Key requirements:**
- `puppeteer-core` (not `puppeteer` — avoids browser download failure)
- `TMPDIR=/tmp` env var — puppeteer tries Windows temp path when cwd is under `/mnt/c/`
- Run the script from `/tmp` to avoid WSL→Windows path translation issues
- Real-time waits (setTimeout), not virtual time

## Pitfall B: Puppeteer-core as Playwright Fallback (Ubuntu 26.04+)

Playwright doesn't support `ubuntu26.04-x64` — `playwright install chromium` fails. When Playwright is unavailable, use **puppeteer-core** with snap chromium.

**Install:**
```bash
cd /tmp && TMPDIR=/tmp npm install puppeteer-core
```

**Launch config:**
```js
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',   // snap chromium path
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1920, height: 1080 }
});
```

**API comparison (Playwright vs Puppeteer-core):**
| Aspect | Playwright | Puppeteer-core |
|--------|-----------|----------------|
| Wait | `page.waitForTimeout(ms)` | `new Promise(r => setTimeout(r, ms))` |
| goto | `waitUntil: 'networkidle0'` | `waitUntil: 'networkidle0'` (same) |
| Screenshot | `page.screenshot({path})` | `page.screenshot({path})` (same) |
| evaluate | `page.evaluate(fn, arg)` | `page.evaluate(fn, arg)` (same) |
| Install | fails on Ubuntu 26.04 | `npm install puppeteer-core` (no browser download) |

**Critical:** Always set `TMPDIR=/tmp` and run from `/tmp`:
```bash
cd /tmp && TMPDIR=/tmp node capture.js
```

Without this, puppeteer resolves temp paths to `C:\Users\...\AppData\Local\Temp` and crashes with ENOENT.

## Updated Checklist Additions

10. [ ] **Do NOT use `--virtual-time-budget`** for GSAP animation capture — use real wait times with puppeteer-core
11. [ ] **seekTo + wait**: After `page.evaluate(seekTo, t)`, wait 500-800ms for GSAP to settle before screenshot
12. [ ] If Playwright install fails (Ubuntu 26.04+), switch to puppeteer-core + snap chromium
