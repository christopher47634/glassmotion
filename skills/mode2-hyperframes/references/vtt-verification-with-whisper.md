# faster-whisper VTT 验证与重建

## 用途
当 VTT 内容和 script.txt 不匹配时，用 faster-whisper 转录实际 MP3 音频，获取真实时间戳和内容，重建 VTT。

## 前置条件
- faster-whisper 已安装：`pip install faster-whisper`（base 模型即可，中文识别够用）
- 不需要 GPU，CPU int8 模式够快（3 分钟音频约 30-60 秒转录）

## 转录命令

```bash
python3 -c "
from faster_whisper import WhisperModel
model = WhisperModel('base', device='cpu', compute_type='int8')
segments, info = model.transcribe('scenes/lesson-XX-voiceover.mp3', language='zh', beam_size=5)
for seg in segments:
    print(f'{seg.start:.3f} --> {seg.end:.3f} | {seg.text}')
"
```

## 注意事项
- whisper 转录有错别字（Kimi→Timmy, openclaw→opuncle 等），**不要直接用转录文字做字幕**
- 正确做法：用 whisper 的**时间戳** + script.txt 的**准确文字**组装 VTT
- whisper 分段不一定符合字幕长度要求（<=20字），需要手动拆分长段

## 辅助：静音检测（验证时间戳合理性）

```bash
ffmpeg -i scenes/lesson-XX-voiceover.mp3 -af silencedetect=noise=-30dB:d=0.5 -f null - 2>&1 | grep silence_start
```

输出的静音起始点应该和 whisper 的分段边界大致吻合。

## 完整修复流程

1. `ffprobe` 获取 MP3 总时长
2. faster-whisper 转录 → 时间戳 + 内容概要
3. 对比 whisper 内容 vs script.txt → 确认讲的是同一件事
4. 用 script.txt 原文逐条填充，whisper 时间戳做 start/end
5. 拆分超长条目（>20字）
6. 检查：无时间重叠、无间隙、总时长 ≈ MP3 时长
7. 写入 .vtt 文件
