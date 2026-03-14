(function () {
  'use strict';

  /* ─────────────────────────────────────────────
     Ranked-Pairs (Tideman) Voting Animation
     Two-phase canvas animation:
       Phase A — Ballots → Pairwise Tally → Sort
       Phase B — Lock edges into DAG → Winner
     Uses the classic Tennessee capital example.
     ───────────────────────────────────────────── */

  var TAU = Math.PI * 2;

  /* ── Labels ── */
  var LABELS = {
    en: {
      title: 'Ranked Pairs Voting',
      phase1: 'Phase 1 — Tally & Sort',
      phase2: 'Phase 2 — Lock & Winner',
      candidates: ['Memphis', 'Nashville', 'Chattanooga', 'Knoxville'],
      candidatesShort: ['MEM', 'NSH', 'CHA', 'KNX'],
      voterGroups: ['42% Memphis voters', '26% Nashville voters', '15% Chattanooga voters', '17% Knoxville voters'],
      voterGroupsShort: ['42% MEM', '26% NSH', '15% CHA', '17% KNX'],
      stepRank:    'Drag to rank your favorites',
      stepBallots: 'Voters rank all candidates',
      stepTally:   'Pairwise matchups tallied',
      stepSort:    'Sorted by margin of victory',
      stepLock:    'Locking strongest edges…',
      stepWinner:  'Winner determined!',
      winner:      'Winner',
      lock:        'Lock',
      skip:        'Skip (cycle!)',
      margin:      'margin',
      vs:          'vs',
    },
    fa: {
      title: 'رای‌گیری جفت‌های رتبه‌بندی‌شده',
      phase1: 'مرحله ۱ — شمارش و مرتب‌سازی',
      phase2: 'مرحله ۲ — قفل و برنده',
      candidates: ['بوشهر', 'شیراز', 'یاسوج', 'بندرعباس'],
      candidatesShort: ['بوشهر', 'شیراز', 'یاسوج', 'بندر'],
      voterGroups: ['۴۲٪ رای‌دهندگان بوشهر', '۲۶٪ رای‌دهندگان شیراز', '۱۵٪ رای‌دهندگان یاسوج', '۱۷٪ رای‌دهندگان بندرعباس'],
      voterGroupsShort: ['۴۲٪ بوشهر', '۲۶٪ شیراز', '۱۵٪ یاسوج', '۱۷٪ بندرعباس'],
      stepRank:    'بکشید و رتبه‌بندی کنید',
      stepBallots: 'رای‌دهندگان همه نامزدها را رتبه‌بندی می‌کنند',
      stepTally:   'رویارویی‌های جفتی شمارش شد',
      stepSort:    'مرتب‌سازی بر اساس حاشیه پیروزی',
      stepLock:    'قفل کردن قوی‌ترین یال‌ها…',
      stepWinner:  'برنده مشخص شد!',
      winner:      'برنده',
      lock:        'قفل',
      skip:        'رد (چرخه!)',
      margin:      'حاشیه',
      vs:          'در برابر',
    },
  };

  /* ── Tennessee example ballots (percentages) ──
     Rankings: [Memphis, Nashville, Chattanooga, Knoxville]
     (1 = most preferred) */
  var BALLOT_GROUPS = [
    { pct: 42, ranking: [1, 2, 3, 4] },   // Memphis voters
    { pct: 26, ranking: [4, 1, 2, 3] },   // Nashville voters
    { pct: 15, ranking: [4, 2, 1, 3] },   // Chattanooga voters
    { pct: 17, ranking: [4, 3, 2, 1] },   // Knoxville voters
  ];

  var N = 4; // candidates

  /* ── Compute pairwise matrix ── */
  function computePairwise() {
    // matrix[i][j] = % voters who prefer i over j
    var matrix = [];
    for (var i = 0; i < N; i++) { matrix[i] = []; for (var j = 0; j < N; j++) matrix[i][j] = 0; }
    for (var g = 0; g < BALLOT_GROUPS.length; g++) {
      var grp = BALLOT_GROUPS[g];
      for (var a = 0; a < N; a++) {
        for (var b = a + 1; b < N; b++) {
          if (grp.ranking[a] < grp.ranking[b]) matrix[a][b] += grp.pct;
          else matrix[b][a] += grp.pct;
        }
      }
    }
    return matrix;
  }

  /* ── Build sorted pairs ── */
  function buildPairs(matrix) {
    var pairs = [];
    for (var i = 0; i < N; i++) {
      for (var j = i + 1; j < N; j++) {
        var winner, loser, winPct, losePct;
        if (matrix[i][j] > matrix[j][i]) {
          winner = i; loser = j; winPct = matrix[i][j]; losePct = matrix[j][i];
        } else {
          winner = j; loser = i; winPct = matrix[j][i]; losePct = matrix[i][j];
        }
        pairs.push({ winner: winner, loser: loser, winPct: winPct, losePct: losePct, margin: winPct - losePct });
      }
    }
    pairs.sort(function (a, b) { return b.margin - a.margin; });
    return pairs;
  }

  /* ── Cycle detection (DFS) ── */
  function wouldCreateCycle(adj, from, to) {
    // Check if adding edge from→to would create a cycle
    // i.e. there is already a path from 'to' back to 'from'
    var visited = {};
    var stack = [to];
    while (stack.length) {
      var node = stack.pop();
      if (node === from) return true;
      if (visited[node]) continue;
      visited[node] = true;
      var neighbours = adj[node] || [];
      for (var i = 0; i < neighbours.length; i++) stack.push(neighbours[i]);
    }
    return false;
  }

  /* ── Lock pairs into DAG ── */
  function lockPairs(pairs) {
    var adj = {};
    for (var i = 0; i < N; i++) adj[i] = [];
    var locked = [];

    for (var p = 0; p < pairs.length; p++) {
      var pair = pairs[p];
      if (wouldCreateCycle(adj, pair.winner, pair.loser)) {
        locked.push({ pair: pair, status: 'skip' });
      } else {
        adj[pair.winner].push(pair.loser);
        locked.push({ pair: pair, status: 'lock' });
      }
    }
    return locked;
  }

  /* ── Find winner (source node — no incoming edges) ── */
  function findWinner(locked) {
    var hasIncoming = {};
    for (var i = 0; i < locked.length; i++) {
      if (locked[i].status === 'lock') {
        hasIncoming[locked[i].pair.loser] = true;
      }
    }
    for (var c = 0; c < N; c++) {
      if (!hasIncoming[c]) return c;
    }
    return 0;
  }

  /* ── Colors ── */
  var CAND_COLORS = ['#E87461', '#0EBB90', '#8CDAF5', '#A78BFA'];

  /* ── Easing ── */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
  }

  function hexRGBA(hex, a) {
    var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return 'rgba('+r+','+g+','+b+','+a+')';
  }

  /* ── Persian digit converter ── */
  var FA_DIGITS = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
  function toFaNum(n) {
    return String(n).replace(/[0-9]/g, function (d) { return FA_DIGITS[+d]; });
  }

  /* ── Main Animation ── */
  function RankedPairsAnim(el) {
    this.el = el;
    this.lang = document.documentElement.lang === 'fa' ? 'fa' : 'en';
    this.L = LABELS[this.lang] || LABELS.en;
    this.isFA = this.lang === 'fa';

    this.matrix = computePairwise();
    this.pairs  = buildPairs(this.matrix);
    this.locked = lockPairs(this.pairs);
    this.winnerIdx = findWinner(this.locked);

    this.visible = false;
    this.raf = null;
    this.startTime = 0;
    this.phase = 'idle'; // idle → ballots → tally → sort → lock → winner → hold → ballots…

    this._buildDOM();
    this._resize();

    var self = this;
    this._obs = new IntersectionObserver(function (entries) {
      var wasVisible = self.visible;
      self.visible = entries[0].isIntersecting;
      if (self.visible && !wasVisible) {
        self.startTime = performance.now();
        self.phase = 'rank';
        if (!self.raf) self._loop();
      }
    }, { threshold: 0.15 });
    this._obs.observe(this.el);

    this._resizeTimer = null;
    function onResize() {
      clearTimeout(self._resizeTimer);
      self._resizeTimer = setTimeout(function () { self._resize(); }, 100);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', function () {
      setTimeout(onResize, 200);
    });
  }

  RankedPairsAnim.prototype._buildDOM = function () {
    this.el.innerHTML = '';
    this.el.classList.add('rp-anim');

    this.statusEl = document.createElement('div');
    this.statusEl.className = 'rp-status';
    this.el.appendChild(this.statusEl);

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'rp-canvas';
    this.el.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  };

  RankedPairsAnim.prototype._resize = function () {
    var box = this.el.getBoundingClientRect();
    var w = Math.min(box.width - 16, 760);
    if (w < 160) w = 160;
    var minH = w < 400 ? 280 : 360;
    var h = Math.min(540, Math.max(minH, w * 0.72));
    var dpr = window.devicePixelRatio || 1;
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr,0,0,dpr,0,0);
    this.W = w;
    this.H = h;
  };

  /* ── Timing (ms) ── */
  var T_RANK    = 5000;
  var T_BALLOTS = 3500;
  var T_TALLY   = 3500;
  var T_SORT    = 2500;
  var T_LOCK_EACH = 1600;
  var T_WINNER  = 3000;
  var T_HOLD    = 2500;

  RankedPairsAnim.prototype._loop = function () {
    var self = this;
    function frame() {
      if (!self.visible) { self.raf = null; return; }
      self._tick();
      self._render();
      self.raf = requestAnimationFrame(frame);
    }
    this.raf = requestAnimationFrame(frame);
  };

  RankedPairsAnim.prototype._tick = function () {
    var t = performance.now() - this.startTime;
    var totalLock = T_LOCK_EACH * this.locked.length;
    var phases = [
      { name: 'rank',    dur: T_RANK    },
      { name: 'ballots', dur: T_BALLOTS },
      { name: 'tally',   dur: T_TALLY   },
      { name: 'sort',    dur: T_SORT    },
      { name: 'lock',    dur: totalLock  },
      { name: 'winner',  dur: T_WINNER  },
      { name: 'hold',    dur: T_HOLD    },
    ];
    var cumul = 0;
    for (var i = 0; i < phases.length; i++) {
      cumul += phases[i].dur;
      if (t < cumul) {
        this.phase = phases[i].name;
        this.phaseT = 1 - (cumul - t) / phases[i].dur; // 0→1 within phase
        return;
      }
    }
    // Restart
    this.startTime = performance.now();
    this.phase = 'rank';
    this.phaseT = 0;
  };

  RankedPairsAnim.prototype._render = function () {
    var ctx = this.ctx, W = this.W, H = this.H;
    ctx.clearRect(0, 0, W, H);
    this.isLight = document.documentElement.getAttribute('data-theme') !== 'dark' && (this.isFA || document.documentElement.getAttribute('data-theme') === 'light');

    var font = this.isFA ? '"Nian", sans-serif' : '"Inter", sans-serif';

    switch (this.phase) {
      case 'rank':    this._drawRank(ctx, W, H, font); break;
      case 'ballots': this._drawBallots(ctx, W, H, font); break;
      case 'tally':   this._drawTally(ctx, W, H, font); break;
      case 'sort':    this._drawSort(ctx, W, H, font); break;
      case 'lock':    this._drawLock(ctx, W, H, font); break;
      case 'winner':  this._drawWinner(ctx, W, H, font); break;
      case 'hold':    this._drawWinner(ctx, W, H, font); break;
    }
  };

  /* ── Phase: Rank (Drag-to-rank intro) ── */
  RankedPairsAnim.prototype._drawRank = function (ctx, W, H, font) {
    this.statusEl.textContent = this.L.stepRank;
    var t = this.phaseT; // 0→1 over T_RANK ms
    var L = this.L;
    var isFA = this.isFA;
    var isLight = this.isLight;

    // Layout: a single ballot card in the centre
    var isNarrow = W < 400;
    var cardW = isNarrow ? Math.min(W * 0.78, W - 32) : Math.min(280, W * 0.52);
    var cardH = isNarrow ? Math.min(H * 0.88, H - 20) : Math.min(380, H * 0.82);
    var cx = W / 2, cy = H / 2;
    var cardX = cx - cardW / 2;
    var cardY = cy - cardH / 2;

    // Card background
    ctx.fillStyle = isLight ? '#ffffff' : 'rgba(255,255,255,0.08)';
    ctx.strokeStyle = isLight ? 'rgba(30,58,107,0.22)' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.7;
    this._roundRect(ctx, cardX, cardY, cardW, cardH, 14);

    // Title at top of card
    var titleFont = isNarrow ? Math.max(12, cardW * 0.055) : Math.max(14, cardW * 0.06);
    ctx.font = '700 ' + titleFont + 'px ' + font;
    ctx.fillStyle = isLight ? 'rgba(30,58,107,0.7)' : 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'center';
    ctx.fillText(isFA ? 'برگه رای' : 'Your Ballot', cx, cardY + (isNarrow ? 24 : 30));

    var slotPad = isNarrow ? 12 : 18;
    var topOffset = isNarrow ? 38 : 50;
    var slotH = Math.min(isNarrow ? 44 : 52, (cardH - topOffset - 10) / 4 - 6);
    var slotW = cardW - slotPad * 2;
    var slotX = cardX + slotPad;
    var slotsTop = cardY + topOffset;
    var slotGap = slotH + (isNarrow ? 7 : 10);

    var DRAG_CAND = 1; // Nashville / شیراز (eventual winner)
    var origOrder = [0, 1, 2, 3];
    var finalOrder = [1, 0, 2, 3];

    // Use short names so text fits in slots
    var names = L.candidatesShort;

    // Phase timings
    var tAppear = Math.min(1, t / 0.28);
    var tHighlight = Math.max(0, Math.min(1, (t - 0.30) / 0.18));
    var tDrag = Math.max(0, Math.min(1, (t - 0.50) / 0.22));
    var tShowRanks = Math.max(0, Math.min(1, (t - 0.85) / 0.12));

    var dragEased = easeInOutCubic(tDrag);

    for (var i = 0; i < N; i++) {
      var candIdx = origOrder[i];
      var currentY;

      if (candIdx === DRAG_CAND) {
        var fromY = slotsTop + 1 * slotGap;
        var toY   = slotsTop + 0 * slotGap;
        currentY = fromY + (toY - fromY) * dragEased;
      } else if (candIdx === 0) {
        var fromY = slotsTop + 0 * slotGap;
        var toY   = slotsTop + 1 * slotGap;
        currentY = fromY + (toY - fromY) * dragEased;
      } else {
        currentY = slotsTop + i * slotGap;
      }

      var itemAppear = Math.max(0, Math.min(1, (tAppear - i * 0.2) / 0.4));
      if (itemAppear <= 0) continue;
      ctx.globalAlpha = itemAppear;

      var isHighlighted = (candIdx === DRAG_CAND && tHighlight > 0);
      var elevation = 0;

      if (isHighlighted) {
        var glowAlpha = tHighlight * 0.18;
        ctx.fillStyle = hexRGBA(CAND_COLORS[candIdx], glowAlpha);
        ctx.strokeStyle = 'transparent'; ctx.lineWidth = 0;
        this._roundRect(ctx, slotX - 4, currentY - 4, slotW + 8, slotH + 8, 12);
        elevation = tDrag > 0 ? -3 * Math.sin(tDrag * Math.PI) : 0;
      }

      // Slot background
      var bgAlpha = isHighlighted ? 0.35 : 0.18;
      ctx.fillStyle = hexRGBA(CAND_COLORS[candIdx], bgAlpha);
      ctx.strokeStyle = hexRGBA(CAND_COLORS[candIdx], isHighlighted ? 0.6 : 0.25);
      ctx.lineWidth = isHighlighted ? 0.8 : 0.5;
      this._roundRect(ctx, slotX, currentY + elevation, slotW, slotH, 8);

      // Drag handle dots
      var dotsX = isFA ? slotX + slotW - (isNarrow ? 12 : 16) : slotX + (isNarrow ? 8 : 12);
      var dotCY = currentY + elevation + slotH / 2;
      var dotSpacing = isNarrow ? 5 : 7;
      var dotR = isNarrow ? 1.5 : 2;
      ctx.fillStyle = hexRGBA(CAND_COLORS[candIdx], isHighlighted ? 0.7 : 0.35);
      for (var d = -1; d <= 1; d++) {
        ctx.beginPath(); ctx.arc(dotsX, dotCY + d * dotSpacing, dotR, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(dotsX + dotSpacing, dotCY + d * dotSpacing, dotR, 0, TAU); ctx.fill();
      }

      // Candidate name (use short names)
      var nameFontSize = isNarrow ? Math.max(11, slotH * 0.30) : Math.max(14, slotH * 0.34);
      ctx.font = '700 ' + nameFontSize + 'px ' + font;
      ctx.fillStyle = CAND_COLORS[candIdx];
      ctx.textAlign = 'center';
      ctx.fillText(names[candIdx], cx, currentY + elevation + slotH / 2 + (isNarrow ? 3 : 5));

      // Rank numbers appear at the end
      if (tShowRanks > 0) {
        ctx.globalAlpha = itemAppear * tShowRanks;
        var finalSlot = finalOrder.indexOf(candIdx);
        var rankNumY = slotsTop + finalSlot * slotGap;
        var rankFontSize = isNarrow ? Math.max(11, slotH * 0.30) : Math.max(14, slotH * 0.34);
        ctx.font = '800 ' + rankFontSize + 'px ' + font;
        ctx.fillStyle = isLight ? 'rgba(30,58,107,0.75)' : 'rgba(255,255,255,0.7)';
        ctx.textAlign = isFA ? 'left' : 'right';
        var rankLabelX = isFA ? slotX + 10 : slotX + slotW - 10;
        var rankLabel = this.isFA ? '-' + toFaNum(finalSlot + 1) : (finalSlot + 1) + '.';
        ctx.fillText(rankLabel, rankLabelX, rankNumY + slotH / 2 + 5);
      }
    }

    // Cursor icon during highlight + drag
    if (tHighlight > 0.2 && t < 0.82) {
      var cursorAppear = Math.min(1, (tHighlight - 0.2) / 0.3);
      ctx.globalAlpha = cursorAppear * 0.7;
      var cursorFromY = slotsTop + 1 * slotGap + slotH / 2;
      var cursorToY   = slotsTop + 0 * slotGap + slotH / 2;
      var cursorY = cursorFromY + (cursorToY - cursorFromY) * dragEased;
      var cursorX = isFA ? slotX + 20 : slotX + slotW - 20;
      ctx.font = Math.max(18, slotH * 0.4) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👆', cursorX, cursorY + 8);
    }

    ctx.globalAlpha = 1;
  };

  /* ── Phase: Ballots ── */
  RankedPairsAnim.prototype._drawBallots = function (ctx, W, H, font) {
    this.statusEl.textContent = this.L.stepBallots;
    var t = this.phaseT;
    var groups = BALLOT_GROUPS;
    var isNarrow = W < 400;

    // On narrow screens use 2×2 grid, otherwise 4 columns
    if (isNarrow) {
      this._drawBallots2x2(ctx, W, H, font, groups, t);
    } else {
      this._drawBallots4col(ctx, W, H, font, groups, t);
    }
  };

  // 4-column layout for wide screens
  RankedPairsAnim.prototype._drawBallots4col = function (ctx, W, H, font, groups, t) {
    var gap = 12;
    var cardW = Math.min(170, (W - 40) / 4 - gap);
    var cardH = Math.min(210, H - 40);
    var totalW = 4 * cardW + 3 * gap;
    var startX = (W - totalW) / 2;
    var startY = (H - cardH) / 2 + 8;
    var groupLabels = this.L.voterGroupsShort || this.L.voterGroups;

    for (var g = 0; g < groups.length; g++) {
      var appear = Math.max(0, Math.min(1, (t - g * 0.18) / 0.3));
      if (appear <= 0) continue;

      var x = startX + g * (cardW + gap);
      var y = startY + (1 - easeInOutCubic(appear)) * 30;
      ctx.globalAlpha = appear;

      // Card bg
      ctx.fillStyle = this.isLight ? '#ffffff' : 'rgba(255,255,255,0.10)';
      ctx.strokeStyle = this.isLight ? 'rgba(30,58,107,0.22)' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 0.7;
      this._roundRect(ctx, x, y, cardW, cardH, 10);

      // Clip text to card
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cardW, cardH);
      ctx.clip();

      // Group label
      var labelFont = Math.max(10, Math.min(13, cardW * 0.1));
      ctx.font = '700 ' + labelFont + 'px ' + font;
      ctx.fillStyle = CAND_COLORS[g];
      ctx.textAlign = 'center';
      ctx.fillText(groupLabels[g], x + cardW / 2, y + 22);

      // Ranking lines
      var ranking = groups[g].ranking;
      var lineH = Math.min(34, (cardH - 45) / 4);
      for (var r = 0; r < N; r++) {
        var candIdx = ranking.indexOf(r + 1);
        if (candIdx === -1) continue;
        var lineAppear = Math.max(0, Math.min(1, (t - g * 0.18 - r * 0.08 - 0.15) / 0.2));
        if (lineAppear <= 0) continue;

        var ly = y + 38 + r * lineH;
        ctx.globalAlpha = appear * lineAppear;

        // Bar
        var barPad = 8;
        var barX = x + barPad;
        var barW = cardW - barPad * 2;
        ctx.fillStyle = hexRGBA(CAND_COLORS[candIdx], 0.22);
        ctx.strokeStyle = 'transparent'; ctx.lineWidth = 0;
        this._roundRect(ctx, barX, ly, barW * lineAppear, lineH - 6, 4);

        // Combined rank + name
        var nameFont = Math.max(10, Math.min(13, cardW * 0.1));
        ctx.font = '700 ' + nameFont + 'px ' + font;
        ctx.fillStyle = CAND_COLORS[candIdx];
        ctx.textAlign = 'center';
        ctx.fillText(this.isFA ? this.L.candidatesShort[candIdx] + '  -' + toFaNum(r + 1) : (r + 1) + '. ' + this.L.candidatesShort[candIdx], x + cardW / 2, ly + lineH / 2 + 1);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  // 2×2 grid layout for narrow screens
  RankedPairsAnim.prototype._drawBallots2x2 = function (ctx, W, H, font, groups, t) {
    var gapX = 12, gapY = 10;
    var cardW = Math.min(200, (W - gapX - 24) / 2);
    var cardH = Math.min(180, (H - gapY - 24) / 2);
    var totalW = 2 * cardW + gapX;
    var totalH = 2 * cardH + gapY;
    var startX = (W - totalW) / 2;
    var startY = (H - totalH) / 2;
    var groupLabels = this.L.voterGroupsShort || this.L.voterGroups;

    for (var g = 0; g < groups.length; g++) {
      var appear = Math.max(0, Math.min(1, (t - g * 0.12) / 0.25));
      if (appear <= 0) continue;

      var col = g % 2, row = Math.floor(g / 2);
      var x = startX + col * (cardW + gapX);
      var y = startY + row * (cardH + gapY) + (1 - easeInOutCubic(appear)) * 20;
      ctx.globalAlpha = appear;

      // Card bg
      ctx.fillStyle = this.isLight ? '#ffffff' : 'rgba(255,255,255,0.10)';
      ctx.strokeStyle = this.isLight ? 'rgba(30,58,107,0.22)' : 'rgba(255,255,255,0.22)';
      ctx.lineWidth = 0.7;
      this._roundRect(ctx, x, y, cardW, cardH, 10);

      // Clip
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, cardW, cardH);
      ctx.clip();

      // Group label
      var labelFont = Math.max(11, Math.min(14, cardW * 0.08));
      ctx.font = '700 ' + labelFont + 'px ' + font;
      ctx.fillStyle = CAND_COLORS[g];
      ctx.textAlign = 'center';
      ctx.fillText(groupLabels[g], x + cardW / 2, y + 20);

      // Rankings
      var ranking = groups[g].ranking;
      var lineH = Math.min(30, (cardH - 36) / 4);
      for (var r = 0; r < N; r++) {
        var candIdx = ranking.indexOf(r + 1);
        if (candIdx === -1) continue;
        var lineAppear = Math.max(0, Math.min(1, (t - g * 0.12 - r * 0.06 - 0.1) / 0.2));
        if (lineAppear <= 0) continue;

        var ly = y + 30 + r * lineH;
        ctx.globalAlpha = appear * lineAppear;

        var barPad = 8;
        ctx.fillStyle = hexRGBA(CAND_COLORS[candIdx], 0.22);
        ctx.strokeStyle = 'transparent'; ctx.lineWidth = 0;
        this._roundRect(ctx, x + barPad, ly, (cardW - barPad * 2) * lineAppear, lineH - 5, 4);

        var nameFont = Math.max(11, Math.min(14, cardW * 0.08));
        ctx.font = '700 ' + nameFont + 'px ' + font;
        ctx.fillStyle = CAND_COLORS[candIdx];
        ctx.textAlign = 'center';
        ctx.fillText(this.isFA ? this.L.candidatesShort[candIdx] + '  -' + toFaNum(r + 1) : (r + 1) + '. ' + this.L.candidatesShort[candIdx], x + cardW / 2, ly + lineH / 2 + 1);
      }

      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  /* ── Phase: Tally ── */
  RankedPairsAnim.prototype._drawTally = function (ctx, W, H, font) {
    this.statusEl.textContent = this.L.stepTally;
    var t = this.phaseT;
    var isNarrow = W < 400;

    var pairs = this.pairs;
    var rowH = Math.min(isNarrow ? 34 : 40, (H - 40) / pairs.length);
    var startY = (H - pairs.length * rowH) / 2;
    var midX = W / 2;
    var fontSize = isNarrow ? Math.max(11, W * 0.030) : Math.max(14, W * 0.024);

    for (var i = 0; i < pairs.length; i++) {
      var appear = Math.max(0, Math.min(1, (t - i * 0.1) / 0.2));
      if (appear <= 0) continue;

      ctx.globalAlpha = appear;
      var y = startY + i * rowH;
      var p = pairs[i];

      // Winner side
      ctx.font = '700 ' + fontSize + 'px ' + font;
      ctx.textAlign = 'right';
      ctx.fillStyle = CAND_COLORS[p.winner];
      var winLabel = isNarrow
        ? (this.isFA ? '٪' + toFaNum(p.winPct) + ' ' + this.L.candidatesShort[p.winner] : this.L.candidatesShort[p.winner] + ' ' + p.winPct + '%')
        : (this.isFA ? '٪' + toFaNum(p.winPct) + ' ' + this.L.candidates[p.winner] : this.L.candidates[p.winner] + ' ' + p.winPct + '%');
      ctx.fillText(winLabel, midX - (isNarrow ? 14 : 24), y + rowH * 0.6);

      // VS
      ctx.textAlign = 'center';
      ctx.font = '500 ' + Math.max(10, fontSize * 0.8) + 'px ' + font;
      ctx.fillStyle = this.isLight ? 'rgba(30,58,107,0.45)' : 'rgba(255,255,255,0.4)';
      ctx.fillText(this.L.vs, midX, y + rowH * 0.6);

      // Loser side
      ctx.font = '600 ' + fontSize + 'px ' + font;
      ctx.textAlign = 'left';
      ctx.fillStyle = this.isLight ? 'rgba(30,58,107,0.55)' : 'rgba(255,255,255,0.45)';
      var loseLabel = isNarrow
        ? (this.isFA ? this.L.candidatesShort[p.loser] + ' ٪' + toFaNum(p.losePct) : p.losePct + '% ' + this.L.candidatesShort[p.loser])
        : (this.isFA ? this.L.candidates[p.loser] + ' ٪' + toFaNum(p.losePct) : p.losePct + '% ' + this.L.candidates[p.loser]);
      ctx.fillText(loseLabel, midX + (isNarrow ? 14 : 24), y + rowH * 0.6);

      // Margin indicator bar
      var barMaxW = Math.min(isNarrow ? 80 : 120, W * 0.16);
      var barW = barMaxW * (p.margin / 66) * appear; // 66 is max margin
      ctx.fillStyle = hexRGBA(CAND_COLORS[p.winner], 0.35);
      ctx.strokeStyle = 'transparent'; ctx.lineWidth = 0;
      this._roundRect(ctx, midX - barW / 2, y + rowH - 6, barW, 4, 2);
    }
    ctx.globalAlpha = 1;
  };

  /* ── Phase: Sort ── */
  RankedPairsAnim.prototype._drawSort = function (ctx, W, H, font) {
    this.statusEl.textContent = this.L.stepSort;
    var t = this.phaseT;
    var isNarrow = W < 400;

    var pairs = this.pairs;
    var rowH = Math.min(isNarrow ? 36 : 48, (H - 30) / pairs.length);
    var startY = (H - pairs.length * rowH) / 2;

    for (var i = 0; i < pairs.length; i++) {
      var p = pairs[i];
      var y = startY + i * rowH;

      var highlightT = t * pairs.length;
      var isHighlighted = Math.abs(highlightT - i) < 0.7;
      ctx.globalAlpha = isHighlighted ? 1 : 0.55 + t * 0.45;

      if (this.isFA) {
        // FA RTL: rank far-right, matchup right-center, bar left-center, margin far-left
        var faFontSize = isNarrow ? Math.max(11, W * 0.030) : Math.max(14, W * 0.024);

        // Rank
        ctx.font = '800 ' + faFontSize + 'px ' + font;
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(30,58,107,0.6)';
        ctx.fillText('#' + (this.isFA ? toFaNum(i + 1) : (i + 1)), W * 0.97, y + rowH * 0.6);

        // Matchup
        ctx.font = '700 ' + faFontSize + 'px ' + font;
        ctx.textAlign = 'center';
        ctx.fillStyle = CAND_COLORS[p.winner];
        ctx.fillText(this.L.candidatesShort[p.winner] + ' → ' + this.L.candidatesShort[p.loser], isNarrow ? W * 0.62 : W * 0.72, y + rowH * 0.6);

        // Margin bar
        var barMaxW = Math.min(isNarrow ? 80 : 140, W * 0.22);
        var barW = barMaxW * (p.margin / 66);
        ctx.fillStyle = hexRGBA(CAND_COLORS[p.winner], isHighlighted ? 0.5 : 0.22);
        ctx.strokeStyle = 'transparent'; ctx.lineWidth = 0;
        this._roundRect(ctx, (isNarrow ? W * 0.12 : W * 0.22) + (barMaxW - barW), y + rowH * 0.28, barW, rowH * 0.38, 4);

        // Margin label
        ctx.font = '600 ' + Math.max(10, W * 0.02) + 'px ' + font;
        ctx.fillStyle = CAND_COLORS[p.winner];
        ctx.textAlign = 'right';
        ctx.fillText(isNarrow ? '' + (this.isFA ? toFaNum(p.margin) : p.margin) : (this.isFA ? this.L.margin + ' ' + toFaNum(p.margin) : this.L.margin + ' ' + p.margin), isNarrow ? W * 0.08 : W * 0.14, y + rowH * 0.6);
      } else {
        // EN LTR: rank far-left, matchup left-of-center, bar right-of-center, margin far-right
        var fontSize = isNarrow ? Math.max(11, W * 0.030) : Math.max(15, W * 0.024);

        // Rank
        ctx.font = '800 ' + fontSize + 'px ' + font;
        ctx.textAlign = 'left';
        ctx.fillStyle = this.isLight ? 'rgba(30,58,107,0.55)' : 'rgba(255,255,255,0.55)';
        ctx.fillText('#' + (this.isFA ? toFaNum(i + 1) : (i + 1)), W * 0.02, y + rowH * 0.6);

        // Matchup — positioned further right to avoid rank overlap
        ctx.font = '700 ' + fontSize + 'px ' + font;
        ctx.textAlign = 'left';
        ctx.fillStyle = CAND_COLORS[p.winner];
        ctx.fillText(this.L.candidatesShort[p.winner] + ' → ' + this.L.candidatesShort[p.loser], W * 0.10, y + rowH * 0.6);

        // Margin bar
        var barMaxW = Math.min(120, W * 0.18);
        var barW = barMaxW * (p.margin / 66);
        var barX = W * 0.52;
        ctx.fillStyle = hexRGBA(CAND_COLORS[p.winner], isHighlighted ? 0.5 : 0.22);
        ctx.strokeStyle = 'transparent'; ctx.lineWidth = 0;
        this._roundRect(ctx, barX, y + rowH * 0.28, barW, rowH * 0.38, 4);

        // Margin label
        ctx.font = '600 ' + Math.max(12, W * 0.02) + 'px ' + font;
        ctx.fillStyle = CAND_COLORS[p.winner];
        ctx.textAlign = 'left';
        ctx.fillText(this.isFA ? toFaNum(p.margin) : p.margin, barX + barW + 8, y + rowH * 0.6);
      }
    }
    ctx.globalAlpha = 1;
  };

  /* ── Phase: Lock (Graph building) ── */
  RankedPairsAnim.prototype._drawLock = function (ctx, W, H, font) {
    this.statusEl.textContent = this.L.stepLock;
    var t = this.phaseT;
    var isNarrow = W < 400;

    // Graph node positions (arranged in a diamond/circle)
    // Shift graph over to make room for side list
    var cx = isNarrow ? W * 0.58 : (this.isFA ? W * 0.58 : W * 0.65);
    var cy = H * 0.5;
    var R = Math.min(isNarrow ? W * 0.22 : W * 0.20, H * 0.28);

    var angles = [
      -Math.PI / 2,       // top
      0,                   // right
      Math.PI / 2,         // bottom
      Math.PI,             // left
    ];

    var nodePos = [];
    for (var n = 0; n < N; n++) {
      nodePos.push({
        x: cx + Math.cos(angles[n]) * R,
        y: cy + Math.sin(angles[n]) * R,
      });
    }

    // How many edges are done?
    var edgeProgress = t * this.locked.length;
    var doneEdges = Math.floor(edgeProgress);
    var partialEdge = edgeProgress - doneEdges;

    var nodeR = Math.min(26, R * 0.26);

    // Draw edges
    for (var e = 0; e < this.locked.length; e++) {
      if (e > doneEdges) break;
      var entry = this.locked[e];
      var pair = entry.pair;
      var fromPos = nodePos[pair.winner];
      var toPos   = nodePos[pair.loser];
      var progress = (e < doneEdges) ? 1 : easeInOutCubic(partialEdge);

      if (entry.status === 'lock') {
        // Draw edge
        var dx = toPos.x - fromPos.x, dy = toPos.y - fromPos.y;
        var len = Math.sqrt(dx*dx + dy*dy);
        var startX = fromPos.x + (dx/len) * nodeR;
        var startY = fromPos.y + (dy/len) * nodeR;
        var endX = fromPos.x + dx * progress - (dx/len) * nodeR * progress;
        var endY = fromPos.y + dy * progress - (dy/len) * nodeR * progress;

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = hexRGBA(CAND_COLORS[pair.winner], 0.6 + progress * 0.4);
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Arrow head
        if (progress > 0.9) {
          var arrowLen = 10;
          var angle = Math.atan2(dy, dx);
          ctx.beginPath();
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - arrowLen * Math.cos(angle - 0.35), endY - arrowLen * Math.sin(angle - 0.35));
          ctx.moveTo(endX, endY);
          ctx.lineTo(endX - arrowLen * Math.cos(angle + 0.35), endY - arrowLen * Math.sin(angle + 0.35));
          ctx.strokeStyle = CAND_COLORS[pair.winner];
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      } else {
        // Skipped — draw dashed red
        if (progress > 0.3) {
          var dx2 = toPos.x - fromPos.x, dy2 = toPos.y - fromPos.y;
          var len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.moveTo(fromPos.x + (dx2/len2)*nodeR, fromPos.y + (dy2/len2)*nodeR);
          ctx.lineTo(toPos.x - (dx2/len2)*nodeR, toPos.y - (dy2/len2)*nodeR);
          ctx.strokeStyle = 'rgba(232,116,97,0.4)';
          ctx.lineWidth = 0.7;
          ctx.stroke();
          ctx.setLineDash([]);

          // X mark
          var mx = (fromPos.x + toPos.x) / 2, my = (fromPos.y + toPos.y) / 2;
          ctx.beginPath();
          ctx.moveTo(mx - 6, my - 6); ctx.lineTo(mx + 6, my + 6);
          ctx.moveTo(mx + 6, my - 6); ctx.lineTo(mx - 6, my + 6);
          ctx.strokeStyle = 'rgba(232,116,97,0.7)';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }

    // Draw nodes
    for (var n2 = 0; n2 < N; n2++) {
      var pos = nodePos[n2];

      // Glow for winner candidate
      if (n2 === this.winnerIdx && doneEdges >= this.locked.length - 1) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeR + 10, 0, TAU);
        ctx.fillStyle = hexRGBA(CAND_COLORS[n2], 0.18);
        ctx.fill();
      }

      // Circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeR, 0, TAU);
      ctx.fillStyle = hexRGBA(CAND_COLORS[n2], 0.18);
      ctx.strokeStyle = CAND_COLORS[n2];
      ctx.lineWidth = 0.8;
      ctx.fill();
      ctx.stroke();

      // Label
      ctx.font = '700 ' + Math.max(11, nodeR * 0.55) + 'px ' + font;
      ctx.fillStyle = CAND_COLORS[n2];
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.L.candidatesShort[n2], pos.x, pos.y);
    }
    ctx.textBaseline = 'alphabetic';

    // Side list showing lock order
    var listX = W * 0.02;
    var listFontSize = isNarrow ? Math.max(9, W * 0.024) : Math.max(11, W * 0.017);
    var listRowH = Math.min(isNarrow ? 22 : 28, (H - 30) / this.locked.length);
    var listY = (H - this.locked.length * listRowH) / 2;

    for (var li = 0; li <= Math.min(doneEdges, this.locked.length - 1); li++) {
      var le = this.locked[li];
      var lp = le.pair;
      var ly = listY + li * listRowH;

      ctx.font = '600 ' + listFontSize + 'px ' + font;
      ctx.textAlign = 'left';

      if (le.status === 'lock') {
        ctx.fillStyle = hexRGBA(CAND_COLORS[lp.winner], 0.9);
        ctx.fillText('✓ ' + this.L.candidatesShort[lp.winner] + ' → ' + this.L.candidatesShort[lp.loser], listX, ly + listRowH * 0.65);
      } else {
        ctx.fillStyle = 'rgba(232,116,97,0.7)';
        ctx.fillText('✗ ' + this.L.candidatesShort[lp.winner] + ' → ' + this.L.candidatesShort[lp.loser], listX, ly + listRowH * 0.65);
      }
    }
  };

  /* ── Phase: Winner ── */
  RankedPairsAnim.prototype._drawWinner = function (ctx, W, H, font) {
    this.statusEl.textContent = this.L.stepWinner;
    var t = this.phaseT;
    var appear = easeInOutCubic(Math.min(1, t * 2));

    var cx = W / 2, cy = H / 2;

    // Big pulsing ring
    var pulse = 0.5 + 0.5 * Math.sin(performance.now() / 400);
    var ringR = 50 + pulse * 12;
    ctx.beginPath();
    ctx.arc(cx, cy, ringR + 15, 0, TAU);
    ctx.fillStyle = hexRGBA(CAND_COLORS[this.winnerIdx], 0.06 * appear);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, ringR, 0, TAU);
    ctx.fillStyle = hexRGBA(CAND_COLORS[this.winnerIdx], 0.12 * appear);
    ctx.fill();
    ctx.strokeStyle = hexRGBA(CAND_COLORS[this.winnerIdx], 0.6 * appear);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Winner name
    ctx.globalAlpha = appear;
    ctx.font = '800 ' + Math.max(26, W * 0.05) + 'px ' + font;
    ctx.fillStyle = CAND_COLORS[this.winnerIdx];
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.L.candidates[this.winnerIdx], cx, cy - 6);

    // Label
    ctx.font = '600 ' + Math.max(13, W * 0.024) + 'px ' + font;
    ctx.fillStyle = this.isLight ? 'rgba(30,58,107,0.6)' : 'rgba(255,255,255,0.5)';
    ctx.fillText(this.L.winner, cx, cy + 28);

    // Small ranking below
    if (appear > 0.6) {
      var rankAppear = (appear - 0.6) / 0.4;
      ctx.globalAlpha = rankAppear;
      // Find full ranking from locked edges
      var ranking = this._getFullRanking();
      var rankStr = ranking.map(function (idx) { return this.L.candidatesShort[idx]; }.bind(this)).join(' > ');
      ctx.font = '500 ' + Math.max(13, W * 0.022) + 'px ' + font;
      ctx.fillStyle = this.isLight ? 'rgba(30,58,107,0.5)' : 'rgba(255,255,255,0.4)';
      ctx.fillText(rankStr, cx, cy + 80);
    }

    ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic';
  };

  RankedPairsAnim.prototype._getFullRanking = function () {
    // Simple topological sort from locked edges
    var inDeg = {};
    var adj = {};
    for (var i = 0; i < N; i++) { inDeg[i] = 0; adj[i] = []; }
    for (var e = 0; e < this.locked.length; e++) {
      if (this.locked[e].status === 'lock') {
        adj[this.locked[e].pair.winner].push(this.locked[e].pair.loser);
        inDeg[this.locked[e].pair.loser]++;
      }
    }
    var result = [];
    var queue = [];
    for (var n = 0; n < N; n++) if (inDeg[n] === 0) queue.push(n);
    while (queue.length) {
      queue.sort(function (a, b) { return inDeg[a] - inDeg[b]; });
      var node = queue.shift();
      result.push(node);
      for (var j = 0; j < adj[node].length; j++) {
        inDeg[adj[node][j]]--;
        if (inDeg[adj[node][j]] === 0) queue.push(adj[node][j]);
      }
    }
    return result;
  };

  /* ── Helpers ── */
  RankedPairsAnim.prototype._roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
    ctx.fill();
    if (ctx.strokeStyle && ctx.lineWidth) ctx.stroke();
  };

  /* ── Init ── */
  document.addEventListener('DOMContentLoaded', function () {
    var el = document.querySelector('.rp-visual');
    if (el) new RankedPairsAnim(el);
  });

})();
