# FFmpeg Expression Pitfalls (motion video)

Hard-won lessons from building motion videos with FFmpeg filter_complex.

## drawbox does NOT support dynamic alpha

The `@alpha` part of drawbox color is **static only**. Expressions like `color=0x00F0FF@'sin(t)'` will fail with:
```
Invalid alpha value specifier
```

**Workaround**: Use static alpha values on drawbox, and do all dynamic opacity through `drawtext`'s `alpha` parameter (which does support expressions).

```python
# WRONG - will fail
f"drawbox=x=100:y=100:w=200:h=2:color=0x00F0FF@'min(max({lt}*0.6,0),0.5)':t=fill"

# RIGHT - static alpha
f"drawbox=x=100:y=100:w=200:h=2:color=0x00F0FF@0.3:t=fill"
```

## clamp() does not exist in FFmpeg expressions

FFmpeg's expression evaluator has no `clamp()` function. Use `min(max(x, lo), hi)`:

```python
# WRONG
f"color=0x00F0FF@'clamp({lt}*0.6,0,0.5)'"

# RIGHT
f"color=0x00F0FF@'min(max({lt}*0.6,0),0.5)'"
```

But note: even `min(max(...))` won't help in drawbox color alpha (see above).

## geq uses N (frame number), not t (time)

In the `geq` filter, the variable for time is **not** `t`. Use `N` (frame number) divided by FPS:

```python
# WRONG - 't' is undefined in geq
f"geq=r='8+6*sin(2*PI*(t+X/400)/8)'"

# RIGHT - use N/FPS for time
f"geq=r='8+6*sin(2*PI*(N/{FPS}+X/400)/8)'"
```

Available variables in geq: `N` (frame number), `X`, `Y`, `W`, `H`.

## Input stream index must match actual inputs

When using `-filter_complex`, the input index in `-map` must match the actual input order:

```bash
# If audio is the ONLY input (input 0), map 0:a not 1:a
ffmpeg -y -i audio.mp3 -filter_complex "..." -map "[final]" -map 0:a ...

# If you have two inputs (video + audio), then 0:v and 1:a
ffmpeg -y -i video.mp4 -i audio.mp3 -filter_complex "..." -map "[final]" -map 1:a ...
```

Common error: `Invalid input file index: 1.` when audio is input 0.

## drawtext alpha expressions DO work

Unlike drawbox, `drawtext` supports dynamic `alpha` with full expression syntax:

```python
# Fade in over 0.4s, stay, fade out over 0.4s
f"drawtext=text='Hello':"
f"fontfile={FONT}:fontsize=68:fontcolor=0x00F0FF:"
f"x=(w-text_w)/2:y={y_expr}:"
f"alpha='if(lt({lt},0.4),{lt}/0.4*255,if(lt({lt},{dur}-0.4),255,max(0,({dur}-{lt})/0.4*255)))'"
```

## drawtext y-position for slide-up with bounce

```python
# Slide from bottom, overshoot, bounce back, settle
y_main = (
    f"'if(lt({lt},0.6),"           # Phase 1: slide up fast
    f" {H}-(1.67*{lt})*({H}/2+20),"  # Linear interpolation from H to H/2-20
    f" if(lt({lt},0.9),"           # Phase 2: bounce
    f"  {H}/2-20+50*({lt}-0.6)/0.3,"  # Overshoot up
    f"  {H}/2-20+50*(1-(({lt}-0.9)/0.3))*0.3"  # Settle
    f" ))'"
)
```

## Font requirements for CJK text

WSL has no CJK fonts by default. Must install or copy:

```bash
# Copy from existing project
cp ~/Downloads/remotion-project/public/fonts/LXGWWenKai-Regular.ttf ~/.local/share/fonts/
fc-cache -fv ~/.local/share/fonts/
```

Font paths to use:
- Chinese: `~/.local/share/fonts/LXGWWenKai-Regular.ttf`
- English: `~/.local/share/fonts/ChakraPetch-SemiBold.ttf`

## Text escaping for drawtext

Must escape: `\`, `'`, `:`, `;`, `[`, `]`

```python
def esc(t):
    for c in ["\\", "'", ":", ";", "[", "]"]:
        t = t.replace(c, f"\\{c}")
    return t
```

## Animated particles via drawtext

Simple rising dots using drawtext with modulo for wraparound:

```python
for p in range(6):
    px = (p * 317 + 100) % W
    speed = 30 + p * 15
    particles += (
        f",drawtext=text='.':"
        f"fontfile={FONT_EN}:fontsize={20+p*4}:"
        f"fontcolor=0x00F0FF@0.2:"
        f"x={px}:"
        f"y='mod({H+100+p*100}-t*{speed},{H+300})-150'"
    )
```

## Scene transition flash

White flash that fades quickly on scene change:

```python
flash = (
    f",drawtext=text=' ':fontfile={FONT}:fontsize=1:"
    f"x=0:y=0:"
    f"alpha='if(lt({lt},0.12),30*(1-{lt}/0.12),0)'"
)
```

## Playwright in WSL: video recording broken, screenshots work fine

Playwright's `record_video_dir` in WSL tries to use Windows temp path (`C:\Users\...\AppData\Local\Temp`), causing ENOENT. Setting `TMPDIR=/tmp` does NOT fix it.

**But screenshots work perfectly** when using system Chromium:

```python
browser = p.chromium.launch(
    headless=True,
    executable_path='/snap/bin/chromium',  # 关键：不用 Playwright 自带的
    args=['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
)
page = browser.new_page(viewport={'width': 1920, 'height': 1080})
# page.screenshot() works fine
```

这是首选方案——逐帧截图 + FFmpeg 合成，比 FFmpeg drawtext 支持更多动画效果和组件。
