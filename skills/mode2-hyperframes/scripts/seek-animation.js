/**
 * GlassMotion 逐帧动画库（seekTo 专用，可用于出片）
 *
 * 规则：这里的每个函数都是「时间 t 的纯函数」——给定同一个 t，DOM 状态永远一样，
 * 与调用次数、调用顺序、截图快慢无关。因此本文件里：
 *   - 不使用任何定时器、逐帧回调或墙钟时间；
 *   - 不创建无限循环动画；周期性效果（脉冲、呼吸）直接用 sin(t) 算；
 *   - 不依赖 GSAP。页面加载了 GSAP 时，GMSeek.timeline() 可以把「暂停的」GSAP 时间线
 *     精确 seek 到 t；没加载时它只返回 false，不抛错。
 *
 * 需要鼠标、滚动、实时播放效果的页面（浏览器预览、演示页）请用 interactive-animation.js，
 * 那些效果不能出现在要逐帧截图的场景里。
 *
 * 用法（场景 HTML 里）：
 *   <script src="seek-animation.js"></script>
 *   <script>
 *     window.seekTo = function (t) {
 *       const { index, local } = GMSeek.sceneAt(SCENE_BOUNDS, t);
 *       GMSeek.showScene(document.querySelectorAll('.scene'), index);
 *       GMSeek.timeDriven(document.getElementById('s' + index), local);
 *       GMSeek.subtitle(document.getElementById('sub'), SUBTITLES, t);
 *     };
 *   </script>
 */
(function (root) {
  'use strict';

  // ── 数学工具 ──────────────────────────────────────────────────────────
  const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
  const lerp = (a, b, p) => a + (b - a) * p;

  /** 缓动函数：输入 0..1，输出 0..1（back/elastic 会短暂越界，属正常）。 */
  const ease = {
    linear: (p) => p,
    power2Out: (p) => 1 - Math.pow(1 - p, 2),
    power3Out: (p) => 1 - Math.pow(1 - p, 3),
    power4Out: (p) => 1 - Math.pow(1 - p, 4),
    sineInOut: (p) => -(Math.cos(Math.PI * p) - 1) / 2,
    sineOut: (p) => Math.sin((p * Math.PI) / 2),
    circOut: (p) => Math.sqrt(1 - Math.pow(p - 1, 2)),
    quadInOut: (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    backOut: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
    elasticOut: (p) =>
      p === 0 || p === 1 ? p : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  };

  function resolveEase(e) {
    if (typeof e === 'function') return e;
    return ease[e] || ease.power3Out;
  }

  /** 从 start 开始、持续 duration 秒的动画在时刻 t 的线性进度（0..1）。 */
  function progress(t, start, duration) {
    if (duration <= 0) return t >= start ? 1 : 0;
    return clamp01((t - start) / duration);
  }

  function toEl(target) {
    if (!target) return null;
    return typeof target === 'string' ? document.querySelector(target) : target;
  }

  function toList(target) {
    if (!target) return [];
    if (typeof target === 'string') return Array.from(document.querySelectorAll(target));
    if (target.length !== undefined) return Array.from(target);
    return [target];
  }

  /**
   * 把 from→to 两组视觉属性按进度 p（已缓动）插值后写到元素上。
   * 支持：opacity, x, y（px）, scale, rotation（deg）, blur（px）。
   */
  function applyState(el, from, to, p) {
    if (!el) return;
    const v = (k, d) => lerp(from[k] !== undefined ? from[k] : d, to[k] !== undefined ? to[k] : d, p);
    const opacity = v('opacity', 1);
    const x = v('x', 0);
    const y = v('y', 0);
    const scale = v('scale', 1);
    const rotation = v('rotation', 0);
    const blur = Math.max(0, v('blur', 0));
    el.style.opacity = String(clamp01(opacity));
    el.style.transform = `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`;
    el.style.filter = blur > 0.01 ? `blur(${blur}px)` : 'none';
  }

  // ── 入场类 ────────────────────────────────────────────────────────────

  /** 容器入场（位移 + 缩放 + 模糊 + 透明度），t 为场景内时间。 */
  function containerEntrance(target, t, opts = {}) {
    const { start = 0, duration = 0.6, easing = 'power3Out', y = 40, x = 0, scale = 0.95, blur = 10 } = opts;
    const p = resolveEase(easing)(progress(t, start, duration));
    applyState(toEl(target), { opacity: 0, x, y, scale, blur }, { opacity: 1 }, p);
  }

  /** 子元素交错入场：第 i 个元素从 start + i * stagger 开始。 */
  function staggerEntrance(targets, t, opts = {}) {
    const { start = 0, stagger = 0.1, duration = 0.4, easing = 'power2Out', y = 30, x = 0, scale = 1, blur = 0 } = opts;
    const fn = resolveEase(easing);
    toList(targets).forEach((el, i) => {
      const p = fn(progress(t, start + i * stagger, duration));
      applyState(el, { opacity: 0, x, y, scale, blur }, { opacity: 1 }, p);
    });
  }

  /**
   * 多阶段入场：stages = [{ target, start, duration, from, to, easing }]
   * 各阶段独立按 t 计算，互不依赖。
   */
  function multiStage(stages, t) {
    stages.forEach((s) => {
      const p = resolveEase(s.easing)(progress(t, s.start || 0, s.duration === undefined ? 0.6 : s.duration));
      toList(s.target).forEach((el) => applyState(el, s.from || { opacity: 0, y: 30 }, s.to || { opacity: 1 }, p));
    });
  }

  /**
   * data-delay 驱动：容器内所有 [data-delay] 元素按 elapsed 计算状态。
   * data-animation 可选：fadeInUp（默认）/ scaleIn / blurIn / slideLeft / fade
   * data-duration 可选：单个元素的过渡时长（默认 opts.duration = 0.4s）
   */
  const PRESETS = {
    fadeInUp: { from: { opacity: 0, y: 30, scale: 0.9 }, easing: 'quadInOut' },
    scaleIn: { from: { opacity: 0, scale: 0.8 }, easing: 'backOut' },
    blurIn: { from: { opacity: 0, blur: 10 }, easing: 'power2Out' },
    slideLeft: { from: { opacity: 0, x: -30 }, easing: 'power3Out' },
    fade: { from: { opacity: 0 }, easing: 'linear' },
  };

  function timeDriven(container, elapsed, opts = {}) {
    const box = toEl(container);
    if (!box) return;
    const defDur = opts.duration === undefined ? 0.4 : opts.duration;
    box.querySelectorAll('[data-delay]').forEach((el) => {
      const preset = PRESETS[el.dataset.animation] || PRESETS.fadeInUp;
      const delay = parseFloat(el.dataset.delay) || 0;
      const dur = el.dataset.duration !== undefined ? parseFloat(el.dataset.duration) : defDur;
      const p = resolveEase(preset.easing)(progress(elapsed, delay, dur));
      applyState(el, preset.from, { opacity: 1 }, p);
    });
  }

  // ── 文本与数据 ────────────────────────────────────────────────────────

  /** 打字机：从 start 起每秒 cps 个字符。 */
  function textReveal(target, text, t, opts = {}) {
    const el = toEl(target);
    if (!el) return;
    const { start = 0, cps = 20 } = opts;
    const chars = Array.from(text);
    const n = Math.max(0, Math.min(chars.length, Math.floor((t - start) * cps)));
    el.textContent = chars.slice(0, n).join('');
  }

  /** 光标闪烁：返回该时刻光标是否可见（周期 period 秒）。 */
  function cursorVisible(t, period = 0.7) {
    return Math.floor(t / (period / 2)) % 2 === 0;
  }

  /** 数字滚动：从 from 滚到 to。format(value) 决定显示文本。 */
  function numberCounter(target, to, t, opts = {}) {
    const el = toEl(target);
    if (!el) return;
    const { start = 0, duration = 1.5, from = 0, easing = 'power3Out', format = (v) => String(Math.round(v)) } = opts;
    el.textContent = format(lerp(from, to, resolveEase(easing)(progress(t, start, duration))));
  }

  /** 进度条填充到 percentage（0..100）。 */
  function progressBar(target, percentage, t, opts = {}) {
    const el = toEl(target);
    if (!el) return;
    const { start = 0, duration = 1, easing = 'power2Out' } = opts;
    el.style.width = `${percentage * resolveEase(easing)(progress(t, start, duration))}%`;
  }

  // ── 周期性环境效果（用 sin(t) 计算，不用无限循环动画） ──────────────

  /** 光晕脉冲：box-shadow 半径在 0..blur 之间按周期 period 起伏。 */
  function glowPulse(target, t, opts = {}) {
    const el = toEl(target);
    if (!el) return;
    const { color = 'rgba(8,145,178,0.3)', period = 2, blur = 20 } = opts;
    const k = (1 - Math.cos((2 * Math.PI * t) / period)) / 2;
    el.style.boxShadow = `0 0 ${(blur * k).toFixed(2)}px ${color}`;
  }

  /** 呼吸：scale 在 1..1+amount 之间按周期起伏。 */
  function breathe(target, t, opts = {}) {
    const el = toEl(target);
    if (!el) return;
    const { period = 4, amount = 0.015 } = opts;
    const k = (1 - Math.cos((2 * Math.PI * t) / period)) / 2;
    el.style.transform = `scale(${1 + amount * k})`;
  }

  // ── 场景与字幕 ────────────────────────────────────────────────────────

  /**
   * bounds = [{start, end}, ...]（来自 VTT 断点）。返回 { index, local }。
   * 区间半开 [start, end)；超出最后一个场景时停在最后一个场景。
   */
  function sceneAt(bounds, t) {
    let index = bounds.length - 1;
    for (let i = 0; i < bounds.length; i++) {
      if (t >= bounds[i].start && t < bounds[i].end) { index = i; break; }
    }
    if (index < 0) return { index: 0, local: t };
    return { index, local: t - bounds[index].start };
  }

  /** 场景即时切换：直接写 display/opacity，不用过渡（CSS transition 会截到半透明帧）。 */
  function showScene(scenes, index, display = 'flex') {
    toList(scenes).forEach((s, i) => {
      const on = i === index;
      s.style.transition = 'none';
      s.style.display = on ? display : 'none';
      s.style.opacity = on ? '1' : '0';
    });
  }

  /**
   * 字幕：subs = [[start, end, text], ...] 或 [{start, end, text}, ...]，半开区间匹配。
   * 返回当前文本（无字幕为 ''）。
   */
  function subtitle(target, subs, t) {
    let text = '';
    for (const s of subs || []) {
      const a = Array.isArray(s) ? s[0] : s.start;
      const b = Array.isArray(s) ? s[1] : s.end;
      if (t >= a && t < b) { text = Array.isArray(s) ? s[2] : s.text; break; }
    }
    const el = toEl(target);
    if (el) {
      el.textContent = text;
      el.style.transition = 'none';
      el.style.opacity = text ? '1' : '0';
    }
    return text;
  }

  // ── 可选 GSAP 桥接 ────────────────────────────────────────────────────

  /**
   * 把一条「paused: true」的 GSAP 时间线精确定位到 t（秒）。
   * GSAP 未加载或 tl 无效时返回 false，不抛错。
   */
  function timeline(tl, t) {
    if (typeof root.gsap === 'undefined' || !tl || typeof tl.seek !== 'function') return false;
    if (typeof tl.paused === 'function' && !tl.paused()) tl.pause();
    tl.seek(t, false);
    return true;
  }

  const GMSeek = {
    ease, clamp01, lerp, progress, applyState,
    containerEntrance, staggerEntrance, multiStage, timeDriven,
    textReveal, cursorVisible, numberCounter, progressBar,
    glowPulse, breathe,
    sceneAt, showScene, subtitle,
    timeline,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GMSeek;
  root.GMSeek = GMSeek;
})(typeof window !== 'undefined' ? window : globalThis);
