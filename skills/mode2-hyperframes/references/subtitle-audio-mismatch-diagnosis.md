# 字幕/语音不匹配：诊断与修复流程

## 触发信号
用户说"字幕和语音对不上"、"内容碰不上"、"时间戳错位"、"VTT 不对"。

## 根因模式
VTT 和 MP3 来自不同版本的脚本。典型场景：
- 脚本被重写（如从 Claude/Anthropic 改为 openclaw/Kimi），MP3 重新生成了，但 VTT 没更新
- VTT 从旧脚本生成，MP3 从新脚本生成
- 文件时间戳可辅助判断：MP3 和 script.txt 时间接近 → MP3 匹配 script.txt；VTT 时间远晚于两者 → VTT 可能从别的源生成

## 诊断步骤

### 1. 对比 VTT 内容 vs script.txt 内容
读取两份文件，检查是否讲述同一件事。如果主题、命令、产品名都不同，确认是内容错配。

### 2. 用 faster-whisper 转录 MP3 验证实际语音内容
```python
from faster_whisper import WhisperModel
model = WhisperModel('base', device='cpu', compute_type='int8')
segments, info = model.transcribe('/path/to/voiceover.mp3', language='zh', beam_size=5)
for seg in segments:
    print(f'{seg.start:.3f} --> {seg.end:.3f} | {seg.text}')
```
- `faster-whisper` 已装好（pip, base 模型），不需要额外安装
- 转录结果有错别字（如 "Kimi" → "Timmy", "openclaw" → "opuncle"），但足以判断内容方向
- 对比转录结果与 script.txt / VTT，确认 MP3 匹配哪一方

### 3. 用 FFmpeg silence detection 辅助对齐（可选）
```bash
ffmpeg -i voiceover.mp3 -af silencedetect=noise=-30dB:d=0.5 -f null - 2>&1 | grep silence_start
```
输出秒数列表，标记语音自然断点。可与 whisper 时间戳交叉验证。

## 修复步骤

### 1. 生成新 VTT
以权威逐字稿（用户指定的 .md 文件）为文本来源，以 whisper 转录时间戳为时间来源：
- 文本：取逐字稿原文，按语义拆成短句（每条 ≤ 28 字）
- 时间戳：以 whisper 段落边界为基础，微调使断句自然
- 格式：标准 WebVTT（序号 + HH:MM:SS,mmm --> HH:MM:SS,mmm + 文本 + 空行）

### 2. 写入 VTT 文件
覆盖原文件。

### 3. 重新渲染视频
字幕是烧录进视频的（Playwright 截帧时注入 SUBS），必须重渲：
- 复用 batch pipeline 的 `process_lesson()` 函数
- 单独跑需要修改 LESSONS 列表或写独立脚本
- 流程：验证文件 → JS 校验 → 解析 VTT → Playwright 截帧 → BGM 混音（如有）→ NVENC 编码 → 复制到 E:\Downloads\

## 注意事项
- **用户指定的逐字稿 .md 文件是唯一权威**，不管 whisper 转录出什么，都以逐字稿为准
- whisper 转录只用于确认"MP3 到底在说什么"和获取时间戳，不用于文本内容
- VTT 每条字幕 ≤ 28 字（硬性要求，见 quality-checklist.md）
- 渲染后检查：新视频的字幕是否与语音同步、是否有重叠时间戳
