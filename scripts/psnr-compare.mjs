#!/usr/bin/env node
// PSNR 比对：node scripts/psnr-compare.mjs <基准.mp4|png> <新渲染.mp4|png> [--threshold 25]
// 依赖 ffmpeg（可用环境变量 FFMPEG 指定路径）。平均 PSNR >= 阈值 退出码 0，否则 1；调用出错 2。
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** 从 ffmpeg psnr 滤镜的 stderr 中解析平均 PSNR(dB)；完全一致时为 Infinity，解析失败返回 null */
export function parsePsnr(stderr) {
  const m = stderr.match(/PSNR[^\n]*?average:(inf|[\d.]+)/);
  if (!m) return null;
  return m[1] === "inf" ? Infinity : Number(m[1]);
}

export function comparePsnr(ref, test, { threshold = 25, ffmpeg = process.env.FFMPEG || "ffmpeg" } = {}) {
  const r = spawnSync(ffmpeg, ["-hide_banner", "-i", ref, "-i", test, "-lavfi", "[0:v][1:v]psnr", "-f", "null", "-"], { encoding: "utf8" });
  if (r.error) throw new Error(`无法运行 ffmpeg: ${r.error.message}`);
  const psnr = parsePsnr(r.stderr || "");
  if (psnr === null) throw new Error(`未能解析 PSNR 输出（尺寸/帧数不一致？）:\n${(r.stderr || "").slice(-600)}`);
  return { psnr, threshold, pass: psnr >= threshold };
}

function main() {
  const args = process.argv.slice(2);
  const ti = args.indexOf("--threshold");
  const threshold = ti >= 0 ? Number(args.splice(ti, 2)[1]) : 25;
  if (args.length !== 2 || !(threshold > 0)) {
    console.error("用法: node scripts/psnr-compare.mjs <基准> <新渲染> [--threshold 25]");
    process.exit(2);
  }
  try {
    const { psnr, pass } = comparePsnr(args[0], args[1], { threshold });
    console.log(`PSNR 平均 ${psnr === Infinity ? "inf" : psnr.toFixed(2)} dB，阈值 ${threshold} dB：${pass ? "通过" : "未通过"}`);
    process.exit(pass ? 0 : 1);
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
