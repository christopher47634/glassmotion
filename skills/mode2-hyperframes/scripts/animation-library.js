/**
 * Mode2 高级动画库 v2.0
 * 基于Stripe、Linear、Vercel、Raycast等顶级网站的设计原则
 * 使用方法：在HTML中引用此文件，然后调用相应函数
 */

// 确保GSAP已加载
if (typeof gsap === 'undefined') {
  console.warn('GSAP未加载，请先引入GSAP库');
}

const Mode2Animation = {
  // 默认配置
  config: {
    defaultDuration: 0.6,
    defaultEase: "back.out(1.7)",
    staggerInterval: 0.1,
    blurAmount: 10,
    scaleAmount: 0.95,
    // 专业缓动曲线库
    easings: {
      // 物理弹簧缓动
      spring: "elastic.out(1, 0.3)",
      // 弹性缓动
      bounce: "bounce.out",
      // 平滑缓动
      smooth: "power3.out",
      // 快速缓动
      snappy: "power4.out",
      // 柔和缓动
      soft: "sine.out",
      // 自然缓动
      natural: "circ.out",
      // 回弹缓动
      back: "back.out(1.7)",
      // 强力回弹
      strongBack: "back.out(2.5)",
      // 柔和回弹
      softBack: "back.out(1.2)"
    }
  },

  /**
   * 容器入场动画（位移+缩放+模糊+透明度）
   * @param {string|Element} selector - 选择器或元素
   * @param {object} options - 配置选项
   */
  containerEntrance(selector, options = {}) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;

    const { 
      duration = this.config.defaultDuration,
      ease = this.config.defaultEase,
      delay = 0,
      y = 40,
      x = 0,
      scale = this.config.scaleAmount,
      blur = this.config.blurAmount,
      rotation = 0
    } = options;

    gsap.fromTo(el, 
      { opacity: 0, y, x, scale, rotation, filter: `blur(${blur}px)` },
      { 
        opacity: 1, y: 0, x: 0, scale: 1, rotation: 0, filter: 'blur(0)',
        duration,
        ease,
        delay
      }
    );
  },

  /**
   * 子元素交错入场
   * @param {string|NodeList} selector - 选择器或元素集合
   * @param {object} options - 配置选项
   */
  staggerEntrance(selector, options = {}) {
    const elements = typeof selector === 'string' 
      ? document.querySelectorAll(selector) 
      : selector;
    
    if (!elements || elements.length === 0) return;

    const {
      duration = 0.4,
      ease = "power2.out",
      stagger = this.config.staggerInterval,
      y = 30,
      x = 0,
      scale = 1,
      blur = 0,
      from = "start",
      rotation = 0
    } = options;

    gsap.fromTo(elements,
      { opacity: 0, y, x, scale, rotation, filter: blur > 0 ? `blur(${blur}px)` : 'none' },
      {
        opacity: 1, y: 0, x: 0, scale: 1, rotation: 0, filter: 'blur(0)',
        duration,
        ease,
        stagger: {
          amount: stagger * elements.length,
          from
        }
      }
    );
  },

  /**
   * 多阶段入场动画
   * @param {Array} stages - 阶段配置数组
   */
  multiStageEntrance(stages) {
    const tl = gsap.timeline();
    
    stages.forEach((stage, index) => {
      const { 
        selector, 
        from = {}, 
        to = {}, 
        position = index === 0 ? 0 : "-=0.3"
      } = stage;
      
      const elements = typeof selector === 'string' 
        ? document.querySelectorAll(selector) 
        : selector;
      
      if (elements && elements.length > 0) {
        tl.fromTo(elements, from, to, position);
      }
    });
    
    return tl;
  },

  /**
   * 文字逐字出现
   * @param {Element} element - 文本元素
   * @param {string} text - 要显示的文本
   * @param {number} charDelay - 每个字符延迟(ms)
   */
  textRevealCharByChar(element, text, charDelay = 50) {
    element.textContent = '';
    const chars = text.split('');
    
    chars.forEach((char, i) => {
      setTimeout(() => {
        element.textContent += char;
      }, i * charDelay);
    });
  },

  /**
   * 数字滚动动画
   * @param {Element} element - 数字元素
   * @param {number} targetValue - 目标值
   * @param {number} duration - 动画时长(s)
   */
  numberCounter(element, targetValue, duration = 1.5) {
    const startTime = performance.now();
    
    const update = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const currentValue = Math.round(progress * targetValue);
      
      element.textContent = currentValue;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };
    
    requestAnimationFrame(update);
  },

  /**
   * 进度条填充动画
   * @param {Element} element - 进度条元素
   * @param {number} percentage - 百分比(0-100)
   * @param {number} duration - 动画时长(s)
   */
  progressBar(element, percentage, duration = 1) {
    gsap.fromTo(element,
      { width: '0%' },
      { 
        width: `${percentage}%`,
        duration,
        ease: "power2.out"
      }
    );
  },

  /**
   * 光晕脉冲效果
   * @param {Element} element - 元素
   * @param {object} options - 配置选项
   */
  glowPulse(element, options = {}) {
    const {
      color = 'rgba(8,145,178,0.3)',
      duration = 2,
      blur = 20
    } = options;

    gsap.to(element, {
      boxShadow: `0 0 ${blur}px ${color}`,
      duration: duration / 2,
      yoyo: true,
      repeat: -1,
      ease: "power1.inOut"
    });
  },

  /**
   * 场景切换动画（与seekTo兼容）
   * @param {number} sceneIndex - 场景索引
   * @param {boolean} instant - 是否瞬间切换（用于截帧）
   */
  showScene(sceneIndex, instant = false) {
    const scene = document.getElementById(`s${sceneIndex}`);
    if (!scene) return;

    // 隐藏其他场景
    document.querySelectorAll('.scene').forEach((s, i) => {
      if (i !== sceneIndex) {
        s.style.display = 'none';
        s.style.opacity = '0';
      }
    });

    // 显示当前场景
    scene.style.display = 'flex';
    
    if (instant) {
      // 瞬间切换（用于截帧）
      gsap.set(scene, { opacity: 1 });
      gsap.set(scene.querySelectorAll('.animatable'), {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: 'blur(0)'
      });
    } else {
      // 正常动画
      const tl = gsap.timeline();
      
      // 场景淡入
      tl.fromTo(scene,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 }
      );
      
      // 子元素入场
      tl.fromTo(scene.querySelectorAll('.animatable'),
        { opacity: 0, y: 30, scale: 0.95, filter: 'blur(5px)' },
        {
          opacity: 1, y: 0, scale: 1, filter: 'blur(0)',
          duration: 0.6,
          stagger: 0.1,
          ease: "back.out(1.7)"
        },
        "-=0.3"
      );
    }
  },

  /**
   * 时间驱动动画（兼容seekTo）
   * @param {number} elapsed - 已经过时间(s)
   * @param {NodeList} elements - 元素集合
   */
  timeDrivenAnimation(elapsed, elements) {
    elements.forEach(el => {
      const delay = parseFloat(el.dataset.delay);
      if (elapsed >= delay && !el.classList.contains('animated')) {
        el.classList.add('animated');
        
        // 根据data-animation属性选择动画类型
        const animationType = el.dataset.animation || 'fadeInUp';
        
        switch (animationType) {
          case 'fadeInUp':
            gsap.fromTo(el,
              { opacity: 0, y: 20 },
              { opacity: 1, y: 0, duration: 0.5, ease: "back.out(1.7)" }
            );
            break;
            
          case 'scaleIn':
            gsap.fromTo(el,
              { opacity: 0, scale: 0.8 },
              { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
            );
            break;
            
          case 'blurIn':
            gsap.fromTo(el,
              { opacity: 0, filter: 'blur(10px)' },
              { opacity: 1, filter: 'blur(0)', duration: 0.6, ease: "power2.out" }
            );
            break;
            
          default:
            gsap.fromTo(el,
              { opacity: 0 },
              { opacity: 1, duration: 0.5 }
            );
        }
      }
    });
  },

  /**
   * 弹簧动画（物理模拟）
   * @param {Element} element - 元素
   * @param {object} options - 配置选项
   */
  springAnimation(element, options = {}) {
    const {
      property = 'y',
      from = 0,
      to = 100,
      duration = 1,
      stiffness = 100,
      damping = 10,
      mass = 1
    } = options;

    // 使用GSAP的弹性缓动模拟弹簧效果
    gsap.fromTo(element,
      { [property]: from },
      {
        [property]: to,
        duration,
        ease: "elastic.out(1, 0.3)",
        onComplete: () => {
          // 可以添加回调
        }
      }
    );
  },

  /**
   * 滚动触发动画
   * @param {string|Element} selector - 选择器或元素
   * @param {object} options - 配置选项
   */
  scrollTriggerAnimation(selector, options = {}) {
    const el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;

    const {
      start = "top 80%",
      end = "bottom 20%",
      scrub = false,
      pin = false,
      animation = null
    } = options;

    // 确保ScrollTrigger已加载
    if (typeof ScrollTrigger === 'undefined') {
      console.warn('ScrollTrigger未加载，请先引入GSAP ScrollTrigger插件');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const defaultAnimation = gsap.fromTo(el,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: "power3.out"
      }
    );

    ScrollTrigger.create({
      trigger: el,
      start,
      end,
      scrub,
      pin,
      animation: animation || defaultAnimation
    });
  },

  /**
   * 鼠标跟随动画
   * @param {Element} element - 元素
   * @param {object} options - 配置选项
   */
  mouseFollowAnimation(element, options = {}) {
    const {
      intensity = 0.1,
      duration = 0.3,
      ease = "power2.out"
    } = options;

    element.addEventListener('mousemove', (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const moveX = (x - centerX) * intensity;
      const moveY = (y - centerY) * intensity;
      
      gsap.to(element, {
        x: moveX,
        y: moveY,
        duration,
        ease
      });
    });

    element.addEventListener('mouseleave', () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)"
      });
    });
  },

  /**
   * 组合动画（多属性同时动画）
   * @param {Element} element - 元素
   * @param {object} options - 配置选项
   */
  combinedAnimation(element, options = {}) {
    const {
      from = {},
      to = {},
      duration = 0.6,
      ease = "back.out(1.7)",
      delay = 0
    } = options;

    gsap.fromTo(element, from, {
      ...to,
      duration,
      ease,
      delay
    });
  },

  /**
   * 序列动画（按顺序执行多个动画）
   * @param {Array} animations - 动画配置数组
   */
  sequenceAnimation(animations) {
    const tl = gsap.timeline();
    
    animations.forEach((anim, index) => {
      const {
        element,
        from = {},
        to = {},
        duration = 0.6,
        ease = "back.out(1.7)",
        position = index === 0 ? 0 : "-=0.3"
      } = anim;
      
      tl.fromTo(element, from, {
        ...to,
        duration,
        ease
      }, position);
    });
    
    return tl;
  },

  /**
   * 交错序列动画
   * @param {string|NodeList} selector - 选择器或元素集合
   * @param {object} options - 配置选项
   */
  staggerSequenceAnimation(selector, options = {}) {
    const elements = typeof selector === 'string' 
      ? document.querySelectorAll(selector) 
      : selector;
    
    if (!elements || elements.length === 0) return;

    const {
      from = { opacity: 0, y: 30 },
      to = { opacity: 1, y: 0 },
      duration = 0.6,
      ease = "back.out(1.7)",
      stagger = 0.1
    } = options;

    const tl = gsap.timeline();
    
    elements.forEach((el, index) => {
      tl.fromTo(el, from, {
        ...to,
        duration,
        ease
      }, index * stagger);
    });
    
    return tl;
  },

  /**
   * 性能优化动画（使用will-change）
   * @param {Element} element - 元素
   * @param {object} options - 配置选项
   */
  performantAnimation(element, options = {}) {
    const {
      properties = ['transform', 'opacity'],
      from = {},
      to = {},
      duration = 0.6,
      ease = "back.out(1.7)"
    } = options;

    // 添加will-change属性
    element.style.willChange = properties.join(', ');
    
    // 执行动画
    gsap.fromTo(element, from, {
      ...to,
      duration,
      ease,
      onComplete: () => {
        // 动画完成后移除will-change
        element.style.willChange = 'auto';
      }
    });
  },

  /**
   * 响应式动画（根据屏幕尺寸调整）
   * @param {Element} element - 元素
   * @param {object} options - 配置选项
   */
  responsiveAnimation(element, options = {}) {
    const {
      mobile = {},
      tablet = {},
      desktop = {},
      breakpointMobile = 768,
      breakpointTablet = 1024
    } = options;

    const updateAnimation = () => {
      const width = window.innerWidth;
      let config;
      
      if (width < breakpointMobile) {
        config = mobile;
      } else if (width < breakpointTablet) {
        config = tablet;
      } else {
        config = desktop;
      }
      
      // 应用配置
      gsap.set(element, config);
    };
    
    // 初始化
    updateAnimation();
    
    // 监听窗口大小变化
    window.addEventListener('resize', updateAnimation);
  },

  /**
   * 加载动画
   * @param {Element} container - 容器元素
   * @param {object} options - 配置选项
   */
  loadingAnimation(container, options = {}) {
    const {
      type = 'spinner',
      color = '#0070f3',
      size = 40
    } = options;

    // 创建加载动画元素
    const loader = document.createElement('div');
    loader.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${size}px;
      height: ${size}px;
    `;

    if (type === 'spinner') {
      loader.innerHTML = `
        <svg width="${size}" height="${size}" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="20" fill="none" stroke="${color}" stroke-width="4" 
                  stroke-dasharray="31.4 31.4" stroke-linecap="round">
            <animateTransform attributeName="transform" type="rotate" 
                              from="0 25 25" to="360 25 25" dur="1s" repeatCount="indefinite"/>
          </circle>
        </svg>
      `;
    } else if (type === 'dots') {
      loader.style.display = 'flex';
      loader.style.gap = '8px';
      
      for (let i = 0; i < 3; i++) {
        const dot = document.createElement('div');
        dot.style.cssText = `
          width: ${size / 4}px;
          height: ${size / 4}px;
          background: ${color};
          border-radius: 50%;
          animation: loadingDot 1.4s infinite ease-in-out both;
          animation-delay: ${i * 0.16}s;
        `;
        loader.appendChild(dot);
      }
      
      // 添加动画样式
      const style = document.createElement('style');
      style.textContent = `
        @keyframes loadingDot {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    container.appendChild(loader);
    
    return {
      remove: () => loader.remove()
    };
  },

  /**
   * 过渡动画（页面切换等）
   * @param {Element} fromElement - 出发元素
   * @param {Element} toElement - 目标元素
   * @param {object} options - 配置选项
   */
  transitionAnimation(fromElement, toElement, options = {}) {
    const {
      type = 'fade',
      duration = 0.5,
      ease = "power2.inOut"
    } = options;

    const tl = gsap.timeline();
    
    if (type === 'fade') {
      tl.to(fromElement, { opacity: 0, duration: duration / 2, ease })
        .set(toElement, { opacity: 0 })
        .set(toElement, { display: 'block' })
        .to(toElement, { opacity: 1, duration: duration / 2, ease });
    } else if (type === 'slide') {
      tl.to(fromElement, { x: -100, opacity: 0, duration, ease })
        .set(toElement, { x: 100, opacity: 0, display: 'block' })
        .to(toElement, { x: 0, opacity: 1, duration, ease });
    } else if (type === 'scale') {
      tl.to(fromElement, { scale: 0.8, opacity: 0, duration, ease })
        .set(toElement, { scale: 1.2, opacity: 0, display: 'block' })
        .to(toElement, { scale: 1, opacity: 1, duration, ease });
    }
    
    return tl;
  },

  /**
   * 微交互动画
   * @param {Element} element - 元素
   * @param {object} options - 配置选项
   */
  microInteraction(element, options = {}) {
    const {
      type = 'hover',
      scale = 1.05,
      duration = 0.2,
      ease = "power2.out"
    } = options;

    if (type === 'hover') {
      element.addEventListener('mouseenter', () => {
        gsap.to(element, { scale, duration, ease });
      });
      
      element.addEventListener('mouseleave', () => {
        gsap.to(element, { scale: 1, duration, ease });
      });
    } else if (type === 'click') {
      element.addEventListener('mousedown', () => {
        gsap.to(element, { scale: 0.95, duration: 0.1 });
      });
      
      element.addEventListener('mouseup', () => {
        gsap.to(element, { scale: 1, duration: 0.2, ease: "elastic.out(1, 0.3)" });
      });
      
      element.addEventListener('mouseleave', () => {
        gsap.to(element, { scale: 1, duration: 0.2 });
      });
    }
  }
};

// 导出到全局作用域
window.Mode2Animation = Mode2Animation;