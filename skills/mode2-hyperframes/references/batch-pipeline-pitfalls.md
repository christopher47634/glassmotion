# ⚠️ 后台管线脚本输出缓冲陷阱（技术细节仍有效，批量流程已废弃）

> **2026-06-06 注意**：此文件中的"统一 per-lesson 管线脚本模式"描述的是批量流程，已废弃。
> 新工序见 `references/per-scene-workflow.md`。
> stdout 缓冲陷阱、并行会话冲突等技术细节仍适用于单课单场景的 terminal 调用。

---

当用 `terminal(background=true, notify_on_complete=True)` 跑批量管线 Python 脚本时，`bash -lic` 包装层会缓冲所有 stdout。即使 Python 代码里每个 `print(..., flush=True)` 也不够——输出仍不会实时出现在 `process(log)` 中。

**解决方案**：启动命令必须加 `PYTHONUNBUFFERED=1` 和 `python3 -u`：

```bash
cd ~/course-studio && PYTHONUNBUFFERED=1 python3 -u scripts/run-pipeline-l05-l14.py 2>&1
```

**验证**：启动后 30 秒内 `process(log)` 应看到输出。如果 60 秒后仍无输出，说明缓冲层在起作用。

**监控帧进度的替代方法**：即使没有日志输出，可以通过检查帧目录来判断管线是否在运行：

```bash
ls ~/course-studio/frames-l05/ 2>/dev/null | wc -l
```

帧数在增长 = 管线正常运行，只是 stdout 被缓冲了。

# ⚠️ 并行 Hermes 会话冲突

当多个 Hermes 会话（cron job、另一个 gateway 实例）同时操作同一个项目目录时，会互相干扰：

- 会话 A 在截帧 L09，会话 B 也在截帧 L09 → 帧目录混乱
- 会话 B 的 chromium 进程和会话 A 的 chromium 端口冲突
- 干扰进程不断重启（由另一个 cron job 触发），kill 后几秒又出现

**表现**：帧目录里突然出现不属于当前管线的帧文件（时间戳不匹配），或 `frames-l09/` 被另一个进程清空又重建。

**识别干扰进程**：

```bash
ps aux | grep -E "capture-batch|capture-one|capture-l11" | grep -v grep
# 干扰进程通常来自 hermes-snap-XXXXX.sh 包装
```

**防御策略**：

1. **每个 lesson 开始 capture 前 `shutil.rmtree(frames_dir)` 清空重建**——这能抵消外部进程的干扰
2. **在管线脚本中不做并发 capture**——串行处理每个 lesson，避免自身 chromium 实例冲突
3. **如果干扰持续**：kill 干扰进程后立即启动当前 lesson 的 capture，利用时间差在干扰进程重启前完成

```bash
# Kill 干扰进程
ps aux | grep -E "capture-batch|capture-one" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
rm -rf ~/course-studio/frames-l09 2>/dev/null
rm -f /tmp/capture-batch.py /tmp/capture-one.py 2>/dev/null
```

# 统一 per-lesson 管线脚本模式

当需要对每个 lesson 执行相同的 8 步流程时，用单个 Python 脚本串行处理所有 lesson：

```python
LESSONS = ['05', '06', '07', '08', '09', '10', '11', '12', '13', '14']

for lid in LESSONS:
    # Step 1: Verify files (HTML, VTT, MP3)
    # Step 2: Extract <script>, validate with node --check
    # Step 3: Parse VTT → subtitles + duration
    # Step 4: Playwright capture (shared browser instance across lessons)
    # Step 5: Mix BGM if bgm-lXX.mp3 exists
    # Step 6: FFmpeg NVENC encode
    # Step 7: Copy to ~/Downloads/
    # Step 8: Clean up frames directory
```

**关键设计决策**：

- **共享浏览器实例**：`with sync_playwright() as p: browser = ...` 在循环外层，每课开新 page 但复用 browser，避免反复启动 chromium（每次 ~5s）
- **每课结束后清理帧目录**：`shutil.rmtree(frames_dir)` 释放磁盘空间并防止下次冲突
- **错误不中断**：try/except 包裹每课，失败记录 error 继续下一课
- **最终汇总报告**：列出每课状态（OK/FAILED）+ 文件大小

**执行方式**：

```bash
cd ~/course-studio && PYTHONUNBUFFERED=1 python3 -u scripts/run-pipeline-l05-l14.py 2>&1
# 用 terminal(background=true, notify_on_complete=True) 跑
```

**性能参考**（L05-L14 共 10 课）：

| 阶段 | 每课耗时 | 说明 |
|------|---------|------|
| 文件验证 + JS 检查 | <1s | |
| VTT 解析 | <1s | |
| Playwright 截帧 | 2-4 min | 取决于 TTS 时长（~8 fps capture rate） |
| BGM 混音 | 5-15s | |
| NVENC 编码 | 5-15s | 比 CPU 快 5-10x |
| 复制 + 清理 | <5s | |
| **总计每课** | **2-4.5 min** | |
| **10 课总计** | **25-45 min** | |
