import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const SKILL = "skills/mode2-hyperframes";
const read = (p) => readFileSync(p, "utf8");

test("references/ 每个文件都登记在 INDEX.md", () => {
  const index = read(`${SKILL}/references/INDEX.md`);
  const files = readdirSync(`${SKILL}/references`).filter((f) => f.endsWith(".md") && f !== "INDEX.md");
  const missing = files.filter((f) => !index.includes(`references/${f}`));
  assert.deepEqual(missing, []);
});

test("SKILL.md 与 INDEX.md 引用的文件都存在", () => {
  for (const doc of [`${SKILL}/SKILL.md`, `${SKILL}/references/INDEX.md`]) {
    const refs = [...read(doc).matchAll(/((?:references|scripts|templates|demo)\/[\w.-]+\.(?:md|js|py|sh|html))/g)].map((m) => m[1]);
    assert.ok(refs.length > 0, doc);
    const broken = [...new Set(refs)].filter((r) => !existsSync(join(SKILL, r)));
    assert.deepEqual(broken, [], `${doc} 引用了不存在的文件`);
  }
});

test("文档不再推荐 Puppeteer，也不含私人路径", () => {
  const files = [`${SKILL}/SKILL.md`, "README.md", ...readdirSync(`${SKILL}/references`).map((f) => `${SKILL}/references/${f}`)];
  for (const f of files) {
    const text = read(f);
    assert.ok(!/puppeteer/i.test(text), `${f} 仍提到 Puppeteer（截帧后端已统一为 Playwright）`);
    assert.ok(!/chris47634|\/mnt\/c\/Users\/\d+|E:\\\\Fonts/.test(text), `${f} 含私人路径`);
  }
});

test("install.sh 不交互、拒绝未知参数、从本地 checkout 复制 skill", { skip: spawnSync("bash", ["--version"]).status !== 0 }, () => {
  const src = read("install.sh");
  assert.ok(!/\bread\s+-p\b/.test(src), "install.sh 不能有 read -p（管道执行会吞掉脚本）");
  assert.ok(!/api\.github\.com|raw\.githubusercontent\.com\/[^ ]*\/main\//.test(src), "install.sh 不能从 main 分支逐个下载文件");

  const bad = spawnSync("bash", ["install.sh", "--bogus"], { encoding: "utf8", stdin: "ignore" });
  assert.notEqual(bad.status, 0);

  const dest = mkdtempSync(join(tmpdir(), "gm-install-"));
  try {
    const r = spawnSync("bash", ["install.sh", "--dest", dest], { encoding: "utf8", stdin: "ignore" });
    assert.equal(r.status, 0, r.stderr);
    for (const s of ["mode2-hyperframes", "popular-science-video-style", "macos-claude-ui"]) {
      assert.ok(existsSync(join(dest, s, "SKILL.md")), s);
    }
    assert.ok(existsSync(join(dest, "mode2-hyperframes", "references", "seekto-runtime.md")), "references 应完整复制");
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
});
