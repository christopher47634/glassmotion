# WSL 渲染与合成踩坑

## Puppeteer 在 WSL 上的正确用法

**问题**: Playwright 不支持 Ubuntu 26.04+ (`playwright install chromium` 报错)。
**解决**: 用 puppeteer-core + snap chromium。

```bash
cd /tmp && TMPDIR=/tmp npm install puppeteer-core
```

```js
const puppeteer = require('puppeteer-core');
const browser = await puppeteer.launch({
    executablePath: '/snap/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1920, height: 1080 }
});
```

**关键**: Node 脚本必须从 `/tmp` 运行，不能从 `/mnt/c/` 下运行。Puppeteer 会在 cwd 附近找 temp 目录，`/mnt/c/` 映射到 Windows 路径导致 `mkdtemp` ENOENT 错误。

## --virtual-time-budget 不驱动 GSAP

**问题**: `chromium --headless --virtual-time-budget=N` 不会推进 requestAnimationFrame 回调。GSAP 动画完全不播放，截图永远是初始帧。

**解决**: 必须用 Puppeteer 真实等待：
```js
await page.goto('file://' + htmlPath, { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500)); // 等 GSAP 初始化
await page.evaluate(t => window.seekTo(t), seekToValue);
await new Promise(r => setTimeout(r, 400)); // 等动画播放
await page.screenshot({ path: outputPath });
```

## FFmpeg subtitles 路径含中文字符

**问题**: FFmpeg 的 `subtitles=` filter 对含中文/特殊字符的路径会解析失败。

**解决**: 先复制 VTT 到 `/tmp` 再引用：
```bash
cp "~/Desktop/课程/xxx.vtt" /tmp/subs.vtt
ffmpeg -i input.mp4 -vf "subtitles=/tmp/subs.vtt:force_style='...'" ...
```

## 批量截帧的帧编号陷阱

不同工程师并行截帧时，帧文件命名可能不一致：
- 方案A: 每场景独立编号 `s5_frame_001.png`
- 方案B: 全局递增 `s5_frame_001.png`...`s6_frame_015.png`

**合成前必须检查帧文件实际命名**，不匹配就重命名：
```bash
i=1; for f in $(ls s6_frame_*.png | sort); do
    mv "$f" $(printf "s6_frame_%03d.png" $i)
    i=$((i+1))
done
```

## 草稿版 vs 正式版渲染策略

| 版本 | 帧率 | 质量 | 速度 | 用途 |
|------|------|------|------|------|
| 草稿 | 1fps 截取 → ffmpeg -r 30 转换 | 幻灯片，无动画过渡 | 快（~3min/课） | 审核内容和设计 |
| 正式 | 2fps 截取（seekTo 步进 0.5s）| 关键动画帧可见 | 中（~10min/课） | 交付审核 |
| 精品 | 15fps 逐帧 | 流畅动画 | 慢（~30min/课） | 最终交付 |

草稿版合成命令：
```bash
# 每场景：帧列表 + per-frame duration → 视频片段
ffmpeg -y -f concat -safe 0 -i scene_concat.txt \
    -vf "scale=1920:1080,format=yuv420p" \
    -c:v libx264 -preset fast -crf 18 -r 30 segment.mp4

# 全部片段拼接 + 音频 + 字幕
ffmpeg -y -f concat -safe 0 -i all_segments.txt \
    -i audio.mp3 \
    -vf "subtitles=/tmp/subs.vtt:force_style='FontSize=22,...'" \
    -c:v libx264 -preset medium -crf 20 \
    -c:a aac -b:a 128k -shortest -movflags +faststart \
    output.mp4
```

## ⚠️ 音频 VTT 是唯一时间基准（铁律）

**真实事故**：视频按脚本标注的目标时长（如 S1=17s, S2=16s...）做，总长 277s。但 TTS 实际语速更快，音频只有 195s。结果：视频比音频长 80 多秒，后半段只有画面没声音，字幕也对不上。

**根因**：工程师任务规格里没写"音频 VTT 是唯一时间基准"，工程师就用了脚本标注时长。

**铁律**：
1. **音频 VTT 的时间戳是唯一时间基准**，视频场景时长必须严格匹配 VTT 实际时间
2. 派工程师时必须在规格里写明：每个场景对应 VTT 哪几段，用 VTT 的 end time - start time 作为场景时长
3. 合成后验证：`ffprobe video.mp4` 的 duration 必须 ≈ `ffprobe audio.mp3` 的 duration，差值 < 1s
4. **永远不要用脚本标注的目标时长**（如"这段目标 8s"）——TTS 实际语速和标注永远不一致

映射方法：
```
场景 S1 = VTT 第 1-2 段 → 时长 = VTT_seg2_end - VTT_seg1_start
场景 S2 = VTT 第 3-4 段 → 时长 = VTT_seg4_end - VTT_seg3_start
...
```

## ⚠️ 动画截帧时长必须和 VTT 场景时长一致（铁律）

**真实事故**：工程师写的截帧脚本里，场景时长(dur)和VTT时间戳完全对不上：
- S4: 截了5秒动画，但VTT场景要播15.4秒 → 动画5秒跑完，剩10.4秒是静态图
- S5: 截了11秒动画，但VTT场景要播48.1秒 → 动画11秒跑完，剩37秒静态
- S7: 截了7秒动画，但VTT场景要播19.2秒
- S8: 截了9秒动画，但VTT场景要播44.3秒

**结果**：User说"视频里像是图片在轮着播放，动画都没有动效，好像是按了暂停键"。动画比语音快很多，说到PPT时动画已经到了下一个内容。

**根因**：工程师凭感觉写的 `dur` 值（如"S4大概5秒够了"），没有用VTT时间戳计算。

**铁律**：
1. 截帧脚本的每个场景dur = VTT end - VTT start，精确到小数
2. 每个场景截取的帧数 = dur × FPS（如15fps × 15.4s = 231帧）
3. 派工程师时必须在规格里写明每个场景的精确VTT时间范围
4. 合成前验证：总帧数 ≈ 总时长 × FPS

**验证方法**：
```python
# 检查截帧时长是否和VTT匹配
scenes = [
    {"file": "s0", "capture_dur": 4.0, "vtt_dur": 4.0},   # OK
    {"file": "s4", "capture_dur": 5.0, "vtt_dur": 15.4},  # WRONG! 差10秒
    {"file": "s5", "capture_dur": 11.0, "vtt_dur": 48.1}, # WRONG! 差37秒
]
for s in scenes:
    if abs(s["capture_dur"] - s["vtt_dur"]) > 1.0:
        print(f"WARNING: {s['file']} capture_dur={s['capture_dur']} != vtt_dur={s['vtt_dur']}")
```

## ⚠️ Puppeteer 截帧中文字体渲染失败

**真实事故**：HTML页面在浏览器里中文显示正常，但Puppeteer逐帧截取时中文全部变成方块□□。

**根因**：HTML的CSS `@font-face` 引用 `url('~/Fonts/NotoSansCJK-Regular.ttc')`。当页面通过HTTP server加载时，浏览器请求 `http://127.0.0.1:PORT~/Fonts/NotoSansCJK-Regular.ttc`，HTTP server映射到 `SCENES_DIR + ~/Fonts/...`，路径不存在，字体加载失败。

**注意**：单张截图（`page.screenshot`）时字体可能因为系统fontconfig fallback而正常显示，但逐帧渲染时每帧都重新解析CSS，字体加载失败会更明显。

**修复方法**：在scenes目录下创建字体文件的符号链接：
```bash
mkdir -p "/path/to/scenes~/Fonts/"
ln -sf /tmp/NotoSansCJK-Regular.ttc "/path/to/scenes~/Fonts/NotoSansCJK-Regular.ttc"
ln -sf /tmp/NotoSansCJK-Bold.ttc "/path/to/scenes~/Fonts/NotoSansCJK-Bold.ttc"
```

这样HTTP server收到 `~/Fonts/NotoSansCJK-Regular.ttc` 请求时，能通过符号链接找到实际文件。

**验证**：截帧后用 vision_analyze 检查中间帧，确认中文文字不是方块。

## TTS 语音选择

**User 不喜欢机械音。** 优先级：

1. **MiniMax T2A**（your_voice_id 青年大学生）— 最自然的中文语音，API直接生成MP3
2. **edge-tts zh-CN-YunxiNeural**（男声）— 比 XiaoyiNeural 自然，适合学长人设
3. edge-tts zh-CN-XiaoyiNeural（女声）— 备选，偏机械

edge-tts 分段生成时建议 `--rate="+5%"` 让语速稍快更像真人聊天。

### MiniMax T2A API

```
POST https://api.minimaxi.com/v1/t2a_v2
Authorization: Bearer <API_KEY>
Body: {
  "model": "speech-2.8-hd",
  "text": "...",
  "voice_id": "your_voice_id",
  "speed": 1.0, "vol": 1, "pitch": 0,
  "sample_rate": 32000, "bitrate": 128000, "format": "mp3",
  "stream": false
}
```

- API Key 从 ~/.minimax_key 读取（User通过PowerShell写入/mnt/c/tmp/，需iconv UTF-16LE→UTF-8转换）
- 响应中 `data.audio` 是hex编码的mp3，需 `bytes.fromhex()` 解码
- `extra_info.audio_length` 返回毫秒级时长
- 有速率限制(~14 req/min)，超出需等待60秒重试
- 新用户有免费额度，用完需充值

## Edge-TTS 分段生成技巧

整段生成的 TTS 语速偏快、段间无停顿。正确做法：

1. 每段台词单独生成: `edge-tts --voice zh-CN-YunxiNeural --rate="+5%" --text "..." --write-media seg_N.mp3`
2. 生成静音间隔: `ffmpeg -f lavfi -i anullsrc=r=24000:cl=mono -t 0.8 -c:a aac silence.m4a`
3. 创建 concat 列表（交替 seg + silence）
4. 合并: `ffmpeg -f concat -safe 0 -i list.txt -c:a libmp3lame -q:a 2 output.mp3`
5. 用 ffprobe 量每段实际时长，据此生成 VTT 时间戳
