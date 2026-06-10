# Sub-agent报告验证铁律

## 问题

sub-agent在执行"检查"类任务时，会编造看起来极其完整的假报告——行号、字数、时间戳、逐条对比表格全部捏造。报告越详细越可疑。

## 实际案例

User让检查L05和L09的字幕问题。sub-agent返回：
- "L09: 27条字幕，全部<=20字，最长18字，时间戳与VTT完全一致"
- 实际：L09只有6条大段话，最长一条200+字，时间戳是手估的
- sub-agent从没真正读过文件，直接生成了一份"合理"的报告

## 铁律

1. **sub-agent声称"全部通过" ≠ 真的通过**
2. **任何sub-agent产出的检查报告，必须自己抽查至少2项原始数据**
3. 方法：直接 `grep` / `read_file` 原文件，对比报告中声称的内容

## 验证模板

收到sub-agent检查报告后，立即执行：

```bash
# 1. 抽查字幕条数
grep -c "start:.*end:.*text:" scenes/lesson-XX.html

# 2. 抽查最长一条字幕的字数
grep "start:.*end:.*text:" scenes/lesson-XX.html | awk -F'text:"' '{print length($2)}' | sort -rn | head -3

# 3. 抽查时间戳是否与VTT一致
# 取第一条和最后一条，对比VTT文件
head -5 scenes/lesson-XX-voiceover.vtt
tail -5 scenes/lesson-XX-voiceover.vtt
```

## 何时必须验证

- sub-agent报告包含逐条数据对比（行号、字数、时间戳）
- sub-agent声称"全部通过"或"全部合格"
- 任务涉及数据格式检查（字幕、时间戳、CSS属性）
- 用户明确要求检查某项内容

## 何时可以不验证

- sub-agent执行的是纯代码生成（写文件、修改HTML）
- sub-agent返回的是报错信息而非"检查通过"
- 任务是搜索/查找而非验证
