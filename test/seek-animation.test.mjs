import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SEEK = "skills/mode2-hyperframes/scripts/seek-animation.js";
const LIVE = "skills/mode2-hyperframes/scripts/interactive-animation.js";
// 浏览器脚本（非模块）：执行后挂在全局对象上
await import(`../${SEEK}`);
const GMSeek = globalThis.GMSeek;

const fakeEl = (dataset = {}) => ({ style: {}, dataset, textContent: "" });
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

test("seek-animation.js 不含真实时钟、定时器、无限循环", () => {
  const code = stripComments(readFileSync(SEEK, "utf8"));
  for (const bad of [/setTimeout/, /setInterval/, /requestAnimationFrame/, /performance\.now/, /Date\.now/, /new\s+Date/,
    /repeat\s*:\s*-1/, /\binfinite\b/, /addEventListener/, /Math\.random/]) {
    assert.ok(!bad.test(code), `出现了 ${bad}`);
  }
});

test("同一 t 结果一致，与调用顺序无关", () => {
  const a = fakeEl(), b = fakeEl();
  GMSeek.containerEntrance(a, 0.3, { duration: 0.6 });
  GMSeek.containerEntrance(b, 5, {});
  GMSeek.containerEntrance(b, 0.1, {});
  GMSeek.containerEntrance(b, 0.3, { duration: 0.6 });
  assert.deepEqual(a.style, b.style);
});

test("入场起止状态", () => {
  const el = fakeEl();
  GMSeek.containerEntrance(el, -1, {});
  assert.equal(el.style.opacity, "0");
  GMSeek.containerEntrance(el, 10, {});
  assert.equal(el.style.opacity, "1");
  assert.equal(el.style.filter, "none");
  assert.equal(el.style.transform, "translate(0px, 0px) scale(1) rotate(0deg)");
});

test("timeDriven 按 data-delay 计算", () => {
  const early = fakeEl({ delay: "0.2" }), late = fakeEl({ delay: "3" });
  const box = { querySelectorAll: () => [early, late] };
  GMSeek.timeDriven(box, 1.0);
  assert.equal(early.style.opacity, "1");
  assert.equal(late.style.opacity, "0");
});

test("numberCounter / textReveal / progressBar", () => {
  const n = fakeEl(), s = fakeEl(), bar = fakeEl();
  GMSeek.numberCounter(n, 95, 99, { duration: 1.5 });
  assert.equal(n.textContent, "95");
  GMSeek.textReveal(s, "你好世界", 0.1, { cps: 20 });
  assert.equal(s.textContent, "你好");
  GMSeek.progressBar(bar, 80, 0, {});
  assert.equal(bar.style.width, "0%");
});

test("sceneAt 半开区间、越界停在最后一个场景；subtitle 半开区间", () => {
  const bounds = [{ start: 0, end: 4 }, { start: 4, end: 9 }];
  assert.deepEqual(GMSeek.sceneAt(bounds, 4), { index: 1, local: 0 });
  assert.deepEqual(GMSeek.sceneAt(bounds, 20), { index: 1, local: 16 });
  const subs = [[0.1, 3.537, "一"], [3.537, 8.0, "二"]];
  assert.equal(GMSeek.subtitle(null, subs, 3.537), "二");
  assert.equal(GMSeek.subtitle(null, subs, 9), "");
});

test("GSAP 缺失时 timeline() 返回 false 而不抛错", () => {
  assert.equal(GMSeek.timeline({ seek() {} }, 1), false);
});

test("interactive-animation.js 在没有 GSAP 时优雅降级", async () => {
  const warn = console.warn;
  let warns = 0;
  console.warn = () => { warns++; };
  try {
    globalThis.addEventListener ??= () => {};
    globalThis.removeEventListener ??= () => {};
    await import(`../${LIVE}`);
    const GMLive = globalThis.GMLive;
    const el = { style: {}, addEventListener() {}, removeEventListener() {} };
    assert.equal(GMLive.containerEntrance(el), null);
    assert.equal(GMLive.progressBar(el, 50), null);
    assert.equal(typeof GMLive.mouseFollow(el), "function");
    const dispose = GMLive.responsive(el, { desktop: { color: "red" } });
    assert.equal(typeof dispose, "function");
    dispose();
    assert.equal(warns, 1, "只警告一次");
  } finally {
    console.warn = warn;
  }
});
