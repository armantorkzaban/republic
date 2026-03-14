(function () {
  'use strict';

  /* ── Configuration ── */
  var TOTAL_NODES   = 90;
  var SLIDE_INTERVAL = 6000;
  var LERP_SPEED     = 0.04;
  var NODE_MIN_R     = 2;
  var NODE_MAX_R     = 5;
  var EDGE_DIST      = 58;
  var EDGE_OPACITY   = 0.14;

  /* ── Theme-aware color palettes ── */
  // Keys used in slide data; mapped to actual hex per theme
  var COLOR_PALETTES = {
    dark: { A: '#34D399', B: '#60A5FA', C: '#FBBF24' },   // bright on dark bg
    light: { A: '#059669', B: '#2563EB', C: '#B45309' },   // deeper on light bg
  };

  function currentPalette() {
    var isFA  = document.documentElement.lang === 'fa';
    var theme = document.documentElement.getAttribute('data-theme');
    // EN default = dark, FA default = light
    var isDark = isFA ? (theme === 'dark') : (theme !== 'light');
    return isDark ? COLOR_PALETTES.dark : COLOR_PALETTES.light;
  }

  /* ── Slide data (colors use palette keys A/B/C) ── */
  var SLIDES = {
    en: [
      {
        topic: 'Healthcare Reform',
        meta: '2,847 participants · 94 statements',
        clusters: [
          { label: 'Universal\nAccess',   colorKey: 'A', cx: 0.22, cy: 0.32, spread: 0.13, weight: 0.38 },
          { label: 'Mixed\nSystem',       colorKey: 'B', cx: 0.55, cy: 0.62, spread: 0.11, weight: 0.30 },
          { label: 'Private-Led',         colorKey: 'C', cx: 0.80, cy: 0.28, spread: 0.09, weight: 0.22 },
        ],
        consensus: '78% agree: "Essential medicines must be accessible regardless of income"',
      },
      {
        topic: 'Education Policy',
        meta: '4,123 participants · 127 statements',
        clusters: [
          { label: 'Secular\nReform',     colorKey: 'B', cx: 0.26, cy: 0.30, spread: 0.12, weight: 0.35 },
          { label: 'Traditional',         colorKey: 'C', cx: 0.76, cy: 0.28, spread: 0.10, weight: 0.25 },
          { label: 'Consensus\nZone',     colorKey: 'A', cx: 0.50, cy: 0.68, spread: 0.13, weight: 0.35 },
        ],
        consensus: '84% agree: "Critical thinking should be core curriculum"',
      },
      {
        topic: 'Economic Freedom',
        meta: '3,561 participants · 108 statements',
        clusters: [
          { label: 'Open\nMarket',        colorKey: 'C', cx: 0.24, cy: 0.35, spread: 0.11, weight: 0.30 },
          { label: 'Social\nDemocracy',   colorKey: 'A', cx: 0.52, cy: 0.28, spread: 0.12, weight: 0.35 },
          { label: 'Cooperative\nModel',  colorKey: 'B', cx: 0.76, cy: 0.62, spread: 0.10, weight: 0.25 },
        ],
        consensus: '71% agree: "Banking system must be transparent and accountable"',
      },
      {
        topic: 'Digital Rights',
        meta: '5,290 participants · 156 statements',
        clusters: [
          { label: 'Privacy\nFirst',      colorKey: 'A', cx: 0.28, cy: 0.38, spread: 0.14, weight: 0.40 },
          { label: 'Open\nInternet',      colorKey: 'B', cx: 0.72, cy: 0.32, spread: 0.12, weight: 0.35 },
          { label: 'Regulated',           colorKey: 'C', cx: 0.55, cy: 0.72, spread: 0.08, weight: 0.15 },
        ],
        consensus: '92% agree: "Internet access is a fundamental right"',
      },
      {
        topic: 'Environmental Law',
        meta: '2,198 participants · 73 statements',
        clusters: [
          { label: 'Strong\nRegulation',  colorKey: 'A', cx: 0.28, cy: 0.34, spread: 0.13, weight: 0.40 },
          { label: 'Market\nIncentives',  colorKey: 'C', cx: 0.74, cy: 0.36, spread: 0.10, weight: 0.25 },
          { label: 'Local\nAction',       colorKey: 'B', cx: 0.52, cy: 0.70, spread: 0.11, weight: 0.30 },
        ],
        consensus: '88% agree: "Water resources must be managed as public commons"',
      },
    ],
    fa: [
      {
        topic: 'اصلاح نظام بهداشت',
        meta: '۲٬۸۴۷ مشارکت‌کننده · ۹۴ گزاره',
        clusters: [
          { label: 'دسترسی\nهمگانی',     colorKey: 'A', cx: 0.22, cy: 0.32, spread: 0.13, weight: 0.38 },
          { label: 'نظام\nترکیبی',       colorKey: 'B', cx: 0.55, cy: 0.62, spread: 0.11, weight: 0.30 },
          { label: 'بخش خصوصی',           colorKey: 'C', cx: 0.80, cy: 0.28, spread: 0.09, weight: 0.22 },
        ],
        consensus: '٪۷۸ موافق: «داروهای ضروری باید بدون توجه به درآمد در دسترس باشند»',
      },
      {
        topic: 'سیاست آموزشی',
        meta: '۴٬۱۲۳ مشارکت‌کننده · ۱۲۷ گزاره',
        clusters: [
          { label: 'اصلاح\nسکولار',       colorKey: 'B', cx: 0.26, cy: 0.30, spread: 0.12, weight: 0.35 },
          { label: 'سنتی',                colorKey: 'C', cx: 0.76, cy: 0.28, spread: 0.10, weight: 0.25 },
          { label: 'منطقه\nتوافق',        colorKey: 'A', cx: 0.50, cy: 0.68, spread: 0.13, weight: 0.35 },
        ],
        consensus: '٪۸۴ موافق: «تفکر انتقادی باید در هسته برنامه درسی باشد»',
      },
      {
        topic: 'آزادی اقتصادی',
        meta: '۳٬۵۶۱ مشارکت‌کننده · ۱۰۸ گزاره',
        clusters: [
          { label: 'بازار\nآزاد',         colorKey: 'C', cx: 0.24, cy: 0.35, spread: 0.11, weight: 0.30 },
          { label: 'سوسیال\nدموکراسی',    colorKey: 'A', cx: 0.52, cy: 0.28, spread: 0.12, weight: 0.35 },
          { label: 'تعاونی',              colorKey: 'B', cx: 0.76, cy: 0.62, spread: 0.10, weight: 0.25 },
        ],
        consensus: '٪۷۱ موافق: «سیستم بانکی باید شفاف و پاسخگو باشد»',
      },
      {
        topic: 'حقوق دیجیتال',
        meta: '۵٬۲۹۰ مشارکت‌کننده · ۱۵۶ گزاره',
        clusters: [
          { label: 'حریم\nخصوصی',          colorKey: 'A', cx: 0.28, cy: 0.38, spread: 0.14, weight: 0.40 },
          { label: 'اینترنت\nآزاد',        colorKey: 'B', cx: 0.72, cy: 0.32, spread: 0.12, weight: 0.35 },
          { label: 'تنظیم‌شده',            colorKey: 'C', cx: 0.55, cy: 0.72, spread: 0.08, weight: 0.15 },
        ],
        consensus: '٪۹۲ موافق: «دسترسی به اینترنت یک حق اساسی است»',
      },
      {
        topic: 'قوانین محیط زیست',
        meta: '۲٬۱۹۸ مشارکت‌کننده · ۷۳ گزاره',
        clusters: [
          { label: 'مقررات\nقوی',          colorKey: 'A', cx: 0.28, cy: 0.34, spread: 0.13, weight: 0.40 },
          { label: 'مشوق‌های\nبازار',      colorKey: 'C', cx: 0.74, cy: 0.36, spread: 0.10, weight: 0.25 },
          { label: 'اقدام\nمحلی',          colorKey: 'B', cx: 0.52, cy: 0.70, spread: 0.11, weight: 0.30 },
        ],
        consensus: '٪۸۸ موافق: «منابع آب باید به عنوان مشترکات عمومی مدیریت شوند»',
      },
    ],
  };

  /* ── Helpers ── */
  function gaussRand() {
    var u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function resolveColor(cl) {
    return currentPalette()[cl.colorKey] || '#888';
  }

  function hexToRGBA(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ── Node ── */
  function Node(x, y, r, ci, color) {
    this.x = x; this.y = y;
    this.tx = x; this.ty = y;
    this.r = r;
    this.ci = ci;
    this.color = color;
    this.op = 0;
    this.top = 0.7 + Math.random() * 0.25;
    this.da = Math.random() * Math.PI * 2;
    this.ds = 0.003 + Math.random() * 0.004;
    this.dr = 0.4 + Math.random() * 1.2;
  }

  Node.prototype.update = function () {
    this.x = lerp(this.x, this.tx, LERP_SPEED);
    this.y = lerp(this.y, this.ty, LERP_SPEED);
    this.op = lerp(this.op, this.top, 0.05);
    this.da += this.ds;
  };

  Object.defineProperty(Node.prototype, 'dx', {
    get: function () { return this.x + Math.cos(this.da) * this.dr; }
  });
  Object.defineProperty(Node.prototype, 'dy', {
    get: function () { return this.y + Math.sin(this.da) * this.dr; }
  });

  /* ── ClusterAnimation ── */
  function ClusterAnimation(el) {
    this.el = el;
    this.lang = document.documentElement.lang === 'fa' ? 'fa' : 'en';
    this.slides = SLIDES[this.lang] || SLIDES.en;
    this.cur = 0;
    this.nodes = [];
    this.visible = false;
    this.raf = null;

    this._buildDOM();
    this._resize();
    this._initNodes();
    this._setTargets(this.slides[0], true);
    this._updateText(this.slides[0]);

    var self = this;

    // Visibility observer — animate only when in viewport
    this._obs = new IntersectionObserver(function (entries) {
      self.visible = entries[0].isIntersecting;
      if (self.visible && !self.raf) self._loop();
    }, { threshold: 0.1 });
    this._obs.observe(this.el);

    // Auto-advance
    this._startAuto();

    // Resize (debounced)
    this._resizeTimer = null;
    var self = this;
    function onResize() {
      clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () { self._resize(); }, 100);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () {
      setTimeout(onResize, 200);
    });

    // Watch for theme changes and re-apply colors
    this._themeObs = new MutationObserver(function () {
      self._recolorNodes();
    });
    this._themeObs.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme']
    });
  }

  ClusterAnimation.prototype._buildDOM = function () {
    this.el.innerHTML = '';
    this.el.classList.add('cluster-slideshow');

    // Topic
    this.topicEl = document.createElement('div');
    this.topicEl.className = 'cluster-topic';
    this.el.appendChild(this.topicEl);

    // Meta
    this.metaEl = document.createElement('div');
    this.metaEl.className = 'cluster-meta';
    this.el.appendChild(this.metaEl);

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cluster-canvas';
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Consensus
    this.consEl = document.createElement('div');
    this.consEl.className = 'cluster-consensus';
    this.el.appendChild(this.consEl);

    // Nav dots
    this.navEl = document.createElement('div');
    this.navEl.className = 'cluster-nav';
    var self = this;
    this.slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'cluster-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Slide ' + (i + 1));
      dot.addEventListener('click', function () { self._goTo(i); });
      self.navEl.appendChild(dot);
    });
    this.el.appendChild(this.navEl);
  };

  ClusterAnimation.prototype._resize = function () {
    var style = getComputedStyle(this.el);
    var padL = parseFloat(style.paddingLeft) || 0;
    var padR = parseFloat(style.paddingRight) || 0;
    var w = this.el.clientWidth - padL - padR;
    if (w < 160) w = 160;
    var h = Math.max(200, Math.min(340, w * 0.65));

    var dpr = window.devicePixelRatio || 1;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;

    if (this.nodes.length) {
      this._setTargets(this.slides[this.cur], false);
    }
  };

  ClusterAnimation.prototype._initNodes = function () {
    this.nodes = [];
    for (var i = 0; i < TOTAL_NODES; i++) {
      var n = new Node(
        Math.random() * this.W,
        Math.random() * this.H,
        NODE_MIN_R + Math.random() * (NODE_MAX_R - NODE_MIN_R),
        0, '#888'
      );
      this.nodes.push(n);
    }
  };

  ClusterAnimation.prototype._setTargets = function (slide, instant) {
    var clusters = slide.clusters;
    var idx = 0;
    var remaining = TOTAL_NODES;
    var self = this;

    clusters.forEach(function (cl, ci) {
      var count = (ci === clusters.length - 1)
        ? remaining
        : Math.round(TOTAL_NODES * cl.weight);
      remaining -= count;

      for (var i = 0; i < count && idx < TOTAL_NODES; i++, idx++) {
        var angle = Math.random() * Math.PI * 2;
        var dist = Math.abs(gaussRand()) * cl.spread;
        var nx = (cl.cx + Math.cos(angle) * dist) * self.W;
        var ny = (cl.cy + Math.sin(angle) * dist) * self.H;

        self.nodes[idx].tx = nx;
        self.nodes[idx].ty = ny;
        self.nodes[idx].ci = ci;
        self.nodes[idx].color = resolveColor(cl);
        self.nodes[idx].top = 0.6 + Math.random() * 0.35;

        if (instant) {
          self.nodes[idx].x = nx;
          self.nodes[idx].y = ny;
          self.nodes[idx].op = self.nodes[idx].top;
        }
      }
    });
  };

  ClusterAnimation.prototype._updateText = function (slide) {
    this.topicEl.textContent = slide.topic;
    this.metaEl.textContent = slide.meta;
    this.consEl.textContent = slide.consensus;
  };

  ClusterAnimation.prototype._goTo = function (i) {
    if (i === this.cur) return;
    this.cur = i;
    var slide = this.slides[i];
    this._setTargets(slide, false);
    this._updateText(slide);

    // Update dots
    var dots = this.navEl.querySelectorAll('.cluster-dot');
    dots.forEach(function (d, di) {
      d.classList.toggle('active', di === i);
    });

    this._resetAuto();
  };

  ClusterAnimation.prototype._recolorNodes = function () {
    var slide = this.slides[this.cur];
    var palette = currentPalette();
    var idx = 0;
    var remaining = TOTAL_NODES;
    var self = this;

    slide.clusters.forEach(function (cl, ci) {
      var count = (ci === slide.clusters.length - 1)
        ? remaining
        : Math.round(TOTAL_NODES * cl.weight);
      remaining -= count;
      var color = palette[cl.colorKey] || '#888';
      for (var i = 0; i < count && idx < TOTAL_NODES; i++, idx++) {
        self.nodes[idx].color = color;
      }
    });
  };

  ClusterAnimation.prototype._next = function () {
    this._goTo((this.cur + 1) % this.slides.length);
  };

  ClusterAnimation.prototype._startAuto = function () {
    var self = this;
    this._timer = setInterval(function () {
      if (self.visible) self._next();
    }, SLIDE_INTERVAL);
  };

  ClusterAnimation.prototype._resetAuto = function () {
    clearInterval(this._timer);
    this._startAuto();
  };

  ClusterAnimation.prototype._loop = function () {
    var self = this;
    function frame() {
      if (!self.visible) { self.raf = null; return; }
      self._update();
      self._render();
      self.raf = requestAnimationFrame(frame);
    }
    this.raf = requestAnimationFrame(frame);
  };

  ClusterAnimation.prototype._update = function () {
    for (var i = 0; i < this.nodes.length; i++) {
      this.nodes[i].update();
    }
  };

  ClusterAnimation.prototype._render = function () {
    var ctx = this.ctx;
    var W = this.W;
    var H = this.H;
    var slide = this.slides[this.cur];

    ctx.clearRect(0, 0, W, H);

    // ── Cluster glows ──
    slide.clusters.forEach(function (cl) {
      var clColor = resolveColor(cl);
      var cx = cl.cx * W;
      var cy = cl.cy * H;
      var r = cl.spread * W * 1.8;
      var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, hexToRGBA(clColor, 0.08));
      grad.addColorStop(1, hexToRGBA(clColor, 0));
      ctx.fillStyle = grad;
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    });

    // ── Edges ──
    var edgeDist = Math.max(30, EDGE_DIST * (W / 400));
    var nodes = this.nodes;
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      if (a.ci < 0) continue;
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        if (b.ci !== a.ci) continue;
        var ddx = a.dx - b.dx;
        var ddy = a.dy - b.dy;
        var dist = Math.sqrt(ddx * ddx + ddy * ddy);
        if (dist < edgeDist) {
          var alpha = (1 - dist / edgeDist) * EDGE_OPACITY * Math.min(a.op, b.op);
          ctx.beginPath();
          ctx.moveTo(a.dx, a.dy);
          ctx.lineTo(b.dx, b.dy);
          ctx.strokeStyle = hexToRGBA(a.color, alpha);
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    // ── Nodes ──
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      ctx.beginPath();
      ctx.arc(n.dx, n.dy, n.r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRGBA(n.color, n.op);
      ctx.fill();
    }

    // ── Cluster labels ──
    var isFA = this.lang === 'fa';
    var isLight = (document.documentElement.getAttribute('data-theme') !== 'dark') && (isFA || document.documentElement.getAttribute('data-theme') === 'light');
    var fontFamily = isFA ? '"Nian", sans-serif' : '"Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    slide.clusters.forEach(function (cl) {
      var clColor = resolveColor(cl);
      var lx = cl.cx * W;
      var ly = (cl.cy - cl.spread - 0.06) * H;
      var lines = cl.label.split('\n');

      // Scale label size for small canvases
      var labelSize = W < 280 ? 8 : 10;
      var labelPad = W < 280 ? 12 : 18;

      // Measure
      ctx.font = '600 ' + labelSize + 'px ' + fontFamily;
      var maxW = 0;
      lines.forEach(function (line) {
        var m = ctx.measureText(line).width;
        if (m > maxW) maxW = m;
      });

      var pillW = maxW + labelPad;
      var lineH = labelSize + 3;
      var pillH = lines.length * lineH + 8;
      var px = lx - pillW / 2;
      var py = ly - pillH / 2;

      // Pill background
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = isLight ? 'rgba(244,246,247,0.85)' : 'rgba(17,17,17,0.75)';
      roundRect(ctx, px, py, pillW, pillH, 5);
      ctx.fill();

      // Label text
      ctx.globalAlpha = 1;
      ctx.fillStyle = clColor;
      ctx.font = '600 ' + labelSize + 'px ' + fontFamily;
      lines.forEach(function (line, li) {
        ctx.fillText(line, lx, py + (labelSize * 0.7 + 3) + li * lineH);
      });

      ctx.globalAlpha = 1;
    });
  };

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.querySelector('.deliberation-visual');
    if (el) new ClusterAnimation(el);
  });

})();
