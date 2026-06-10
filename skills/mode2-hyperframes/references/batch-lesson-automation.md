# ⚠️ DEPRECATED — Batch Lesson Automation Pipeline

> **Deprecated 2026-06-06**: The generator-script-driven batch HTML production described here is forbidden.
> New workflow: `references/per-scene-workflow.md` (per-scene from-scratch design).
> Retained only for technical reference (BGM calibration tables, pipeline script patterns, NVENC params).
> **Do NOT use the "Generator Architecture" or "Content Builders" sections — those produce template clones.**

---

## Overview

When producing 4+ lesson videos in sequence, use a two-tier automation architecture:
1. **Generator script** (Python): reads lesson definitions → produces HTML files
2. **Pipeline scripts** (Bash): per-lesson or batch `capture → mix → encode → deliver`

## Generator Architecture (gen-lXX-lYY-vN.py)

### Lesson Definition Format

```python
LESSONS = {
    '07': {
        'module': '模块 3',
        'title': '做视频的全景图',
        'subtitle': '五个工序，五把趁手的家伙',
        'tags': ['文案', '画面', '配音', '剪辑', '发布'],
        'bounds': [(0, 19.2), (19.2, 37.1), ...],  # scene time boundaries from VTT
        'scenes': [
            ('s1', 'Step 01', '场景标题', 'red', 'text', '<html content>'),
            # (sid, step_label, title, color, icon_key, content_html)
            ...
        ],
    },
    '08': { ... },
}
```

### Content Builders (composable HTML generators)

Each builder returns HTML string. Chain them with `+`:

| Builder | Returns | Use |
|---------|---------|-----|
| `glass(title, desc, color, badge)` | glass-card with colored left border | Feature descriptions |
| `glass_center(text, color, emoji)` | Centered text in glass-card | Key takeaways |
| `glass_big(text, color)` | Large centered text | Emphasis moments |
| `wf_flow(items)` | workflow nodes + arrows | Process flows |
| `row_cards(items)` | Horizontal card row | Comparisons |
| `next_preview(text)` | Next lesson preview | Scene endings |
| `title_html(module, title, subtitle, tags)` | Title scene | Always scene 0 |
| `scene_hdr(sid, step, title, color, icon)` | Scene header | First element of each scene |

### CSS Color Constants

```python
COLORS = {
    'red': {'hex': '#EF4444', 'var': 'var(--red)', ...},
    'blue': {'hex': '#3B82F6', 'var': 'var(--blue)', ...},
    'green': {'hex': '#10B981', 'var': 'var(--green)', ...},
    'purple': {'hex': '#8B5CF6', 'var': 'var(--purple)', ...},
    'orange': {'hex': '#F97316', 'var': 'var(--orange)', ...},
    'cyan': {'hex': '#06B6D4', 'var': 'var(--cyan)', ...},
}
```

### SVG Icon Library

Pre-defined icons: `text`, `image`, `mic`, `scissors`, `upload`, `play`, `zap`, `check`, `send`, `eye`, `shield`, `globe`, `layers`, `cpu`, `star`, `monitor`, `search`, `book`, `alert`, `grid`

Usage: `ICONS.get(icon_key, ICONS['check'])`

## Pipeline Script Pattern

### Per-Lesson Pipeline (run-lXX-full.sh)

```bash
#!/bin/bash
set -e
cd ~/course-studio
export TMPDIR=/tmp

LESSON=07; DUR=91.24; FPS=15
TOTAL=$(python3 -c "print(int(${DUR}*${FPS}))")

# 1. Capture
python3 scripts/capture-l${LESSON}.py

# 2. Check frame count + fill gaps
FRAME_COUNT=$(ls frames-l${LESSON}/*.png | wc -l)
if [ "$FRAME_COUNT" -lt "$TOTAL" ]; then
    # fill missing frames by copying previous
fi

# 3. Mix (stereo 44.1kHz!)
ffmpeg -y -i voiceover.mp3 -i bgm.mp3 \
  -filter_complex \
  "[0:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.0[vo]; \
   [1:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=$BGM_VOL, \
   afade=t=in:d=2,afade=t=out:st=$FADE:d=3[bgm]; \
   [vo][bgm]amix=inputs=2:duration=first:dropout_transition=2:normalize=0, \
   alimiter=limit=0.9[out]" \
  -map "[out]" -c:a aac -b:a 192k mixed.m4a

# 4. NVENC encode
ffmpeg -y -framerate $FPS -i frames-l${LESSON}/frame_%05d.png -i mixed.m4a \
  -c:v h264_nvenc -preset p5 -cq 20 -pix_fmt yuv420p -profile:v high -level 4.0 \
  -c:a copy -shortest -movflags +faststart output.mp4

# 5. Verify volume (target -22~-18 dB)
ffmpeg -i output.mp4 -af volumedetect -f null - 2>&1 | grep mean_volume

# 6. Deliver
cp output.mp4 "~/Downloads/"
```

### Batch Pipeline (run-l08-l10.sh)

Uses bash associative arrays for per-lesson parameters:

```bash
declare -A DURS=([08]=106.26 [09]=112.7 [10]=110.34)
declare -A BGM_VOLS=([08]=0.20 [09]=0.12 [10]=0.15)
declare -A FADE_OUT=([08]=103 [09]=109 [10]=107)

for LID in 08 09 10; do
    DUR=${DURS[$LID]}
    # ... capture + mix + encode + deliver
done
```

## BGM Volume Calibration Table

| Lesson | BGM mean_volume | BGM volume param | Notes |
|--------|----------------|-----------------|-------|
| L07 | -29.9 dB | 0.30 | Quieter track, needs boost |
| L08 | -37.3 dB | 0.20 | |
| L09 | -31.8 dB | 0.12 | |
| L10 | -34.6 dB | 0.15 | |

**Rule**: Always run `volumedetect` on each BGM track before mixing. Set volume so mixed result hits -22~-18 dB mean.

## Key Pitfalls

1. **BGM silently dropped**: Missing `aformat=sample_rates=44100:channel_layouts=stereo` on both inputs → amix drops the lower-priority stream
2. **Frame gaps**: Playwright timeout on some frames → FFmpeg stops at first gap. Always check frame count and fill gaps before encoding.
3. **cmd.exe start hangs in WSL**: Copy file first, then `cmd.exe start` in separate command. If it still hangs, the file is ready at the path — user can open manually.
4. **Generator uses undefined CSS classes**: Only use classes from the template HTML (L05). Run `grep -c 'class-name' template.html` before using a class.
