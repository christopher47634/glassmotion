# MiniMax T2A API（Text-to-Audio）

## API 端点

```
POST https://api.minimaxi.com/v1/t2a_v2
```

## 认证

```
Authorization: Bearer <API_KEY>
```

Key 存储位置：`~/.minimax_key`（<key-length> bytes，UTF-8）

**Key 获取流程**（WSL 环境）：
1. 用户在 PowerShell 中运行 `echo '<your-api-key>' > ~/.minimax_key`
2. PowerShell 写入 `C:\tmp\.minimax_key`（UTF-16LE + BOM）
3. WSL 中转换：
```bash
iconv -f UTF-16LE -t UTF-8 /mnt/c~/.minimax_key | sed '1s/^\xEF\xBB\xBF//' > ~/.minimax_key
```
4. 验证：`wc -c ~/.minimax_key` 应为 <key-length> bytes

## 请求格式

```json
{
    "model": "speech-2.8-hd",
    "text": "要合成的文本",
    "voice_setting": {
        "voice_id": "your_voice_id",
        "speed": 1.0,
        "vol": 1.0,
        "pitch": 0
    },
    "audio_setting": {
        "sample_rate": 32000,
        "bitrate": 128000,
        "format": "mp3"
    },
    "subtitle_enable": true
}
```

## 音色列表

已测试可用：
- `your_voice_id`（青年大学生）— User 选定，适合"AI上大学"课程
- 其他音色待探索

## 响应格式

```json
{
    "trace_id": "...",
    "base_resp": {
        "status_code": 0,
        "status_msg": "success"
    },
    "data": {
        "audio": "hex_encoded_mp3_bytes",
        "audio_len": 12345,
        "subtitle": [...]  // subtitle_enable=true 时返回
    },
    "usage": {
        "characters": 100,
        "duration": 13.2
    }
}
```

## 解码音频

返回的 `audio` 字段是 hex 编码的 MP3 数据：

```python
import binascii
audio_hex = response['data']['audio']
audio_bytes = binascii.unhexlify(audio_hex)
with open('output.mp3', 'wb') as f:
    f.write(audio_bytes)
```

## 定价

按 `usage.characters` 计费（字符数）。免费额度用完后返回 status_code=2056（用量超限）。

## 常见错误

| status_code | 含义 | 解决 |
|------------|------|------|
| 0 | 成功 | - |
| 1008 | 余额不足 | 换 key 或充值 |
| 2056 | 用量超限 | 换 key 或等额度重置 |

## 完整 bash 示例

```bash
API_KEY=$(cat ~/.minimax_key)

curl -s https://api.minimaxi.com/v1/t2a_v2 \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "speech-2.8-hd",
    "text": "恭喜你考上大学！我是你的AI助手小宋。",
    "voice_setting": {
      "voice_id": "your_voice_id",
      "speed": 1.0
    },
    "audio_setting": {
      "sample_rate": 32000,
      "bitrate": 128000,
      "format": "mp3"
    },
    "subtitle_enable": true
  }' | python3 -c "
import sys, json, binascii
resp = json.load(sys.stdin)
if resp['base_resp']['status_code'] != 0:
    print(f'Error: {resp[\"base_resp\"]}')
    sys.exit(1)
audio = binascii.unhexlify(resp['data']['audio'])
with open('output.mp3', 'wb') as f:
    f.write(audio)
print(f'Saved {len(audio)} bytes, duration: {resp[\"usage\"][\"duration\"]}s')
"
```

## ⚠️ subtitle_enable 字段

设为 `true` 时 API 返回字幕时间戳，但实测 **未返回**（data.subtitle 为空）。字幕仍需单独从 VTT 生成。

## ⚠️ API Key 安全

- Key 不要通过聊天传递——安全层会截断
- 存储在 `~/.minimax_key`
- 验证长度：<key-length> bytes（少了就是被截断了）

## ⚠️ 与 edge-tts 的对比

| 维度 | edge-tts | MiniMax T2A |
|------|----------|-------------|
| 质量 | 机械感强，User 嫌"难听" | 自然，User 确认满意 |
| 中文音色 | YunxiNeural（还行） | your_voice_id（优秀） |
| 费用 | 免费 | 按字符计费 |
| 速度 | 快（本地流式） | 中等（API 调用） |
| 字幕 | --write-subtitles 直接生成 | subtitle_enable 未返回 |
| 适用 | 快速原型、预览 | 最终交付版本 |
