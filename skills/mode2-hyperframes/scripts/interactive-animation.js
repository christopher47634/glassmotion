/**
 * GlassMotion 交互 / 实时动画库（仅用于浏览器预览、演示页，不能用于逐帧出片）
 *
 * 这里的效果跟真实时钟或用户输入走（GSAP tween、定时器、鼠标、滚动、窗口尺寸），
 * 逐帧截图时结果取决于截图速度，不可复现。要出片的场景请用 seek-animation.js（GMSeek）。
 *
 * - GSAP 未加载时：所有依赖 GSAP 的方法只打印一次警告并直接返回 null，不抛错；
 *   numberCounter / textRevealCharByChar / loading 不依赖 GSAP，照常工作。
 * - 所有注册了事件监听的方法都返回 dispose() 用于解绑（resize、mousemove 等）。
 */
(function (root) {
  'use strict';

  let warned = false;
  function hasGsap() {
    if (typeof root.gsap !== 'undefined') return true;
    if (!warned) {
      warned = true;
      console.warn('[GMLive] GSAP 未加载：依赖 GSAP 的动画已跳过（页面其余功能不受影响）');
    }
    return false;
  }

  const toEl = (t) => (typeof t === 'string' ? document.querySelector(t) : t);
  const toList = (t) => {
    if (!t) return [];
    if (typeof t === 'string') return Array.from(document.querySelectorAll(t));
    return t.length !== undefined ? Array.from(t) : [t];
  };

  function listen(target, type, fn, opts) {
    target.addEventListener(type, fn, opts);
    return () => target.removeEventListener(type, fn, opts);
  }

  const GMLive = {
    config: { duration: 0.6, ease: 'power3.out', stagger: 0.1, blur: 10, scale: 0.95 },

    /** 容器入场（位移 + 缩放 + 模糊 + 透明度） */
    containerEntrance(selector, options = {}) {
      const el = toEl(selector);
      if (!el || !hasGsap()) return null;
      const c = this.config;
      const { duration = c.duration, ease = c.ease, delay = 0, y = 40, x = 0, scale = c.scale, blur = c.blur } = options;
      return root.gsap.fromTo(el,
        { opacity: 0, y, x, scale, filter: `blur(${blur}px)` },
        { opacity: 1, y: 0, x: 0, scale: 1, filter: 'blur(0px)', duration, ease, delay });
    },

    /** 子元素交错入场 */
    staggerEntrance(selector, options = {}) {
      const els = toList(selector);
      if (!els.length || !hasGsap()) return null;
      const { duration = 0.4, ease = 'power2.out', stagger = this.config.stagger, y = 30, x = 0, from = 'start' } = options;
      return root.gsap.fromTo(els, { opacity: 0, y, x }, { opacity: 1, y: 0, x: 0, duration, ease, stagger: { each: stagger, from } });
    },

    /** 序列动画：[{ target, from, to, duration, ease, position }] */
    sequence(steps) {
      if (!hasGsap()) return null;
      const tl = root.gsap.timeline();
      steps.forEach((s, i) => {
        const els = toList(s.target);
        if (!els.length) return;
        tl.fromTo(els, s.from || {}, { duration: 0.6, ease: 'power3.out', ...(s.to || {}) },
          s.position !== undefined ? s.position : i === 0 ? 0 : '-=0.3');
      });
      return tl;
    },

    /** 文字逐字出现（实时）。返回 cancel()。 */
    textRevealCharByChar(element, text, charDelay = 50) {
      const el = toEl(element);
      if (!el) return () => {};
      el.textContent = '';
      const timers = Array.from(text).map((ch, i) => root.setTimeout(() => { el.textContent += ch; }, i * charDelay));
      return () => timers.forEach((id) => root.clearTimeout(id));
    },

    /** 数字滚动（实时）。返回 cancel()。 */
    numberCounter(element, targetValue, duration = 1.5) {
      const el = toEl(element);
      if (!el) return () => {};
      const t0 = root.performance.now();
      let id = 0;
      const step = () => {
        const p = Math.min((root.performance.now() - t0) / 1000 / duration, 1);
        el.textContent = String(Math.round(p * targetValue));
        if (p < 1) id = root.requestAnimationFrame(step);
      };
      id = root.requestAnimationFrame(step);
      return () => root.cancelAnimationFrame(id);
    },

    /** 进度条填充 */
    progressBar(element, percentage, duration = 1) {
      const el = toEl(element);
      if (!el || !hasGsap()) return null;
      return root.gsap.fromTo(el, { width: '0%' }, { width: `${percentage}%`, duration, ease: 'power2.out' });
    },

    /** 光晕脉冲（无限循环，返回的 tween 可 .kill()） */
    glowPulse(element, options = {}) {
      const el = toEl(element);
      if (!el || !hasGsap()) return null;
      const { color = 'rgba(8,145,178,0.3)', duration = 2, blur = 20 } = options;
      return root.gsap.to(el, { boxShadow: `0 0 ${blur}px ${color}`, duration: duration / 2, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    },

    /** 场景切换（预览用淡入；instant=true 时直接切换） */
    showScene(sceneIndex, instant = false) {
      const scenes = toList('.scene');
      const scene = scenes[sceneIndex];
      if (!scene) return null;
      scenes.forEach((s, i) => { if (i !== sceneIndex) { s.style.display = 'none'; s.style.opacity = '0'; } });
      scene.style.display = 'flex';
      const items = scene.querySelectorAll('.animatable');
      if (instant || !hasGsap()) {
        scene.style.opacity = '1';
        items.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; el.style.filter = 'none'; });
        return null;
      }
      const tl = root.gsap.timeline();
      tl.fromTo(scene, { opacity: 0 }, { opacity: 1, duration: 0.5 });
      tl.fromTo(items, { opacity: 0, y: 30, scale: 0.95, filter: 'blur(5px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.6, stagger: 0.1, ease: 'power3.out' }, '-=0.3');
      return tl;
    },

    /** 滚动触发（需要 ScrollTrigger 插件）。返回 dispose()。 */
    scrollTrigger(selector, options = {}) {
      const el = toEl(selector);
      if (!el || !hasGsap()) return () => {};
      if (typeof root.ScrollTrigger === 'undefined') {
        console.warn('[GMLive] ScrollTrigger 未加载，已跳过 scrollTrigger()');
        return () => {};
      }
      root.gsap.registerPlugin(root.ScrollTrigger);
      const { start = 'top 80%', end = 'bottom 20%', scrub = false } = options;
      const anim = root.gsap.fromTo(el, { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' });
      const st = root.ScrollTrigger.create({ trigger: el, start, end, scrub, animation: anim });
      return () => { st.kill(); anim.kill(); };
    },

    /** 鼠标跟随。返回 dispose()。 */
    mouseFollow(element, options = {}) {
      const el = toEl(element);
      if (!el || !hasGsap()) return () => {};
      const { intensity = 0.1, duration = 0.3 } = options;
      const offMove = listen(el, 'mousemove', (e) => {
        const r = el.getBoundingClientRect();
        root.gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * intensity, y: (e.clientY - r.top - r.height / 2) * intensity, duration, ease: 'power2.out' });
      });
      const offLeave = listen(el, 'mouseleave', () => root.gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'power3.out' }));
      return () => { offMove(); offLeave(); };
    },

    /** hover / click 微交互。返回 dispose()。 */
    microInteraction(element, options = {}) {
      const el = toEl(element);
      if (!el || !hasGsap()) return () => {};
      const { type = 'hover', scale = 1.05, duration = 0.2 } = options;
      const g = root.gsap;
      const offs = type === 'click'
        ? [listen(el, 'mousedown', () => g.to(el, { scale: 0.95, duration: 0.1 })),
           listen(el, 'mouseup', () => g.to(el, { scale: 1, duration: 0.2, ease: 'power3.out' })),
           listen(el, 'mouseleave', () => g.to(el, { scale: 1, duration: 0.2 }))]
        : [listen(el, 'mouseenter', () => g.to(el, { scale, duration, ease: 'power2.out' })),
           listen(el, 'mouseleave', () => g.to(el, { scale: 1, duration, ease: 'power2.out' }))];
      return () => offs.forEach((off) => off());
    },

    /** 按窗口宽度应用不同样式。返回 dispose()（解绑 resize）。 */
    responsive(element, options = {}) {
      const el = toEl(element);
      if (!el) return () => {};
      const { mobile = {}, tablet = {}, desktop = {}, breakpointMobile = 768, breakpointTablet = 1024 } = options;
      const apply = () => {
        const w = root.innerWidth;
        const cfg = w < breakpointMobile ? mobile : w < breakpointTablet ? tablet : desktop;
        if (typeof root.gsap !== 'undefined') root.gsap.set(el, cfg);
        else Object.assign(el.style, cfg);
      };
      apply();
      return listen(root, 'resize', apply);
    },

    /** 加载指示器（CSS 动画，不依赖 GSAP）。返回 { remove }。 */
    loading(container, options = {}) {
      const box = toEl(container);
      if (!box) return { remove() {} };
      const { color = '#0070f3', size = 40 } = options;
      const loader = document.createElement('div');
      loader.style.cssText = `position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:${size}px;height:${size}px;` +
        `border:4px solid ${color};border-right-color:transparent;border-radius:50%;animation:gmlive-spin 1s linear infinite;`;
      if (!document.getElementById('gmlive-spin-style')) {
        const style = document.createElement('style');
        style.id = 'gmlive-spin-style';
        style.textContent = '@keyframes gmlive-spin { to { transform: translate(-50%,-50%) rotate(360deg); } }';
        document.head.appendChild(style);
      }
      box.appendChild(loader);
      return { remove: () => loader.remove() };
    },

    /** 两个元素之间的过渡：fade / slide / scale */
    transition(fromElement, toElement, options = {}) {
      const a = toEl(fromElement);
      const b = toEl(toElement);
      if (!a || !b || !hasGsap()) return null;
      const { type = 'fade', duration = 0.5, ease = 'power2.inOut' } = options;
      const tl = root.gsap.timeline();
      if (type === 'slide') {
        tl.to(a, { x: -100, opacity: 0, duration, ease }).set(b, { x: 100, opacity: 0, display: 'block' }).to(b, { x: 0, opacity: 1, duration, ease });
      } else if (type === 'scale') {
        tl.to(a, { scale: 0.8, opacity: 0, duration, ease }).set(b, { scale: 1.2, opacity: 0, display: 'block' }).to(b, { scale: 1, opacity: 1, duration, ease });
      } else {
        tl.to(a, { opacity: 0, duration: duration / 2, ease }).set(b, { opacity: 0, display: 'block' }).to(b, { opacity: 1, duration: duration / 2, ease });
      }
      return tl;
    },
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = GMLive;
  root.GMLive = GMLive;
})(typeof window !== 'undefined' ? window : globalThis);
