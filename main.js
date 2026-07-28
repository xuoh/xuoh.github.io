/**
 * Xuoh 个人主页 - 主脚本
 * 版本: 3.0 (优化版)
 * 使用 IIFE 模式封装，避免全局变量污染
 */

(function () {
  'use strict';

  // ==================== 配置常量 ====================
  const CONFIG = {
    PARTICLE_COUNT_DESKTOP: 30,
    PARTICLE_COUNT_MOBILE: 15,
    CURSOR_SPEED: 0.2,
    MOBILE_BREAKPOINT: 768,
    HITOKOTO_TIMEOUT: 8000,
    CLOCK_UPDATE_INTERVAL: 1000,
    DEBOUNCE_DELAY: 250,
    EASTER_EGG_CLICKS: 5,
    SWIPE_THRESHOLD: 100,
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

  // ==================== 光标系统 ====================
  const CursorSystem = {
    cursor: null,
    mouseX: 0,
    mouseY: 0,
    cursorX: 0,
    cursorY: 0,
    rafId: null,
    isActive: false,

    init() {
      if (Utils.isMobile() || Utils.isTouchDevice()) {
        return;
      }

      this.cursor = Utils.getElement('.cursor');
      if (!this.cursor) return;

      this.isActive = true;
      this.bindEvents();
      this.animate();
    },

    bindEvents() {
      document.addEventListener('mousemove', (e) => {
        this.mouseX = e.clientX;
        this.mouseY = e.clientY;

        if (this.cursorX === 0 && this.cursorY === 0) {
          this.cursorX = this.mouseX;
          this.cursorY = this.mouseY;
        }
      }, { passive: true });

      document.addEventListener('mousedown', () => {
        this.cursor?.classList.add('click');
      }, { passive: true });

      document.addEventListener('mouseup', () => {
        this.cursor?.classList.remove('click');
      }, { passive: true });

      document.addEventListener('mouseover', (e) => {
        if (e.target.closest('button, a, .logo, .refresh-btn, .logo-wrapper')) {
          this.cursor?.classList.add('hover');
        }
      }, { passive: true });

      document.addEventListener('mouseout', (e) => {
        if (e.target.closest('button, a, .logo, .refresh-btn, .logo-wrapper')) {
          this.cursor?.classList.remove('hover');
        }
      }, { passive: true });

      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pause();
        } else {
          this.resume();
        }
      });
    },

    animate() {
      if (!this.isActive || !this.cursor) return;

      const distX = this.mouseX - this.cursorX;
      const distY = this.mouseY - this.cursorY;

      this.cursorX += distX * CONFIG.CURSOR_SPEED;
      this.cursorY += distY * CONFIG.CURSOR_SPEED;

      this.cursor.style.transform = `translate3d(${this.cursorX}px, ${this.cursorY}px, 0) translate(-50%, -50%)`;

      this.rafId = requestAnimationFrame(() => this.animate());
    },

    pause() {
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    },

    resume() {
      if (this.isActive && !this.rafId) {
        this.animate();
      }
    },

    destroy() {
      this.pause();
      this.isActive = false;
    },
  };

  // ==================== 星空系统 ====================
  const StarSystem = {
    container: null,
    stars: [],

    init() {
      // 创建星空容器
      this.container = document.createElement('div');
      this.container.className = 'stars';
      this.container.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(this.container, document.body.firstChild);

      this.createStars();
      this.bindEvents();
    },

    createStars() {
      const starCount = Utils.isMobile() ? 80 : 150;
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

        // 随机闪烁速度
        star.style.animationDuration = `${Math.random() * 3 + 2}s`;
        star.style.animationDelay = `${Math.random() * 3}s`;

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
      }
    },
  };

  // ==================== 粒子系统 ====================
  const ParticleSystem = {
    container: null,
    particles: [],

    init() {
      this.container = Utils.getElement('#particles');
      if (!this.container) return;

      this.createParticles();
      this.bindEvents();
    },

    createParticles() {
      const count = Utils.isMobile()
        ? CONFIG.PARTICLE_COUNT_MOBILE
        : CONFIG.PARTICLE_COUNT_DESKTOP;

      const fragment = document.createDocumentFragment();

      for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        const size = Math.random() * 5 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${Math.random() * 10 + 10}s`;
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.setProperty('--x-move', `${Math.random() * 200 - 100}px`);

        fragment.appendChild(particle);
        this.particles.push(particle);
      }

      this.container.appendChild(fragment);
    },

    bindEvents() {
      document.addEventListener('visibilitychange', () => {
        const state = document.hidden ? 'paused' : 'running';
        this.particles.forEach(p => {
          p.style.animationPlayState = state;
        });
      });
    },

    resume() {
      this.particles.forEach(p => {
        p.style.animationPlayState = 'running';
      });
    },

    destroy() {
      this.particles.forEach(p => p.remove());
      this.particles = [];
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

    init() {
      this.hitokotoElement = Utils.getElement('#hitokoto');
      this.fromElement = Utils.getElement('#hitokoto-from');

      if (!this.hitokotoElement || !this.fromElement) return;

      setTimeout(() => this.fetch(), 500);
      this.bindNetworkEvents();
    },

    async fetch() {
      if (this.isLoading) return;

      this.isLoading = true;
      this.hitokotoElement.style.opacity = '0';
      this.hitokotoElement.textContent = '加载中...';
      this.fromElement.textContent = '';

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
      if (this.controller) {
        this.controller.abort();
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

  // ==================== 微信复制系统 ====================
  const WechatSystem = {
    wechatName: '暂无',
    toastTimeout: null,

    async copy() {
      try {
        await navigator.clipboard.writeText(this.wechatName);
        this.showToast('已复制微信名: ' + this.wechatName);
      } catch (error) {
        // 如果 clipboard API 不可用，使用传统方法
        this.fallbackCopy();
      }
    },

    fallbackCopy() {
      const textarea = document.createElement('textarea');
      textarea.value = this.wechatName;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();

      try {
        document.execCommand('copy');
        this.showToast('已复制微信名: ' + this.wechatName);
      } catch (error) {
        this.showToast('复制失败，请手动复制');
        console.error('复制失败:', error);
      }

      document.body.removeChild(textarea);
    },

    showToast(message) {
      // 移除已存在的提示
      const existingToast = document.querySelector('.wechat-toast');
      if (existingToast) {
        existingToast.remove();
      }

      // 清除之前的定时器
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
      }

      // 创建提示元素
      const toast = document.createElement('div');
      toast.className = 'wechat-toast';
      toast.textContent = message;
      document.body.appendChild(toast);

      // 触发动画
      setTimeout(() => {
        toast.classList.add('show');
      }, 10);

      // 2秒后移除
      this.toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
          toast.remove();
        }, 300);
      }, 2000);
    },
  };

  // ==================== Logo 交互系统 ====================
  const LogoSystem = {
    logoWrapper: null,

    init() {
      this.logoWrapper = Utils.getElement('.logo-wrapper');
      if (!this.logoWrapper || Utils.isMobile()) return;

      this.bindEvents();
    },

    bindEvents() {
      this.logoWrapper.addEventListener('mousemove', (e) => {
        const rect = this.logoWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const rotateX = (y / rect.height) * 20;
        const rotateY = (x / rect.width) * 20;

        this.logoWrapper.style.transform =
          `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
      });

      this.logoWrapper.addEventListener('mouseleave', () => {
        this.logoWrapper.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
      });
    },
  };

  // ==================== 滚动系统 ====================
  const ScrollSystem = {
    init() {
      // 禁用页面滚动，不需要滚动监听
      // 页面现在是固定的单屏展示
    },
  };

  // ==================== 3D视差系统 ====================
  const ParallaxSystem = {
    container: null,
    stars: null,

    init() {
      if (Utils.isMobile()) return; // 移动端禁用视差效果

      this.container = Utils.getElement('.container');
      this.stars = Utils.getElement('.stars');

      if (!this.container) return;

      this.bindEvents();
    },

    bindEvents() {
      document.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        // 计算偏移量（中心点为0）
        const offsetX = (mouseX - 0.5) * 2;
        const offsetY = (mouseY - 0.5) * 2;

        // 星空轻微移动
        if (this.stars) {
          const starMoveX = offsetX * 15;
          const starMoveY = offsetY * 15;
          this.stars.style.transform = `translate(${starMoveX}px, ${starMoveY}px)`;
        }

        // 主容器3D倾斜
        if (this.container) {
          const rotateX = offsetY * -3; // 上下倾斜（减小幅度）
          const rotateY = offsetX * 3;  // 左右倾斜（减小幅度）
          this.container.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
        }
      }, { passive: true });

      // 鼠标离开时恢复
      document.addEventListener('mouseleave', () => {
        if (this.stars) {
          this.stars.style.transform = 'translate(0, 0)';
        }
        if (this.container) {
          this.container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)';
        }
      });
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
      console.log('%c🎉 你发现了隐藏彩蛋！', 'color: #f093fb; font-size: 24px; font-weight: bold;');
      document.body.style.animation = 'rainbow 2s linear';
      setTimeout(() => {
        document.body.style.animation = '';
      }, 2000);
    },
  };

  // ==================== 图片加载系统 ====================
  const ImageSystem = {
    init() {
      Utils.getElements('img').forEach(img => {
        img.addEventListener('error', function() {
          console.warn('图片加载失败:', this.src);
          this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect fill="%23667eea" width="150" height="150"/%3E%3Ctext fill="%23fff" font-size="60" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EX%3C/text%3E%3C/svg%3E';
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
      window.addEventListener('resize', Utils.debounce(() => {
        this.adjustFontSize();
        this.handleResize();
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

    handleResize() {
      const cursor = Utils.getElement('.cursor');
      if (cursor) {
        cursor.style.display = Utils.isMobile() ? 'none' : 'block';
      }
    },
  };

  // ==================== 加载器系统 ====================
  const LoaderSystem = {
    init() {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const loader = Utils.getElement('.loader');
          if (loader) {
            loader.style.display = 'none';
          }
        }, 1500);
      });
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

      // 恢复粒子动画
      if (ParticleSystem.resume) {
        ParticleSystem.resume();
      }

      // 恢复时钟
      if (ClockSystem.resume) {
        ClockSystem.resume();
      }

      // 恢复光标动画
      if (CursorSystem.resume) {
        CursorSystem.resume();
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
        '光标元素': !!Utils.getElement('.cursor'),
        '时钟元素': !!Utils.getElement('#time'),
        '一言元素': !!Utils.getElement('#hitokoto'),
        '导航元素': !!Utils.getElement('.navbar'),
        '粒子容器': !!Utils.getElement('#particles'),
      };

      console.log(
        '%c=== 页面元素检查 ===',
        'color: #667eea; font-size: 16px; font-weight: bold;'
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
        'color: #667eea; font-size: 24px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);'
      );
      console.log(
        '%c按 R 键可以刷新一言哦~',
        'color: #64c8ff; font-size: 16px; font-weight: bold;'
      );
      console.log(
        '%c✨ 页面初始化完成！所有功能已就绪',
        'color: #64c8ff; font-size: 16px; font-weight: bold;'
      );
      console.log(
        '%c制作: Xuoh | 技术栈: HTML5 + CSS3 + Vanilla JS',
        'color: #a78bfa; font-size: 12px;'
      );
      console.log('%c版本: 3.0 (优化版)', 'color: #4ade80; font-size: 12px;');
    },
  };

  // ==================== 主应用 ====================
  const App = {
    init() {
      // 错误处理必须最先初始化
      ErrorHandler.init();

      // 内容保护系统（优先初始化）
      ContentProtection.init();

      // 初始化所有系统
      StarSystem.init();          // 星空效果
      ParallaxSystem.init();      // 3D视差效果
      CursorSystem.init();
      ParticleSystem.init();
      ClockSystem.init();
      HitokotoSystem.init();
      NavigationSystem.init();
      LogoSystem.init();
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

      // 添加平滑过渡
      Utils.getElements('a, button').forEach(element => {
        element.style.transition = 'all 0.3s ease';
      });

      // 页面进入动画
      document.addEventListener('DOMContentLoaded', () => {
        document.body.style.opacity = '0';
        setTimeout(() => {
          document.body.style.transition = 'opacity 0.5s ease';
          document.body.style.opacity = '1';
        }, 100);
      });
    },

    destroy() {
      StarSystem.destroy();
      CursorSystem.destroy();
      ParticleSystem.destroy();
      ClockSystem.destroy();
      HitokotoSystem.destroy();
    },
  };

  // ==================== 全局暴露的函数 ====================
  window.navigate = (page, event) => NavigationSystem.navigate(page, event);
  window.refreshHitokoto = () => HitokotoSystem.refresh();
  window.copyWechat = () => WechatSystem.copy();

  // ==================== 启动应用 ====================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
  } else {
    App.init();
  }

  // ==================== 页面卸载清理 ====================
  window.addEventListener('beforeunload', () => {
    App.destroy();
  });

})();
