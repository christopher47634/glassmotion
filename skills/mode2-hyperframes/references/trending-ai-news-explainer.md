# Trending AI News Explainer — Quick-Start Pattern

V经常要求："调研一下X（新模型/新功能），然后做个科普视频"。
这是最快的出活路径，按此走不迷路。

## 决策树

```
V说"调研+做视频"
  → 模型/功能是时效性热点？
    → YES: Mode 2（快速，不追求确定性渲染）
    → NO（付费课程/系列内容）: Mode 3
```

## 5步流水线

### Step 1: 调研（delegate_task ×2-3路并行）
- 路1: 官方信息（博客/API文档/定价）
- 路2: 用户反馈（Reddit/Twitter/Bilibili/知乎/小红书）
- 路3: 技术对比（benchmark/竞品对比）
- ⚠️ V给的名字可能不准确（如"cloud的模型"实际是"Claude"）。先做宽泛搜索确认正确名称，再深入。不要在错误名字上浪费3路agent。

### Step 2: 分镜表 + HTML场景（delegate_task 工程师）
context必含：
- 调研结果摘要（核心信息，不要全量输出）
- 完整技术规格（尺寸/配色/字体/动画规则）
- 建议分镜结构（7-8场景，45-60秒）
- 参考skill路径

典型分镜：
| # | 场景 | 时长 | 内容 |
|---|------|------|------|
| 1 | Intro标题卡 | 4s | 产品名+一句话定位 |
| 2 | 发布背景 | 6-7s | 谁出的/什么时候/定位 |
| 3 | 核心能力1 | 6-8s | 最亮的卖点 |
| 4 | 核心能力2 | 6-8s | 第二卖点或对比 |
| 5 | 价格/对比 | 8s | 表格或数据卡片 |
| 6 | 争议/槽点 | 6s | 平衡报道感 |
| 7 | 结尾 | 4s | 总结+引导 |

### Step 3: TTS
- edge-tts zh-CN-YunxiNeural +10% rate
- 每场景单独MP3
- 长文本（>100字）必须用 --file

### Step 4: 截帧+合成
- Playwright/Puppeteer fps=15, viewport 1080×1920
- FFmpeg concat拼接
- ASS字幕烧入（ZCOOL KuaiLe 58px, fontsdir=/tmp）
- 1.2x加速（setpts+atempo+字幕÷1.2）

### Step 5: 弹出给V
```bash
cp output.mp4 "~/Desktop/"
cmd.exe /c start "" "C:\Users\<you>\Desktop\output.mp4"
```

## 时间预估
- 调研: 2-3分钟（并行delegate）
- 工程师生产: 15-20分钟
- 总计: ~20分钟出成品

## 常见坑
- V给的模型名可能记错 → 先宽搜再深挖
- 中文社媒（小红书/抖音）无法直接API搜索 → 靠搜索引擎间接获取
- 时效性内容当天做当天交付，隔天就过气
