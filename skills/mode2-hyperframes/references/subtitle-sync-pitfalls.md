# 字幕同步陷阱：VTT vs HTML subtitles 数组

## 核心发现

Mode2 视频管线中，字幕的**显示源**和**数据源**存在断裂：

1. **VTT 文件** (`lesson-XX-voiceover.vtt`) — 被 `batch-l05-l14.py` 的 `parse_vtt()` 读取，仅用于计算 `total_dur` 和 `total_frames`（总帧数），**不决定实际显示的字幕文本**。
2. **HTML 内嵌 `subtitles` 数组** — 位于 `scenes/lesson-XX.html` 的 `<script>` 中，在 `seekTo()` 函数内部定义。这才是渲染时实际显示的字幕内容。
3. **`window.SUBS` 注入** — `batch-l05-l14.py` 会通过 `injectSUBS` 将 VTT 解析结果注入页面，但 `seekTo()` 函数使用的是**本地 `subtitles` 数组**，而非 `window.SUBS`。两者互相独立。

## 三大必须同步的字段

修改字幕时，必须同时更新 HTML 文件中的：

| 字段 | 位置 | 作用 |
|------|------|------|
| `subtitles` 数组 | `seekTo()` 函数内 | 实际显示的字幕文本和时间戳 |
| `sceneBounds` 数组 | 全局变量 | 场景切换时间点（秒） |
| `totalDuration` | 全局变量 | 视频总时长（秒），决定帧数 |

任何一项不匹配都会导致字幕错位或场景断裂。

## 排查流程（字幕与语音不匹配时）

1. **Whisper 转录音频**：用 `faster-whisper` 转录实际 `.mp3` 文件，获取真实语音内容和时间戳。
2. **与 script.txt 比对**：确认音频内容与 `lesson-XX-script.txt` 是否一致（通常是音频正确，字幕错误）。
3. **检查 HTML 内嵌字幕**：读取 `scenes/lesson-XX.html` 中的 `subtitles` 数组，对比 whisper 转录结果。
4. **修正 HTML**：用 `patch` 替换 `subtitles` 数组内容（基于 whisper 时间戳 + 权威逐字稿文本），更新 `sceneBounds` 和 `totalDuration`。
5. **同步修正 VTT**：虽然 VTT 不影响显示，但保持一致性，用相同内容重写 `.vtt` 文件。
6. **重新渲染**：运行渲染脚本生成新视频。
7. **视觉验证**：截取视频关键时间点（10s, 30s, 60s 等），确认字幕内容和画面一致。

## 常见触发场景

- 语音稿/逐字稿经过重写（如从 Claude 内容改为国产模型内容），但 HTML 未同步更新
- 重新录制了音频（`.mp3`），但 HTML 的字幕数组仍是旧版
- 手动编辑了 VTT 文件，以为会自动生效，实际 HTML 内嵌字幕未改

## 命令参考

```bash
# Whisper 转录（验证音频内容）
faster-whisper "scenes/lesson-XX-voiceover.mp3" --model large-v3 --output_format txt --output_dir /tmp/

# 渲染（修正 HTML 后）
python scripts/batch-l05-l14.py --lessons XX --scenes scenes/
```
