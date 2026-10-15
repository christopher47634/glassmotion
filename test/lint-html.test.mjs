import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lintHtml } from "../scripts/lint-html.mjs";

const rules = (html, o) => lintHtml(html, o).map((i) => `${i.level}:${i.rule}`);

test("Math.random / Date.now / performance.now 报错", () => {
  assert.deepEqual(rules("<script>const a=Math.random()</script>"), ["error:no-math-random"]);
  assert.ok(rules("<script>t=Date.now()</script>").includes("error:no-wall-clock"));
  assert.ok(rules("<script>t=new Date()</script>").includes("error:no-wall-clock"));
  assert.ok(rules("<script>t=performance.now()</script>").includes("error:no-wall-clock"));
});
test("animation 简写缺时长报错，带时长通过", () => {
  assert.ok(rules(".a{animation: fade ease-out forwards;}\n@keyframes fade{}").includes("error:fixed-duration"));
  assert.deepEqual(rules(".a{animation: fade 1s ease-out forwards;}\n@keyframes fade{}"), []);
  assert.ok(rules(".a{animation-duration: auto}").includes("error:fixed-duration"));
});
test("timers / raf / 无限循环 / autoplay 仅警告", () => {
  const r = lintHtml("<script>setTimeout(f,1);requestAnimationFrame(f);gsap.to(a,{repeat:-1})</script>\n<video autoplay></video>");
  assert.ok(r.length >= 4 && r.every((i) => i.level === "warn"));
});
test("外链资源默认警告，--strict 报错，a 标签不算", () => {
  const h = '<script src="https://cdn.example.com/x.js"></script>';
  assert.deepEqual(rules(h), ["warn:no-external"]);
  assert.deepEqual(rules(h, { strict: true }), ["error:no-external"]);
  assert.deepEqual(rules('<a href="https://x.com">x</a>'), []);
});
test("干净 HTML 无问题", () => {
  assert.deepEqual(rules("<div style='color:red'>hi</div><script>window.seekTo=t=>{}</script>"), []);
});
test("仓库 starter 模板无错误", () => {
  const html = readFileSync("skills/mode2-hyperframes/templates/starter.html", "utf8");
  assert.equal(lintHtml(html).filter((i) => i.level === "error").length, 0);
});
test("反例夹具必须报错", () => {
  const html = readFileSync("test/fixtures/bad.html", "utf8");
  const errs = lintHtml(html).filter((i) => i.level === "error").map((i) => i.rule);
  assert.ok(errs.includes("no-math-random") && errs.includes("no-wall-clock") && errs.includes("fixed-duration"));
});
