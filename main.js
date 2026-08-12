/**
 * Xuoh 个人主页 - 主脚本
 * 版本: 4.0 (墨金 · 设计改版)
 * 使用 IIFE 模式封装，避免全局变量污染
 */

(function () {
  'use strict';

  // ==================== 配置常量 ====================
  const CONFIG = {
    STAR_COUNT_DESKTOP: 72,
    STAR_COUNT_MOBILE: 36,
    MOBILE_BREAKPOINT: 768,
    HITOKOTO_TIMEOUT: 8000,
    HITOKOTO_AUTO_INTERVAL: 15000,
    CLOCK_UPDATE_INTERVAL: 1000,
    DEBOUNCE_DELAY: 250,
    EASTER_EGG_CLICKS: 5,
    // 彩蛋流星风暴：持续 3~5 秒，期间高频多发
    EASTER_EGG_STORM_MIN_MS: 3000,
    EASTER_EGG_STORM_MAX_MS: 5000,
    EASTER_EGG_STORM_INTERVAL_MS: 90,
    EASTER_EGG_STORM_BURST: 3, // 每次定时最多同时放出几颗
    SWIPE_THRESHOLD: 100,
    LOADER_MIN_MS: 350,
    LOADER_FADE_MS: 400,
    HITOKOTO_API: 'https://v1.hitokoto.cn/',
    BLOG_URL: 'https://blog.xu.uy',
    NAV_URL: 'https://hao.xu.uy',
  };

  // ==================== 工具函数 ====================
  const Utils = {
    /**
     * 防抖函数
     */
    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    /**
     * 安全获取元素
     */
    getElement(selector) {
      const element = document.querySelector(selector);
      if (!element) {
        console.warn(`Element not found: ${selector}`);
      }
      return element;
    },

    /**
     * 安全获取所有元素
     */
    getElements(selector) {
      return document.querySelectorAll(selector);
    },

    /**
     * 检查是否为移动设备
     */
    isMobile() {
      return window.innerWidth < CONFIG.MOBILE_BREAKPOINT;
    },

    /**
     * 检查是否支持触摸
     */
    isTouchDevice() {
      return 'ontouchstart' in window;
    },

    /**
     * 错误处理包装器
     */
    tryCatch(fn, errorMessage) {
      try {
        return fn();
      } catch (error) {
        console.error(errorMessage, error);
        return null;
      }
    },
  };

  // ==================== 统一运动循环（驱动光环拖尾；内点不走循环） ====================
  const MotionSystem = {
    rafId: null,
    isActive: false,
    hasPosition: false,
    lastTime: 0,

    init() {
      if (Utils.isMobile() || Utils.isTouchDevice()) {
        return;
      }

      this.isActive = true;

      document.addEventListener('mousemove', (e) => {
        this.hasPosition = true;
        // 光标在事件回调里 1:1 直接定位：不插值、不等下一帧，消除跟手延迟
        CursorSystem.moveTo(e.clientX, e.clientY);
      }, { passive: true });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });

      this.loop(performance.now());
    },

    loop(now) {
      if (!this.isActive) return;

      if (this.hasPosition) {
        // 帧时长上限 100ms，防止卡顿/切回页面后拖尾跳变
        const dt = this.lastTime ? Math.min(now - this.lastTime, 100) : 16.7;
        CursorSystem.tick(dt);
      }
      this.lastTime = now;

      this.rafId = requestAnimationFrame((t) => this.loop(t));
    },

    pause() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    },

    resume() {
      if (this.isActive && !this.rafId) {
        this.lastTime = 0;
        this.loop(performance.now());
      }
    },

    destroy() {
      this.pause();
      this.isActive = false;
    },
  };

  // ==================== 光标系统（内点 1:1 跟手 + canvas 轨迹流星拖尾） ====================
  const CursorSystem = {
    dot: null,
    canvas: null,
    ctx: null,
    dpr: 1,
    points: [], // 最近的轨迹点 {x, y, t}
    isActive: false,
    hasPosition: false,
    settled: false,
    reducedMotion: false,
    targetX: 0,
    targetY: 0,
    TRAIL_LIFE: 300, // 轨迹点寿命 ms：决定尾巴长度与消散速度
    MAX_POINTS: 90,
    INTERACTIVE: 'button, a, .logo, .refresh-btn, .logo-wrapper',

    init() {
      if (Utils.isMobile() || Utils.isTouchDevice()) {
        return;
      }

      this.dot = Utils.getElement('.cursor-dot');
      this.canvas = Utils.getElement('.cursor-trail');
      if (!this.dot || !this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.reducedMotion =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

      this.resize();
      window.addEventListener(
        'resize',
        Utils.debounce(() => this.resize(), 200)
      );

      this.isActive = true;
      this.bindEvents();
    },

    resize() {
      // 高分屏 2x 封顶：再高肉眼无差，白费填充率
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(window.innerWidth * this.dpr);
      this.canvas.height = Math.round(window.innerHeight * this.dpr);
    },

    bindEvents() {
      document.addEventListener('mousedown', () => {
        this.setState('press', true);
      }, { passive: true });

      document.addEventListener('mouseup', () => {
        this.setState('press', false);
      }, { passive: true });

      document.addEventListener('mouseover', (e) => {
        if (e.target.closest(this.INTERACTIVE)) {
          this.setState('hover', true);
        }
      }, { passive: true });

      document.addEventListener('mouseout', (e) => {
        const el = e.target.closest(this.INTERACTIVE);
        // 仍在同一交互元素内部移动时不取消 hover，避免尺寸反复抖动
        if (el && !(e.relatedTarget && el.contains(e.relatedTarget))) {
          this.setState('hover', false);
        }
      }, { passive: true });

      // 鼠标离开窗口时淡出；重置 hasPosition，回来第一帧就地吸附
      document.addEventListener('mouseleave', () => {
        this.setVisible(false);
        this.hasPosition = false;
      });

      // 窗口失焦（如点击 mailto 跳到邮件客户端）时复位所有状态：
      // 失焦期间 mouseup/mouseout 不会派发，否则 press/hover 会永久残留
      window.addEventListener('blur', () => {
        this.setState('press', false);
        this.setState('hover', false);
        this.setVisible(false);
        this.hasPosition = false;
      });
    },

    setState(name, on) {
      if (!this.isActive) return;
      this.dot.classList.toggle(name, on);
    },

    setVisible(on) {
      if (!this.isActive) return;
      this.dot.classList.toggle('is-visible', on);
      if (!on) {
        this.clearTrail();
      }
    },

    clearTrail() {
      this.points.length = 0;
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    },

    moveTo(x, y) {
      if (!this.isActive) return;

      this.targetX = x;
      this.targetY = y;

      if (!this.hasPosition) {
        // 首次出现/回到窗口：就地吸附，拖尾从零长起
        this.hasPosition = true;
        this.points.length = 0;
        this.setVisible(true);
      }
      this.settled = false;

      // 记录真实轨迹点；mousemove 频率高于 rAF，能捕捉到弯道细节
      if (!this.reducedMotion) {
        const last = this.points[this.points.length - 1];
        if (!last || last.x !== x || last.y !== y) {
          this.points.push({ x, y, t: performance.now() });
          if (this.points.length > this.MAX_POINTS) {
            this.points.shift();
          }
        }
      }

      // 内点在事件回调里 1:1 直接定位：不插值、不等下一帧，保持零延迟
      this.dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    },

    // 拖尾绘制：由 MotionSystem 的 rAF 驱动。
    // 沿真实轨迹连线，头粗尾细、随时间渐隐；静止后轨迹点自然过期、尾巴收进光标
    tick() {
      if (!this.isActive || !this.hasPosition || this.settled) return;

      if (this.reducedMotion) {
        this.settled = true;
        return;
      }

      const now = performance.now();

      // 过期点出队（尾端先消失）
      while (this.points.length && now - this.points[0].t > this.TRAIL_LIFE) {
        this.points.shift();
      }

      const ctx = this.ctx;
      const dpr = this.dpr;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      const n = this.points.length;
      if (n < 2) {
        // 轨迹已全部消散：停笔，等下一次移动再唤醒
        this.settled = true;
        return;
      }

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < n - 1; i++) {
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        const pos = (i + 1) / (n - 1); // 0 = 尾端，1 = 头部（光标处）
        const ageFade = 1 - (now - p2.t) / this.TRAIL_LIFE;
        const alpha = Math.max(0, pos * pos * ageFade) * 0.85;
        if (alpha < 0.01) continue;

        ctx.strokeStyle = `rgba(226, 238, 255, ${alpha.toFixed(3)})`;
        ctx.lineWidth = (0.6 + 2 * pos) * dpr;
        ctx.beginPath();
        ctx.moveTo(p1.x * dpr, p1.y * dpr);
        ctx.lineTo(p2.x * dpr, p2.y * dpr);
        ctx.stroke();
      }
    },

    destroy() {
      this.isActive = false;
      this.clearTrail();
    },
  };

  // ==================== 星空系统 ====================
  const StarSystem = {
    container: null,
    stars: [],
    ready: false,

    init() {
      if (this.ready) return;
      this.ready = true;

      // 创建星空容器
      this.container = document.createElement('div');
      this.container.className = 'stars';
      this.container.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(this.container, document.body.firstChild);

      this.createStars();
      this.bindEvents();
    },

    createStars() {
      const starCount = Utils.isMobile()
        ? CONFIG.STAR_COUNT_MOBILE
        : CONFIG.STAR_COUNT_DESKTOP;
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';

        // 随机大小
        const sizeType = Math.random();
        if (sizeType < 0.6) {
          star.classList.add('small');
        } else if (sizeType < 0.9) {
          star.classList.add('medium');
        } else {
          star.classList.add('large');
        }

        // 随机位置
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;

        // 慢速呼吸式闪烁，安静不抢戏
        star.style.animationDuration = `${Math.random() * 3.5 + 3.5}s`;
        star.style.animationDelay = `${Math.random() * 4}s`;

        fragment.appendChild(star);
        this.stars.push(star);
      }

      this.container.appendChild(fragment);
    },

    bindEvents() {
      document.addEventListener('visibilitychange', () => {
        const state = document.hidden ? 'paused' : 'running';
        this.stars.forEach(s => {
          s.style.animationPlayState = state;
        });
      });
    },

    resume() {
      this.stars.forEach(s => {
        s.style.animationPlayState = 'running';
      });
    },

    destroy() {
      this.stars.forEach(s => s.remove());
      this.stars = [];
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
      this.ready = false;
    },
  };

  // ==================== 流星系统（偶发划过，安静点缀） ====================
  const MeteorSystem = {
    timerId: null,
    stormIntervalId: null,
    stormEndId: null,
    storming: false,
    enabled: false,

    init() {
      const reduced =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (reduced) return;
      this.enabled = true;
      this.schedule();
    },

    schedule() {
      if (!this.enabled || this.storming) return;
      // 4~12 秒随机一颗，避免规律感
      const delay = 4000 + Math.random() * 8000;
      this.timerId = setTimeout(() => {
        if (!document.hidden) this.spawn();
        this.schedule();
      }, delay);
    },

    clearSchedule() {
      if (this.timerId) {
        clearTimeout(this.timerId);
        this.timerId = null;
      }
    },

    clearStormTimers() {
      if (this.stormIntervalId) {
        clearInterval(this.stormIntervalId);
        this.stormIntervalId = null;
      }
      if (this.stormEndId) {
        clearTimeout(this.stormEndId);
        this.stormEndId = null;
      }
    },

    spawn(options = {}) {
      const storm = !!options.storm;
      const m = document.createElement('div');
      m.className = 'meteor';
      m.setAttribute('aria-hidden', 'true');
      // 只从画面中上部出发，往左下划，不穿过中央内容区下方
      // 风暴时略放宽生成带，并稍加快划过速度
      m.style.top = `${(storm ? 2 : 4) + Math.random() * (storm ? 48 : 38)}%`;
      m.style.left = `${(storm ? 20 : 35) + Math.random() * (storm ? 75 : 60)}%`;
      m.style.animationDuration = storm
        ? `${0.7 + Math.random() * 0.7}s`
        : `${1.3 + Math.random() * 0.9}s`;
      document.body.appendChild(m);
      m.addEventListener('animationend', () => m.remove(), { once: true });
    },

    /**
     * 彩蛋流星风暴：3~5 秒内高频多发，结束后回到平时低频偶发
     */
    storm() {
      if (!this.enabled) return;

      // 重复触发时重置风暴计时，避免叠多层定时器
      this.clearSchedule();
      this.clearStormTimers();
      this.storming = true;

      const duration =
        CONFIG.EASTER_EGG_STORM_MIN_MS +
        Math.random() *
          (CONFIG.EASTER_EGG_STORM_MAX_MS - CONFIG.EASTER_EGG_STORM_MIN_MS);

      // 立刻先喷一波，避免等第一个 interval
      const burst = () => {
        if (document.hidden) return;
        const n = 1 + Math.floor(Math.random() * CONFIG.EASTER_EGG_STORM_BURST);
        for (let i = 0; i < n; i++) this.spawn({ storm: true });
      };
      burst();

      this.stormIntervalId = setInterval(
        burst,
        CONFIG.EASTER_EGG_STORM_INTERVAL_MS
      );

      this.stormEndId = setTimeout(() => {
        this.clearStormTimers();
        this.storming = false;
        this.schedule(); // 回到 4~12 秒偶发
      }, duration);
    },

    destroy() {
      this.clearSchedule();
      this.clearStormTimers();
      this.storming = false;
      this.enabled = false;
    },
  };

  // ==================== 微尘系统（地平线金色光点上浮） ====================
  const DustSystem = {
    container: null,

    init() {
      const reduced =
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
      if (reduced) return;

      this.container = document.createElement('div');
      this.container.className = 'dust-field';
      this.container.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.container);

      const count = Utils.isMobile() ? 8 : 16;
      const fragment = document.createDocumentFragment();

      for (let i = 0; i < count; i++) {
        const d = document.createElement('i');
        d.className = 'dust';
        // 聚在画面下部（地平线暖光附近）
        d.style.left = `${8 + Math.random() * 84}%`;
        d.style.bottom = `${2 + Math.random() * 16}%`;
        d.style.setProperty('--dx', `${Math.round(Math.random() * 60 - 30)}px`);
        d.style.animationDuration = `${9 + Math.random() * 9}s`;
        d.style.animationDelay = `${Math.random() * 12}s`;
        fragment.appendChild(d);
      }

      this.container.appendChild(fragment);
    },

    destroy() {
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
    },
  };

  // ==================== 时钟系统 ====================
  const ClockSystem = {
    timeElement: null,
    dateElement: null,
    intervalId: null,

    init() {
      this.timeElement = Utils.getElement('#time');
      this.dateElement = Utils.getElement('#date');

      if (!this.timeElement || !this.dateElement) return;

      this.update();
      this.intervalId = setInterval(() => this.update(), CONFIG.CLOCK_UPDATE_INTERVAL);
    },

    update() {
      Utils.tryCatch(() => {
        const now = new Date();

        const time = now.toLocaleTimeString('zh-CN', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const date = now.toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
        });

        if (this.timeElement) this.timeElement.textContent = time;
        if (this.dateElement) this.dateElement.textContent = date;
      }, '时钟更新失败');
    },

    resume() {
      if (!this.intervalId) {
        this.update();
        this.intervalId = setInterval(() => this.update(), CONFIG.CLOCK_UPDATE_INTERVAL);
      }
    },

    destroy() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },
  };

  // ==================== 一言系统 ====================
  const HitokotoSystem = {
    hitokotoElement: null,
    fromElement: null,
    isLoading: false,
    controller: null,
    autoId: null,

    init() {
      this.hitokotoElement = Utils.getElement('#hitokoto');
      this.fromElement = Utils.getElement('#hitokoto-from');

      if (!this.hitokotoElement || !this.fromElement) return;

      // 首屏尽早请求，不再额外延迟
      this.fetch();
      this.startAuto();
      this.bindNetworkEvents();
    },

    // 自动轮换：每隔固定时间静默换一句；页面不可见时跳过
    startAuto() {
      this.stopAuto();
      this.autoId = setInterval(() => {
        if (!document.hidden) this.fetch(true);
      }, CONFIG.HITOKOTO_AUTO_INTERVAL);
    },

    stopAuto() {
      if (this.autoId) {
        clearInterval(this.autoId);
        this.autoId = null;
      }
    },

    async fetch(auto = false) {
      if (this.isLoading) return;

      this.isLoading = true;
      // 自动轮换时不显示"加载中"，等新句到手后直接淡出淡入
      if (!auto) {
        this.hitokotoElement.style.opacity = '0';
        this.hitokotoElement.textContent = '加载中...';
        this.fromElement.textContent = '';
      }

      // 取消之前的请求
      if (this.controller) {
        this.controller.abort();
      }

      this.controller = new AbortController();
      const timeoutId = setTimeout(() => this.controller.abort(), CONFIG.HITOKOTO_TIMEOUT);

      try {
        const response = await fetch(CONFIG.HITOKOTO_API, {
          method: 'GET',
          mode: 'cors',
          signal: this.controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // 先淡出旧句，300ms 后换新句淡入（与 CSS 过渡时长一致）
        this.hitokotoElement.style.opacity = '0';

        setTimeout(() => {
          this.hitokotoElement.textContent = data.hitokoto || '生活不止眼前的苟且,还有诗和远方。';
          this.fromElement.textContent = `—— ${data.from || '未知'}${data.from_who ? ' · ' + data.from_who : ''}`;
          this.hitokotoElement.style.opacity = '1';
          this.isLoading = false;
        }, 300);

      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
          console.warn('一言加载超时');
        } else {
          console.error('一言加载失败:', error);
        }

        this.hitokotoElement.textContent = '生活就像海洋，只有意志坚强的人才能到达彼岸。';
        this.fromElement.textContent = '—— 马克思';
        this.hitokotoElement.style.opacity = '1';
        this.isLoading = false;
      }
    },

    refresh() {
      if (!this.isLoading) {
        this.fetch();
        // 手动换句后重新计时，避免刚换完又被自动轮换顶掉
        this.startAuto();
      }
    },

    bindNetworkEvents() {
      window.addEventListener('online', () => {
        console.log('%c网络已连接', 'color: #4ade80; font-size: 14px; font-weight: bold;');
        this.fetch();
      });

      window.addEventListener('offline', () => {
        console.log('%c网络已断开', 'color: #f87171; font-size: 14px; font-weight: bold;');
      });
    },

    destroy() {
      this.stopAuto();
      if (this.controller) {
        this.controller.abort();
      }
    },
  };

  // ==================== 底部信息系统（运行时长 + 旅行者 1 号距离） ====================
  const FooterSystem = {
    uptimeEl: null,
    voyagerEl: null,
    intervalId: null,

    // 建站时间 = 仓库首次提交时间
    LAUNCH_MS: new Date('2026-07-29T01:14:58+08:00').getTime(),
    // 旅行者 1 号线性模型：参考时刻的距离 + 平均退行速度 × 经过时间
    V_EPOCH_MS: Date.UTC(2024, 9, 1), // 2024-10-01
    V_KM_AT_EPOCH: 24464814953,
    V_KM_PER_SEC: 16.9995,
    AU_KM: 149597870.7,

    init() {
      this.uptimeEl = Utils.getElement('#uptime');
      this.voyagerEl = Utils.getElement('#voyager');
      const yearEl = Utils.getElement('#footer-year');
      if (yearEl) yearEl.textContent = String(new Date().getFullYear());
      if (!this.uptimeEl || !this.voyagerEl) return;

      this.update();
      this.intervalId = setInterval(() => {
        if (!document.hidden) this.update();
      }, 1000);
    },

    update() {
      Utils.tryCatch(() => {
        const now = Date.now();

        let s = Math.max(0, Math.floor((now - this.LAUNCH_MS) / 1000));
        const d = Math.floor(s / 86400);
        s -= d * 86400;
        const h = Math.floor(s / 3600);
        s -= h * 3600;
        const m = Math.floor(s / 60);
        s -= m * 60;
        this.uptimeEl.textContent =
          `本站居然运行了 ${d} 天 ${h} 小时 ${m} 分 ${s} 秒 ❤️`;

        const km =
          this.V_KM_AT_EPOCH +
          ((now - this.V_EPOCH_MS) / 1000) * this.V_KM_PER_SEC;
        this.voyagerEl.textContent =
          `旅行者 1 号当前距离地球 ${Math.round(km)} 千米，` +
          `约为 ${(km / this.AU_KM).toFixed(6)} 个天文单位 🚀`;
      }, '底部信息更新失败');
    },

    destroy() {
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
    },
  };

  // ==================== 导航系统 ====================
  const NavigationSystem = {
    buttons: null,
    container: null,

    init() {
      this.buttons = Utils.getElements('.nav-btn');
      this.container = Utils.getElement('.container');
    },

    navigate(page, event) {
      if (!event) {
        event = window.event;
      }

      this.buttons.forEach(btn => btn.classList.remove('active'));

      if (event?.target) {
        event.target.classList.add('active');
      }

      if (this.container) {
        this.container.style.opacity = '0';
      }

      setTimeout(() => {
        if (page === 'blog') {
          window.location.href = CONFIG.BLOG_URL;
        } else if (page === 'nav') {
          window.location.href = CONFIG.NAV_URL;
        } else {
          if (this.container) {
            this.container.style.opacity = '1';
          }
        }
      }, 300);
    },
  };

  // ==================== 滚动系统 ====================
  const ScrollSystem = {
    init() {
      // 禁用页面滚动，不需要滚动监听
      // 页面现在是固定的单屏展示
    },
  };

  // ==================== 触摸系统 ====================
  const TouchSystem = {
    touchStartX: 0,
    touchEndX: 0,

    init() {
      if (!Utils.isTouchDevice()) return;

      document.addEventListener('touchstart', (e) => {
        this.touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      document.addEventListener('touchend', (e) => {
        this.touchEndX = e.changedTouches[0].screenX;
        this.handleSwipe();
      }, { passive: true });

      // 禁用移动端双击缩放
      let lastTouchEnd = 0;
      document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    },

    handleSwipe() {
      const diff = this.touchStartX - this.touchEndX;

      if (Math.abs(diff) > CONFIG.SWIPE_THRESHOLD) {
        if (diff > 0) {
          console.log('向左滑动');
        } else {
          console.log('向右滑动');
        }
      }
    },
  };

  // ==================== 键盘系统 ====================
  const KeyboardSystem = {
    init() {
      document.addEventListener('keydown', (e) => {
        // 按 R 键刷新一言
        if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          HitokotoSystem.refresh();
        }
      });
    },
  };

  // ==================== 彩蛋系统 ====================
  const EasterEggSystem = {
    clickCount: 0,
    logo: null,

    init() {
      this.logo = Utils.getElement('.logo');
      if (!this.logo) return;

      this.logo.addEventListener('click', () => {
        this.clickCount++;
        if (this.clickCount === CONFIG.EASTER_EGG_CLICKS) {
          this.trigger();
          this.clickCount = 0;
        }
      });
    },

    trigger() {
      console.log('%c🎉 你发现了隐藏彩蛋！', 'color: #c9a87c; font-size: 24px; font-weight: bold;');
      // 保留彩虹滤镜
      document.body.style.animation = 'rainbow 2s linear';
      setTimeout(() => {
        document.body.style.animation = '';
      }, 2000);
      // 3~5 秒流星风暴，结束后回到平时低频偶发
      MeteorSystem.storm();
    },
  };

  // ==================== 图片加载系统 ====================
  const ImageSystem = {
    init() {
      Utils.getElements('img').forEach(img => {
        img.addEventListener('error', function() {
          console.warn('图片加载失败:', this.src);
          this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%2314161a" width="150" height="150"/%3E%3Ctext fill="%23c9a87c" font-family="Georgia, serif" font-size="64" x="50%25" y="50%25" text-anchor="middle" dy=".36em"%3EX%3C/text%3E%3C/svg%3E';
        });
      });
    },
  };

  // ==================== 内容保护系统 ====================
  const ContentProtection = {
    init() {
      // 禁用右键菜单
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      });

      // 禁用复制
      document.addEventListener('copy', (e) => {
        e.preventDefault();
        return false;
      });

      // 禁用剪切
      document.addEventListener('cut', (e) => {
        e.preventDefault();
        return false;
      });

      // 禁用粘贴
      document.addEventListener('paste', (e) => {
        e.preventDefault();
        return false;
      });

      // 禁用选择开始
      document.addEventListener('selectstart', (e) => {
        e.preventDefault();
        return false;
      });

      // 禁用拖拽开始
      document.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
      });

      // 禁用滚轮滚动
      document.addEventListener('wheel', (e) => {
        e.preventDefault();
        return false;
      }, { passive: false });

      // 禁用触摸滚动
      document.addEventListener('touchmove', (e) => {
        e.preventDefault();
        return false;
      }, { passive: false });

      // 禁用常用快捷键（但保留R键用于功能）
      document.addEventListener('keydown', (e) => {
        // 允许 R 键（刷新一言）
        if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
          return true;
        }

        // 禁用 Ctrl+C (复制)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
          e.preventDefault();
          return false;
        }
        // 禁用 Ctrl+X (剪切)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'x' || e.key === 'X')) {
          e.preventDefault();
          return false;
        }
        // 禁用 Ctrl+V (粘贴)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
          e.preventDefault();
          return false;
        }
        // 禁用 Ctrl+A (全选)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
          e.preventDefault();
          return false;
        }
        // 禁用 Ctrl+U (查看源代码)
        if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
          e.preventDefault();
          return false;
        }
        // 禁用 F12 (开发者工具)
        if (e.key === 'F12') {
          e.preventDefault();
          return false;
        }
        // 禁用 Ctrl+Shift+I (开发者工具)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) {
          e.preventDefault();
          return false;
        }
        // 禁用 Ctrl+Shift+J (控制台)
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
          e.preventDefault();
          return false;
        }
        // 禁用 Ctrl+Shift+C (检查元素) - 但不影响单独的C键
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
          e.preventDefault();
          return false;
        }
      }, true); // 使用捕获阶段，优先级更高
    },
  };

  // ==================== 响应式系统 ====================
  const ResponsiveSystem = {
    init() {
      this.adjustFontSize();
      // 移动端隐藏光标由 CSS 媒体查询负责，这里只处理字号
      window.addEventListener('resize', Utils.debounce(() => {
        this.adjustFontSize();
      }, CONFIG.DEBOUNCE_DELAY));
    },

    adjustFontSize() {
      const width = window.innerWidth;
      const root = document.documentElement;

      if (width < 768) {
        root.style.fontSize = '14px';
      } else if (width < 1024) {
        root.style.fontSize = '15px';
      } else {
        root.style.fontSize = '16px';
      }
    },
  };

  // ==================== 加载器系统 ====================
  const LoaderSystem = {
    startTime: 0,
    hidden: false,

    init() {
      this.startTime = performance.now();

      const onReady = () => this.hide();

      if (document.readyState === 'complete') {
        onReady();
      } else {
        window.addEventListener('load', onReady, { once: true });
      }

      // 兜底：避免 load 事件异常导致遮罩一直不消失
      setTimeout(() => this.hide(), 2500);
    },

    hide() {
      if (this.hidden) return;
      this.hidden = true;

      const elapsed = performance.now() - this.startTime;
      const wait = Math.max(0, CONFIG.LOADER_MIN_MS - elapsed);

      setTimeout(() => {
        const loader = Utils.getElement('.loader');
        if (loader) {
          loader.classList.add('is-hidden');
          setTimeout(() => {
            loader.style.display = 'none';
          }, CONFIG.LOADER_FADE_MS);
        }

        // Loader 结束后再挂载较重的视觉效果，减少首屏争抢
        this.deferHeavyEffects();
      }, wait);
    },

    deferHeavyEffects() {
      const run = () => {
        Utils.tryCatch(() => StarSystem.init(), '星空初始化失败');
        Utils.tryCatch(() => MeteorSystem.init(), '流星初始化失败');
        Utils.tryCatch(() => DustSystem.init(), '微尘初始化失败');
      };

      if ('requestIdleCallback' in window) {
        requestIdleCallback(run, { timeout: 400 });
      } else {
        setTimeout(run, 50);
      }
    },
  };

  // ==================== 性能监控 ====================
  const PerformanceMonitor = {
    init() {
      if (!('performance' in window)) return;

      window.addEventListener('load', () => {
        setTimeout(() => {
          Utils.tryCatch(() => {
            const perfData = performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(
              `%c页面加载时间: ${pageLoadTime}ms`,
              'color: #fbbf24; font-size: 14px; font-weight: bold;'
            );
          }, '性能监控失败');
        }, 0);
      });
    },
  };

  // ==================== 页面可见性管理系统 ====================
  const VisibilityManager = {
    init() {
      // 监听页面可见性变化
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // 页面重新可见时，恢复所有动画和时钟
          this.resumeAll();
        }
      });

      // 监听页面显示事件（处理浏览器返回的情况）
      window.addEventListener('pageshow', (event) => {
        // 如果是从缓存中恢复的页面
        if (event.persisted) {
          this.resumeAll();
        }
      });
    },

    resumeAll() {
      // 恢复容器透明度
      const container = Utils.getElement('.container');
      if (container) {
        container.style.opacity = '1';
      }

      // 恢复星空动画
      if (StarSystem.resume) {
        StarSystem.resume();
      }

      // 恢复时钟
      if (ClockSystem.resume) {
        ClockSystem.resume();
      }

      // 恢复统一运动循环
      if (MotionSystem.resume) {
        MotionSystem.resume();
      }
    },
  };

  // ==================== 错误处理系统 ====================
  const ErrorHandler = {
    init() {
      window.addEventListener('error', (e) => {
        console.error('页面错误:', e.message, e.filename, e.lineno);
      });

      window.addEventListener('unhandledrejection', (e) => {
        console.error('未处理的Promise错误:', e.reason);
      });
    },
  };

  // ==================== 初始化检查 ====================
  const InitChecker = {
    check() {
      const checks = {
        '光标元素': !!Utils.getElement('.cursor-dot'),
        '时钟元素': !!Utils.getElement('#time'),
        '一言元素': !!Utils.getElement('#hitokoto'),
        '导航元素': !!Utils.getElement('.navbar'),
      };

      console.log(
        '%c=== 页面元素检查 ===',
        'color: #c9a87c; font-size: 16px; font-weight: bold;'
      );

      Object.entries(checks).forEach(([name, status]) => {
        console.log(`${status ? '✅' : '❌'} ${name}: ${status ? '正常' : '缺失'}`);
      });
    },
  };

  // ==================== 控制台彩蛋 ====================
  const ConsoleArt = {
    show() {
      console.log(
        '%c欢迎来到 Xuoh 的个人主页！',
        'color: #c9a87c; font-size: 24px; font-weight: bold;'
      );
      console.log(
        '%c按 R 键可以刷新一言哦~',
        'color: #eae7e0; font-size: 16px;'
      );
      console.log(
        '%c✨ 页面初始化完成！所有功能已就绪',
        'color: #eae7e0; font-size: 16px;'
      );
      console.log(
        '%c制作: Xuoh | 技术栈: HTML5 + CSS3 + Vanilla JS',
        'color: #8a8a86; font-size: 12px;'
      );
      console.log('%c版本: 4.0 (墨金 · 设计改版)', 'color: #c9a87c; font-size: 12px;');
    },
  };

  // ==================== 主应用 ====================
  const App = {
    init() {
      // 错误处理必须最先初始化
      ErrorHandler.init();

      // 内容保护系统（优先初始化）
      ContentProtection.init();

      // 首屏关键系统先启动；星空/粒子由 Loader 结束后延迟挂载
      CursorSystem.init();
      MotionSystem.init();
      ClockSystem.init();
      HitokotoSystem.init();
      FooterSystem.init();
      NavigationSystem.init();
      ScrollSystem.init();
      TouchSystem.init();
      KeyboardSystem.init();
      EasterEggSystem.init();
      ImageSystem.init();
      ResponsiveSystem.init();
      LoaderSystem.init();
      PerformanceMonitor.init();
      VisibilityManager.init();

      // 初始化检查
      InitChecker.check();

      // 显示控制台艺术
      ConsoleArt.show();
    },

    destroy() {
      MotionSystem.destroy();
      StarSystem.destroy();
      MeteorSystem.destroy();
      DustSystem.destroy();
      CursorSystem.destroy();
      ClockSystem.destroy();
      HitokotoSystem.destroy();
    },
  };

  // ==================== 全局暴露的函数 ====================
  window.navigate = (page, event) => NavigationSystem.navigate(page, event);
  window.refreshHitokoto = () => HitokotoSystem.refresh();

  // ==================== 启动应用 ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

  // ==================== 页面卸载清理 ====================
  // 注意：不能挂在 beforeunload 上做清理——点击 mailto 链接会触发 beforeunload
  // 但页面并不会真正卸载，之前在这里 destroy 导致返回后光标运动循环被杀死、
  // 光标卡住。真正卸载时浏览器会自行回收资源，无需手动清理。

})();
