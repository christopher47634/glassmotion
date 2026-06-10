# 多课批量视频生产流程

## 核心流程（逐课执行，不并行）

### Step 1: 提取单课脚本

从多课逐字稿文档中提取单课口播文本：
```bash
# 手动提取该课的口播段落，去掉分镜表、备注等
# 保存为 lesson-XX-script.txt
```

**注意**：逐字稿里的"口播逐字稿"部分才是TTS输入，分镜表不是。

### Step 2: 生成TTS + VTT

```bash
edge-tts --voice zh-CN-XiaoxiaoNeural \
  --file lesson-XX-script.txt \
  --write-media lesson-XX-voiceover.mp3 \
  --write-subtitles lesson-XX-voiceover.vtt
```

### Step 3: ⚠️ 用VTT实际时间重算场景边界（铁律）

**分镜表时间 ≠ TTS实际时长。** 分镜表写"约7分钟"但TTS可能只产出2分钟。

正确流程：
1. 读VTT，获取实际总时长
2. 按VTT的自然断句（语义段落结束点）重新划分场景边界
3. 不要强行凑分镜表的时间段
4. 场景边界写入HTML的 `sceneBounds` 数组
5. `totalDuration` = 最后一条VTT的end + 少量buffer

**错误示例**：
- 分镜表写"对比开场 0:00–1:00"
- 但VTT第3条字幕在22s就结束了第一段内容
- → 场景边界应设为 `{start:0, end:22.575}` 而不是 `{start:0, end:60}`

### Step 4: 逐场景设计HTML

按铁律：每个场景从分镜表那一行从零设计，不套模板。

### Step 5: 3-5帧验证

选每个场景中间时间点的帧验证：
```python
TIMES = [10, 30, 48, 68, 92, 120]  # 每个场景中间
```

检查项：
- 文件大小 > 100KB（有内容）
- 画面内容与分镜表对应
- 字幕可见
- 布局合理

### Step 6: 全量截帧 + 合成

验证通过后才做全量截帧。

## 主题切换规则

- 浅色米白主题：科普类、教育类（15-18课）
- 深色科技主题：硬核工具类、变现类（19-22课）
- **浅色主题借鉴深色主题的动画和特效**，但用浅色token

### 浅色主题token
```css
:root {
  --bg: #FBF7F0;
  --surface: #FFFFFF;
  --surface2: #F3EDE4;
  --text: #1F2937;
  --text2: #6B7280;
  --blue: #4D6BFE;
  --green: #22c55e;
  --terminal-bg: #0D1117;
}
```

### 深色主题token
```css
:root {
  --bg: #0a0a1a;
  --surface: #14142a;
  --surface2: #1a2a3a;
  --text: #e0e0e0;
  --text2: #aaa;
  --blue: #6366F1;
  --cyan: #22D3EE;
  --green: #10B981;
  --terminal-bg: #0D1117;
}
```

## 已完成课次追踪

| 课次 | 主题 | 状态 |
|------|------|------|
| L15 | 浅色米白 | HTML完成，3帧验证通过 |
| L16 | 浅色米白 | 待做 |
| L17 | 浅色米白 | 待做 |
| L18 | 浅色米白 | 待做 |
| L19 | 深色科技 | 待做 |
| L20 | 深色科技 | 待做 |
| L21 | 深色科技 | 待做 |
| L22 | 深色科技 | 待做 |
