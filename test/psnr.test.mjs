import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePsnr, comparePsnr } from "../scripts/psnr-compare.mjs";

test("parsePsnr 解析平均值 / inf / 无法解析", () => {
  assert.equal(parsePsnr("[Parsed_psnr_0 @ 0x1] PSNR y:40.1 u:41 v:42 average:40.52 min:39 max:inf"), 40.52);
  assert.equal(parsePsnr("PSNR y:inf u:inf v:inf average:inf min:inf max:inf"), Infinity);
  assert.equal(parsePsnr("nothing here"), null);
});

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const hasFfmpeg = !spawnSync(ffmpeg, ["-version"]).error;

test("真实 ffmpeg：相同画面通过，差异大的画面低于阈值", { skip: !hasFfmpeg && "未安装 ffmpeg" }, () => {
  const d = mkdtempSync(join(tmpdir(), "psnr-"));
  const gen = (name, src) =>
    spawnSync(ffmpeg, ["-y", "-v", "error", "-f", "lavfi", "-i", src, "-frames:v", "1", join(d, name)]);
  gen("a.png", "color=c=0x336699:s=64x64");
  gen("a2.png", "color=c=0x336699:s=64x64");
  gen("b.png", "color=c=0xffffff:s=64x64");
  const same = comparePsnr(join(d, "a.png"), join(d, "a2.png"));
  assert.ok(same.pass && same.psnr === Infinity);
  const diff = comparePsnr(join(d, "a.png"), join(d, "b.png"), { threshold: 25 });
  assert.ok(!diff.pass && diff.psnr < 25);
});
