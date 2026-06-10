# 动画-语音同步：场景时长必须严格匹配 VTT

## 核心原则

**音频是唯一时间基准。** 场景 HTML 动画的时长必须严格匹配 VTT 中的实际 TTS 时间戳。不能用脚本标注的目标时长。

## 真实事故

截帧脚本 `capture_animated.js` 中场景 dur 硬编码值与 VTT 不符：

| 场景 | 脚本标注 | VTT 实际 | 差距 |
|------|---------|---------|------|
| S4 | 5s | 15.5s | 差 10s |
| S5 | 11s | 48.1s | 差 37s |
| S6 | 3s | 9.6s | 差 6.6s |
| S7 | 8s | 19.1s | 差 11s |
| S8 | 5s | 44.3s | 差 39s |

结果：动画在第 56 秒就播完了，但音频持续 192 秒。用户说"动画和语音都没有对齐"。

## 修复方案

### 1. 从 VTT 读取实际时间戳

```python
# 从 VTT 解析每段的 start/end
# 每个场景对应 VTT 中的一段（或多段）
scenes_vtt_mapping = [
    {"id": "S0", "vtt_lines": [0]},      # 第0条字幕 → S0
    {"id": "S1", "vtt_lines": [1]},      # 第1条字幕 → S1
    {"id": "S2", "vtt_lines": [2, 3]},   # 第2-3条字幕 → S2
    # ...
]
```

### 2. 用 VTT 时间戳计算场景 dur

```javascript
// ❌ 错误：硬编码
const SCENES = [
    { file: 's0-intro.html', dur: 5 },
    { file: 's4-howto.html', dur: 5 },    // ← 但 VTT 显示 15.5s
];

// ✅ 正确：从 VTT 计算
const SCENES = [
    { file: 's0-intro.html', start: 0, end: 4 },       // VTT: 0-4s
    { file: 's4-howto.html', start: 56.3, end: 71.7 }, // VTT: 56.3-71.7s
];
// dur = end - start
```

### 3. hold frame 策略（动画比音频短时）

如果 HTML 动画实际时长 < VTT 场景时长（常见于长段落），需要：

1. **前 N 帧正常截取动画**（GSAP 动画播放中）
2. **剩余帧截取最终静止状态**（hold frame）

```javascript
// 方案 A：expand timeline（推荐）
// 截帧时按动画实际 FPS 截取，不足的帧用最后一帧填充
for (let i = 0; i < total_frames_for_scene; i++) {
    await page.evaluate((t) => gsap.globalTimeline.time(t), time_for_frame_i);
    await page.screenshot({ path: `frame_${i}.png` });
}

// 方案 B：直接跳到目标时间点
for (let i = 0; i < total_frames; i++) {
    const time = scene_start + (i / fps);
    await page.evaluate((t) => gsap.globalTimeline.time(t), time);
    await page.screenshot({ path: `frame_${i}.png` });
}
```

### 4. GSAP globalTimeline 控制

GSAP 的 `gsap.globalTimeline.time(t)` 可以精确跳到任意时间点。这是逐帧渲染的基础：

```javascript
// 暂停全局时间线（不要让它自动播放）
gsap.globalTimeline.pause();

// 逐帧推进
for (let frame = 0; frame < totalFrames; frame++) {
    const time = frame / fps;  // fps=30
    gsap.globalTimeline.time(time);
    // 截帧...
}
```

## 截帧脚本验证清单

生成 `capture_animated.js` 后必须检查：
1. 每个场景的 `dur` 是否等于 VTT 中对应段的 `end - start`
2. 总时长是否等于音频总时长
3. 第一帧和最后一帧是否分别对应 VTT 的 start 和 end
4. 用 `fps=3` 快速截取后检查：连续帧 MD5 不同 = 动画在动，相同 = 冻结

## 视频动画验证方法

**每秒截 3 帧（fps=3）后 MD5 对比**：
- 连续帧 MD5 不同 = 动画生效 ✅
- 连续帧 MD5 相同 = 冻结 ❌
- 不能只截 1 帧判断（可能刚好在静止帧上）
