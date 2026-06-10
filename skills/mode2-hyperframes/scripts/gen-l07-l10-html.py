#!/usr/bin/env python3
"""
⚠️ DEPRECATED (2026-06-06): This generator script is FORBIDDEN under new per-scene rules.
Retained only for reference. Do NOT run this script for new lessons.
New workflow: see references/per-scene-workflow.md — each scene must be designed from scratch.
"""
"""
批量课程HTML生成器 — 从L05模板生成L07-L10的HTML场景文件。
用法: cd ~/course-studio && python3 scripts/gen-l07-l10-html.py

模式: 定义LESSONS字典（每课的场景内容、VTT路径、BGM参数），
      脚本自动从L05模板提取CSS/字体，生成完整HTML。

场景结构: 标题场景(s0) + N个步骤场景(s1-sN)，每个步骤场景有:
  - scene-header: SVG图标 + 颜色主题 + Step编号 + 标题
  - canvas-area: 多个anim-item（card/step/hint/big/tag类型）

改编新课:
  1. 在LESSONS字典添加新课条目
  2. 定义bounds（场景时间段，从VTT语义断点推算）
  3. 定义scenes（每个场景的icon/color/step标题/content_items）
  4. 运行脚本生成HTML
"""
import re, os

BASE = os.path.expanduser("~/course-studio")

def parse_vtt(path):
    with open(path) as f:
        content = f.read()
    entries = re.findall(r'(\d+)\n([\d:,.]+)\s*-->\s*([\d:,.]+)\n(.+?)(?=\n\n|\Z)', content, re.DOTALL)
    result = []
    for _, start, end, text in entries:
        h, m, rest = start.strip().split(':')
        s, ms = rest.split(',')
        s_val = int(h)*3600 + int(m)*60 + int(s) + int(ms)/1000
        h2, m2, rest2 = end.strip().split(':')
        s2, ms2 = rest2.split(',')
        e_val = int(h2)*3600 + int(m2)*60 + int(s2) + int(ms2)/1000
        t = text.strip().replace('\n', ' ')
        result.append([round(s_val,3), round(e_val,3), t])
    return result

def gen_subs_js(subs):
    lines = ['const subtitles = [']
    for i, (s, e, t) in enumerate(subs):
        comma = ',' if i < len(subs)-1 else ''
        t_esc = t.replace('"', '\\"')
        lines.append(f'  [{s}, {e}, "{t_esc}"]{comma}')
    lines.append('];')
    return '\n'.join(lines)

def gen_bounds_js(bounds):
    lines = ['const sceneBounds = [']
    for i, (s, e) in enumerate(bounds):
        comma = ',' if i < len(bounds)-1 else ''
        lines.append(f'  {{ start: {s}, end: {e} }}{comma}')
    lines.append('];')
    return '\n'.join(lines)

# SVG icon stroke paths (Feather icons style)
ICONS = {
    'pipeline': '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    'text': '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>',
    'image': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    'mic': '<path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>',
    'scissors': '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/>',
    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
    'monitor': '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
    'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
    'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    'check': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'send': '<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    'rocket': '<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>',
    'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'globe': '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    'layers': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    'cpu': '<rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/>',
}

def make_scene(sid, header_class, icon_key, icon_color, step_num, step_title, content_items):
    """Generate a scene div with scene-header + content items"""
    icon_path = ICONS.get(icon_key, ICONS['check'])
    items_html = ""
    for item_type, text in content_items:
        if item_type == 'card':
            items_html += f'''
    <div class="glass-card anim-item" style="padding:24px 32px;margin:12px 0;">
      <div style="font-size:32px;font-weight:600;color:var(--text);">{text}</div>
    </div>'''
        elif item_type == 'step':
            items_html += f'''
    <div class="check-item anim-item" style="padding:20px 28px;margin:8px 0;">
      <div style="font-size:30px;color:var(--text);">{text}</div>
    </div>'''
        elif item_type == 'hint':
            items_html += f'''
    <div class="hint-box anim-item" style="padding:20px 28px;margin:12px 0;font-size:28px;">
      {text}
    </div>'''
        elif item_type == 'big':
            items_html += f'''
    <div class="anim-item" style="font-size:40px;font-weight:700;color:var(--text);margin:16px 0;text-align:center;">
      {text}
    </div>'''
        elif item_type == 'tag':
            items_html += f'''
    <div class="feature-tag anim-item" style="font-size:28px;">{text}</div>'''
    return f'''
  <div class="scene" id="{sid}">
    <div class="scene-header {header_class}">
      <div class="sh-icon-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="{icon_color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{icon_path}</svg>
      </div>
      <div class="sh-title"><span class="sh-num">{step_num}</span><span>{step_title}</span></div>
    </div>
    <div class="canvas-area" style="width:960px;z-index:1;">
      {items_html}
    </div>
  </div>'''

def make_title_scene(sid, module, title, subtitle, tags):
    tags_html = ''.join(f'<div class="feature-tag anim-item">{t}</div>' for t in tags)
    return f'''
  <div class="scene active" id="{sid}">
    <div style="text-align:center;padding:120px 60px 0;">
      <div class="title-module anim-item">{module}</div>
      <div class="title-main anim-item">{title}</div>
      <div class="title-desc anim-item">{subtitle}</div>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;margin-top:48px;">
        {tags_html}
      </div>
    </div>
  </div>'''

# ========== EDIT HERE FOR NEW LESSONS ==========
LESSONS = {
    '07': {
        'module': '模块 3', 'title': '做视频的全景图', 'subtitle': '五个工序，五把趁手的家伙',
        'tags': ['文案', '画面', '配音', '剪辑', '发布'],
        'bounds': [(0, 19.2), (19.2, 37.1), (37.1, 57.0), (57.0, 63.0), (63.0, 76.3), (76.3, 87.0), (87.0, 91.2)],
        'scenes': [
            ('s1', 'sh-blue', 'text', '#3B82F6', 'Step 01', '文案 — 视频的灵魂', [
                ('card', '扣子/大模型 → 口播稿'), ('step', '把想法变成能念的文案'), ('hint', '一条视频的魂，没有文案后面全白搭'),
            ]),
            ('s2', 'sh-green', 'image', '#10B981', 'Step 02', '画面 + 配音', [
                ('card', '即梦 → AI生成画面'), ('card', '剪映/即梦 → AI配音'), ('step', '缺素材用即梦一句话生成'), ('step', '不想自己念用AI克隆音色'),
            ]),
            ('s3', 'sh-red', 'scissors', '#EF4444', 'Step 03', '剪辑 + 发布', [
                ('card', '剪映 → 拼接+字幕+卡节奏'), ('step', '导出竖屏9:16 1080P'), ('step', '发抖音/视频号/B站'),
            ]),
            ('s4', 'sh-purple', 'zap', '#8B5CF6', 'Step 04', '组合拳', [
                ('big', '扣子管脑子'), ('big', '即梦管画面'), ('big', '剪映管合成'), ('hint', '它们是组合拳，不是让你三选一'),
            ]),
            ('s5', 'sh-blue', 'layers', '#3B82F6', 'Step 05', '接下来的路线', [
                ('step', '一个一个把工具吃透'), ('step', '最后第十课串成完整科普视频'), ('hint', '先把这张流水线图记在心里'),
            ]),
        ],
    },
}

# ========== GENERATE ==========
template = open(f'{BASE}/scenes/lesson-05.html').read()
body_start = template.find('<body>')
head = template[:body_start]

subtitle_hud = '''
  <div class="subtitle-bar" id="subtitleBar">
    <div class="subtitle-text" id="subtitleText"></div>
  </div>
  <div class="hud">
    <div class="hud-corner top-left">COURSE://MODULE-3</div>
    <div class="hud-corner top-right"><span class="rec-dot"></span>REC</div>
    <div class="hud-progress"><div class="hud-progress-bar" id="progressBar"></div></div>
  </div>'''

# Script block template (seekTo-driven animation)
SCRIPT_TEMPLATE = '''
<script>
{subs_js}

{bounds_js}

const totalDuration = {total_dur};

function seekTo(seconds) {{
  let sceneIdx = 0;
  for (let i = 0; i < sceneBounds.length; i++) {{
    if (seconds >= sceneBounds[i].start && seconds < sceneBounds[i].end) {{
      sceneIdx = i; break;
    }}
  }}
  gotoScene(sceneIdx);
  const elapsed = seconds - sceneBounds[sceneIdx].start;
  animateScene(sceneIdx, elapsed, true);
  updateSubtitle(seconds);
  updateProgress(seconds / totalDuration);
}}

function gotoScene(idx) {{
  document.querySelectorAll('.scene').forEach((s, i) => {{
    s.classList.toggle('active', i === idx);
  }});
}}

function getCurrentScene() {{
  const scenes = document.querySelectorAll('.scene');
  for (let i = 0; i < scenes.length; i++) {{
    if (scenes[i].classList.contains('active')) return i;
  }}
  return 0;
}}

function updateSubtitle(t) {{
  const el = document.getElementById('subtitleText');
  if (!el) return;
  let text = '';
  for (const [s, e, txt] of subtitles) {{
    if (t >= s && t < e) {{ text = txt; break; }}
  }}
  el.textContent = text;
  el.parentElement.style.opacity = text ? '1' : '0';
}}

function updateProgress(pct) {{
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = (pct * 100) + '%';
}}

const triggeredPhases = {{}};
function isTriggered(idx, phase) {{ return triggeredPhases[idx + '_' + phase] === true; }}
function markTriggered(idx, phase) {{ triggeredPhases[idx + '_' + phase] = true; }}
function needsAnim(idx, phase) {{ return !isTriggered(idx, phase); }}

function animateScene(idx, elapsed, instant) {{
  const scene = document.querySelectorAll('.scene')[idx];
  if (!scene) return;
  const items = scene.querySelectorAll('.anim-item');
  if (instant) {{
    items.forEach(item => {{
      item.style.opacity = '1';
      item.style.transform = 'translateY(0) scale(1)';
      item.style.filter = 'blur(0)';
    }});
    return;
  }}
  if (elapsed > 0.2 && needsAnim(idx, 'enter')) {{
    markTriggered(idx, 'enter');
    if (typeof gsap !== 'undefined') {{
      gsap.fromTo(scene.querySelector('.scene-header') || scene.firstElementChild,
        {{ opacity: 0, y: 30, scale: 0.97 }},
        {{ opacity: 1, y: 0, scale: 1, duration: 0.6, ease: 'power2.out' }}
      );
    }}
  }}
  if (elapsed > 1.0 && needsAnim(idx, 'stagger')) {{
    markTriggered(idx, 'stagger');
    if (typeof gsap !== 'undefined') {{
      gsap.fromTo(items,
        {{ opacity: 0, y: 20, scale: 0.95 }},
        {{ opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.15, ease: 'power2.out' }}
      );
    }}
  }}
  if (elapsed > 5 && needsAnim(idx, 'breathe')) {{
    markTriggered(idx, 'breathe');
    items.forEach(item => {{
      item.style.opacity = '1';
      item.style.transform = 'translateY(0) scale(1)';
    }});
  }}
}}

window.seekTo = seekTo;
window.gotoScene = gotoScene;
window.updateSubtitle = updateSubtitle;
window.updateProgress = updateProgress;
window.getCurrentScene = getCurrentScene;
</script>'''

for lid, info in LESSONS.items():
    vtt_path = f'{BASE}/scenes/lesson-{lid}-voiceover-v2.vtt'
    subs = parse_vtt(vtt_path)
    total_dur = round(subs[-1][1] + 1, 2)
    title_html = make_title_scene('s0', info['module'], info['title'], info['subtitle'], info['tags'])
    scenes_html = title_html
    for sid, hclass, icon, color, step, title, items in info['scenes']:
        scenes_html += make_scene(sid, hclass, icon, color, step, title, items)
    subs_js = gen_subs_js(subs)
    bounds_js = gen_bounds_js(info['bounds'])
    script_block = SCRIPT_TEMPLATE.format(subs_js=subs_js, bounds_js=bounds_js, total_dur=total_dur)
    html = head + '\n<body>\n' + scenes_html + '\n' + subtitle_hud + '\n' + script_block + '\n</body>\n</html>'
    out_path = f'{BASE}/scenes/lesson-{lid}.html'
    with open(out_path, 'w') as f:
        f.write(html)
    print(f"L{lid}: {len(subs)} subs, {total_dur}s, {len(info.get('scenes',[]))+1} scenes, {len(html)} chars → {out_path}")

print("\nDone. Now run capture scripts.")
