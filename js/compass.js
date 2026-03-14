(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     3-D Civic Compass — multidimensional citizen vector
     Renders a rotating 3-D polytope on <canvas>,
     where each vertex-axis maps to a civic dimension.
     ───────────────────────────────────────────── */

  var TAU = Math.PI * 2;
  var ROTATE_SPEED   = 0.003;
  var LERP           = 0.045;
  var PROFILE_HOLD   = 5000;     // ms per profile slide
  var FOV            = 600;      // perspective distance
  var AXIS_OVERSHOOT = 1.15;     // how far axis lines extend past data

  /* ── Dimensions (8 axes distributed on a sphere) ── */
  var DIMS = {
    en: [
      'Economic\nFreedom',
      'Civil\nLiberties',
      'Digital\nRights',
      'Healthcare',
      'Education',
      'Environment',
      'Governance\nReform',
      'Security &\nDefence',
    ],
    fa: [
      'آزادی\nاقتصادی',
      'آزادی‌های\nمدنی',
      'حقوق\nدیجیتال',
      'بهداشت',
      'آموزش',
      'محیط\nزیست',
      'اصلاح\nحکمرانی',
      'امنیت و\nدفاع',
    ],
  };

  /* ── Example citizen profiles that cycle ── */
  var PROFILES = {
    en: [
      { name: 'Citizen A — Diaspora Activist',  values: [0.80, 0.95, 0.90, 0.65, 0.75, 0.55, 0.85, 0.35] },
      { name: 'Citizen B — Homeland Student',    values: [0.50, 0.70, 0.85, 0.80, 0.90, 0.70, 0.60, 0.45] },
      { name: 'Citizen C — Policy Researcher',   values: [0.65, 0.60, 0.55, 0.85, 0.70, 0.90, 0.75, 0.55] },
      { name: 'Coalition Consensus',             values: [0.65, 0.75, 0.77, 0.77, 0.78, 0.72, 0.73, 0.45] },
    ],
    fa: [
      { name: 'شهروند الف — فعال مهاجر',           values: [0.80, 0.95, 0.90, 0.65, 0.75, 0.55, 0.85, 0.35] },
      { name: 'شهروند ب — دانشجوی داخل کشور',      values: [0.50, 0.70, 0.85, 0.80, 0.90, 0.70, 0.60, 0.45] },
      { name: 'شهروند ج — پژوهشگر سیاسی',           values: [0.65, 0.60, 0.55, 0.85, 0.70, 0.90, 0.75, 0.55] },
      { name: 'توافق ائتلافی',                       values: [0.65, 0.75, 0.77, 0.77, 0.78, 0.72, 0.73, 0.45] },
    ],
  };

  /* ── Axis colours ── */
  var AXIS_COLORS = [
    '#0EBB90', '#8CDAF5', '#FEEB34', '#E87461',
    '#A78BFA', '#F59E0B', '#34D399', '#60A5FA',
  ];

  /* ── Math helpers ── */
  function lerp(a, b, t) { return a + (b - a) * t; }
  function hexRGBA(hex, a) {
    var r = parseInt(hex.slice(1, 3), 16);
    var g = parseInt(hex.slice(3, 5), 16);
    var b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /* Distribute N points roughly uniform on unit sphere (Fibonacci lattice) */
  function fibSphere(n) {
    var pts = [];
    var golden = (1 + Math.sqrt(5)) / 2;
    for (var i = 0; i < n; i++) {
      var theta = Math.acos(1 - 2 * (i + 0.5) / n);
      var phi   = TAU * i / golden;
      pts.push({
        x: Math.sin(theta) * Math.cos(phi),
        y: Math.sin(theta) * Math.sin(phi),
        z: Math.cos(theta),
      });
    }
    return pts;
  }

  /* Rotate point around Y then X */
  function rotate(p, ay, ax) {
    // Y-axis
    var cosY = Math.cos(ay), sinY = Math.sin(ay);
    var x1 = p.x * cosY + p.z * sinY;
    var z1 = -p.x * sinY + p.z * cosY;
    // X-axis
    var cosX = Math.cos(ax), sinX = Math.sin(ax);
    var y1 = p.y * cosX - z1 * sinX;
    var z2 = p.y * sinX + z1 * cosX;
    return { x: x1, y: y1, z: z2 };
  }

  /* Project 3-D → 2-D */
  function project(p, cx, cy, scale) {
    var f = FOV / (FOV + p.z * scale);
    return { x: cx + p.x * scale * f, y: cy + p.y * scale * f, f: f };
  }

  /* ── CivicCompass ── */
  function CivicCompass(el) {
    this.el = el;
    this.lang = document.documentElement.lang === 'fa' ? 'fa' : 'en';
    this.dims     = DIMS[this.lang]     || DIMS.en;
    this.profiles = PROFILES[this.lang] || PROFILES.en;
    this.N = this.dims.length;
    this.axes3D = fibSphere(this.N);

    // Current interpolated values
    this.curVals = this.profiles[0].values.slice();
    this.tgtVals = this.curVals.slice();
    this.curIdx  = 0;
    this.angleY  = 0;
    this.angleX  = 0.35;  // slight tilt

    this.visible = false;
    this.raf = null;

    this._buildDOM();
    this._resize();

    var self = this;
    this._obs = new IntersectionObserver(function (entries) {
      self.visible = entries[0].isIntersecting;
      if (self.visible && !self.raf) self._loop();
    }, { threshold: 0.1 });
    this._obs.observe(this.el);

    this._startAuto();
    window.addEventListener('resize', function () { self._resize(); });
  }

  CivicCompass.prototype._buildDOM = function () {
    this.el.innerHTML = '';
    this.el.classList.add('compass-3d');

    // Profile name
    this.nameEl = document.createElement('div');
    this.nameEl.className = 'compass-profile-name';
    this.nameEl.textContent = this.profiles[0].name;
    this.el.appendChild(this.nameEl);

    // Canvas
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'compass-canvas';
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    // Dots nav
    this.navEl = document.createElement('div');
    this.navEl.className = 'compass-nav';
    var self = this;
    this.profiles.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'compass-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Profile ' + (i + 1));
      dot.addEventListener('click', function () { self._goTo(i); });
      self.navEl.appendChild(dot);
    });
    this.el.appendChild(this.navEl);
  };

  CivicCompass.prototype._resize = function () {
    var box = this.el.getBoundingClientRect();
    var w = Math.min(box.width - 24, 520);
    var h = Math.min(w, 420);
    if (w < 200) { w = 280; h = 260; }

    var dpr = window.devicePixelRatio || 1;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w;
    this.H = h;
    this.CX = w / 2;
    this.CY = h / 2;
    this.SCALE = Math.min(w, h) * 0.32;
  };

  CivicCompass.prototype._goTo = function (i) {
    if (i === this.curIdx) return;
    this.curIdx = i;
    this.tgtVals = this.profiles[i].values.slice();
    this.nameEl.textContent = this.profiles[i].name;

    var dots = this.navEl.querySelectorAll('.compass-dot');
    dots.forEach(function (d, di) { d.classList.toggle('active', di === i); });
    this._resetAuto();
  };

  CivicCompass.prototype._next = function () {
    this._goTo((this.curIdx + 1) % this.profiles.length);
  };

  CivicCompass.prototype._startAuto = function () {
    var self = this;
    this._timer = setInterval(function () {
      if (self.visible) self._next();
    }, PROFILE_HOLD);
  };

  CivicCompass.prototype._resetAuto = function () {
    clearInterval(this._timer);
    this._startAuto();
  };

  CivicCompass.prototype._loop = function () {
    var self = this;
    function frame() {
      if (!self.visible) { self.raf = null; return; }
      self._update();
      self._render();
      self.raf = requestAnimationFrame(frame);
    }
    this.raf = requestAnimationFrame(frame);
  };

  CivicCompass.prototype._update = function () {
    this.angleY += ROTATE_SPEED;
    for (var i = 0; i < this.N; i++) {
      this.curVals[i] = lerp(this.curVals[i], this.tgtVals[i], LERP);
    }
  };

  CivicCompass.prototype._render = function () {
    var ctx = this.ctx, W = this.W, H = this.H;
    var CX = this.CX, CY = this.CY, S = this.SCALE;
    var isFA = this.lang === 'fa';
    var isLight = (document.documentElement.getAttribute('data-theme') !== 'dark') && (isFA || document.documentElement.getAttribute('data-theme') === 'light');
    var font = isFA ? '"Nian", sans-serif' : '"Inter", sans-serif';

    ctx.clearRect(0, 0, W, H);

    // Pre-compute rotated axis endpoints + data points
    var axisEnds = [];   // unit sphere points rotated & projected
    var dataEnds = [];   // scaled by citizen values
    var zOrder   = [];

    for (var i = 0; i < this.N; i++) {
      var a = this.axes3D[i];
      var r = rotate(a, this.angleY, this.angleX);
      var pAxis = project(r, CX, CY, S * AXIS_OVERSHOOT);
      var rData = { x: r.x * this.curVals[i], y: r.y * this.curVals[i], z: r.z * this.curVals[i] };
      var pData = project(rData, CX, CY, S);
      axisEnds.push(pAxis);
      dataEnds.push(pData);
      zOrder.push({ i: i, z: r.z });
    }

    // ── Grid rings (3 concentric) ──
    var gridSteps = [0.33, 0.66, 1.0];
    for (var gi = 0; gi < gridSteps.length; gi++) {
      var gVal = gridSteps[gi];
      ctx.beginPath();
      for (var j = 0; j < this.N; j++) {
        var a2 = this.axes3D[j];
        var r2 = rotate({ x: a2.x * gVal, y: a2.y * gVal, z: a2.z * gVal }, this.angleY, this.angleX);
        var p2 = project(r2, CX, CY, S);
        if (j === 0) ctx.moveTo(p2.x, p2.y);
        else ctx.lineTo(p2.x, p2.y);
      }
      ctx.closePath();
      ctx.strokeStyle = isLight ? 'rgba(30,58,107,0.08)' : 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }

    // ── Axis lines (from center to outer) ──
    for (var k = 0; k < this.N; k++) {
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(axisEnds[k].x, axisEnds[k].y);
      ctx.strokeStyle = hexRGBA(AXIS_COLORS[k], 0.25);
      ctx.lineWidth = 1;
      ctx.stroke();

      // Axis endpoint dot
      ctx.beginPath();
      ctx.arc(axisEnds[k].x, axisEnds[k].y, 2.5, 0, TAU);
      ctx.fillStyle = hexRGBA(AXIS_COLORS[k], 0.5);
      ctx.fill();
    }

    // ── 3-D Data shape (filled polygon connecting data points) ──
    // Sort faces by depth — draw back-to-front
    // Simple approach: draw the filled polygon with semi-transparency

    // Filled shape
    ctx.beginPath();
    for (var m = 0; m < this.N; m++) {
      if (m === 0) ctx.moveTo(dataEnds[m].x, dataEnds[m].y);
      else ctx.lineTo(dataEnds[m].x, dataEnds[m].y);
    }
    ctx.closePath();
    ctx.fillStyle = isLight ? 'rgba(91,157,245,0.12)' : 'rgba(91,157,245,0.12)';
    ctx.fill();

    // Shape outline
    ctx.beginPath();
    for (var m2 = 0; m2 < this.N; m2++) {
      if (m2 === 0) ctx.moveTo(dataEnds[m2].x, dataEnds[m2].y);
      else ctx.lineTo(dataEnds[m2].x, dataEnds[m2].y);
    }
    ctx.closePath();
    ctx.strokeStyle = isLight ? 'rgba(91,157,245,0.6)' : 'rgba(91,157,245,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Inner triangles from center to each edge for depth illusion
    for (var t = 0; t < this.N; t++) {
      var t2 = (t + 1) % this.N;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(dataEnds[t].x, dataEnds[t].y);
      ctx.lineTo(dataEnds[t2].x, dataEnds[t2].y);
      ctx.closePath();
      // Average z of the two vertices — deeper faces are more transparent
      var avgZ = (zOrder[t].z + zOrder[t2].z) / 2;
      var faceAlpha = 0.04 + (1 + avgZ) * 0.04;
      ctx.fillStyle = hexRGBA(AXIS_COLORS[t], faceAlpha);
      ctx.fill();
    }

    // ── Data point nodes on vertices ──
    zOrder.sort(function (a, b) { return a.z - b.z; });
    for (var q = 0; q < zOrder.length; q++) {
      var idx = zOrder[q].i;
      var dp = dataEnds[idx];
      var depthAlpha = 0.5 + (1 + zOrder[q].z) * 0.25;
      var nodeR = 3 + dp.f * 2;

      // Glow
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, nodeR + 4, 0, TAU);
      ctx.fillStyle = hexRGBA(AXIS_COLORS[idx], depthAlpha * 0.25);
      ctx.fill();

      // Node
      ctx.beginPath();
      ctx.arc(dp.x, dp.y, nodeR, 0, TAU);
      ctx.fillStyle = hexRGBA(AXIS_COLORS[idx], depthAlpha);
      ctx.fill();
    }

    // ── Axis labels (draw front-most on top) ──
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '600 9px ' + font;

    for (var li = 0; li < zOrder.length; li++) {
      var lIdx = zOrder[li].i;
      var le = axisEnds[lIdx];
      var lz = zOrder[li].z;
      var labAlpha = 0.35 + (1 + lz) * 0.32;
      if (labAlpha > 1) labAlpha = 1;

      // Position label slightly further out from axis end
      var ldx = le.x - CX;
      var ldy = le.y - CY;
      var lLen = Math.sqrt(ldx * ldx + ldy * ldy) || 1;
      var labX = le.x + (ldx / lLen) * 18;
      var labY = le.y + (ldy / lLen) * 18;

      var lines = this.dims[lIdx].split('\n');
      ctx.fillStyle = isLight
        ? hexRGBA('#1E3A6B', labAlpha)
        : hexRGBA('#ffffff', labAlpha);

      for (var ll = 0; ll < lines.length; ll++) {
        ctx.fillText(lines[ll], labX, labY + (ll - (lines.length - 1) / 2) * 11);
      }
    }

    // ── Center marker ──
    ctx.beginPath();
    ctx.arc(CX, CY, 2, 0, TAU);
    ctx.fillStyle = isLight ? 'rgba(30,58,107,0.25)' : 'rgba(255,255,255,0.2)';
    ctx.fill();
  };

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.querySelector('.compass-visual');
    if (el) new CivicCompass(el);
  });

})();
