#!/usr/bin/env node
// 渲染前 HTML 确定性 lint：逐帧截图要求同一时间点画面永远一致。
// 用法：node scripts/lint-html.mjs [--strict] <file.html|目录> ...
//   --strict  外链资源也按错误处理（默认只警告，因为模板允许 CDN 引入 GSAP）
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * @param {string} html
 * @param {{strict?:boolean}} [opts]
 * @returns {{level:"error"|"warn",rule:string,line:number,msg:string}[]}
 */
export function lintHtml(html, { strict = false } = {}) {
  const issues = [];
  const lines = html.split("\n");
  const add = (level, rule, line, msg) => issues.push({ level, rule, line, msg });

  lines.forEach((text, i) => {
    const n = i + 1;
    if (/Math\.random\s*\(/.test(text)) add("error", "no-math-random", n, "Math.random() 每次渲染结果不同，请改用固定种子/预置数组");
    if (/Date\.now\s*\(|new\s+Date\s*\(|performance\.now\s*\(/.test(text)) add("error", "no-wall-clock", n, "使用墙钟时间（Date/performance.now）会让逐帧截图不可复现，请用 seekTo(t) 驱动");
    if (/\b(setInterval|setTimeout)\s*\(/.test(text)) add("warn", "no-timers", n, "setTimeout/setInterval 依赖真实时间，截帧时可能错位");
    if (/requestAnimationFrame\s*\(/.test(text)) add("warn", "no-raf", n, "requestAnimationFrame 依赖真实时间，建议时间轴由 seekTo 驱动");
    if (/repeat\s*:\s*-1/.test(text)) add("warn", "infinite-gsap", n, "GSAP repeat:-1 无限循环，时长不固定");
    if (/\banimation-iteration-count\s*:\s*infinite|\binfinite\b(?=[^;]*;)/.test(text) && /animation/.test(text))
      add("warn", "infinite-css", n, "CSS 无限循环动画，时长不固定（背景光球等装饰可忽略）");
    if (/animation-duration\s*:\s*auto/.test(text)) add("error", "fixed-duration", n, "animation-duration 不能为 auto");
    const m = text.match(/(?<![\w-])animation\s*:\s*([^;}]+)/);
    if (m && !/\d*\.?\d+m?s\b/.test(m[1]) && !/var\(/.test(m[1])) add("error", "fixed-duration", n, `animation 简写未指定时长：${m[1].trim()}`);
    if (/<(video|audio)\b[^>]*\bautoplay\b/i.test(text)) add("warn", "no-autoplay", n, "媒体 autoplay 在截帧时不可控");
    const ext = text.match(/(?:src|href)\s*=\s*["'](?:https?:)?\/\/[^"']+["']|url\(\s*["']?(?:https?:)?\/\/[^)"']+/i);
    if (ext && !/<a\s/i.test(text)) add(strict ? "error" : "warn", "no-external", n, `外链资源 ${ext[0].slice(0, 80)}，渲染会受网络影响，建议本地化`);
  });

  // 内联 style 中的 animation: 属性在 <style> 之外已被逐行覆盖；这里补充 @keyframes 为空的检测
  if (/animation\s*:/.test(html) && !/@keyframes/.test(html) && !/<script[^>]*gsap/i.test(html))
    add("warn", "missing-keyframes", 1, "使用了 animation 但未找到 @keyframes");
  return issues;
}

function collect(p, out = []) {
  const s = statSync(p);
  if (s.isDirectory()) {
    for (const f of readdirSync(p)) if (f !== "node_modules" && f !== ".git") collect(join(p, f), out);
  } else if (/\.html?$/i.test(p)) out.push(p);
  return out;
}

function main() {
  const args = process.argv.slice(2);
  const strict = args.includes("--strict");
  const targets = args.filter((a) => !a.startsWith("--"));
  if (!targets.length) {
    console.error("用法: node scripts/lint-html.mjs [--strict] <file.html|目录> ...");
    process.exit(2);
  }
  const files = targets.flatMap((t) => collect(resolve(t)));
  let errors = 0, warns = 0;
  for (const f of files) {
    for (const i of lintHtml(readFileSync(f, "utf8"), { strict })) {
      console.log(`${i.level === "error" ? "ERROR" : "WARN "} ${f}:${i.line} [${i.rule}] ${i.msg}`);
      i.level === "error" ? errors++ : warns++;
    }
  }
  console.log(`lint 完成：${files.length} 个文件，${errors} 个错误，${warns} 个警告`);
  process.exit(errors ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
