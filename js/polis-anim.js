/* ─────────────────────────────────────────────────────────────────────────
   polis-anim.js  —  Agora AI Filter Demo
   Simulates an LLM-powered automated evaluation pipeline that scores
   citizen posts against UN Human Rights Covenants and Conventions.
   Lines scroll up from the bottom.
   Triggered by IntersectionObserver. Loops continuously.
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  var FA = document.documentElement.lang === 'fa';
  var MAX_LINES = 8; /* max visible lines before oldest scrolls off */

  /* ── Posts: each becomes a small "session" of terminal lines ── */
  var POSTS = [
    {
      user: '0xa3f8…7d2e',
      text: 'The state has no right to ban opposition newspapers.',
      ref:  'ICCPR Art.19',
      ok:   true,
    },
    {
      user: '0xc14b…e391',
      text: 'Striking workers should be shot in the streets.',
      ref:  'ICCPR Art.6 / Art.20',
      ok:   false,
      reason: 'incitement to violence',
    },
    {
      user: '0x82dc…1f0a',
      text: 'Women must have equal inheritance rights under the law.',
      ref:  'CEDAW Art.15',
      ok:   true,
    },
    {
      user: '0xf507…3b8c',
      text: 'Ethnic minorities are subhuman and deserve expulsion.',
      ref:  'ICCPR Art.20',
      ok:   false,
      reason: 'hate speech — advocacy of discrimination',
    },
    {
      user: '0x39e1…a47d',
      text: 'Internet shutdowns during protests violate free expression.',
      ref:  'ICCPR Art.19',
      ok:   true,
    },
    {
      user: '0xb60f…5c29',
      text: 'Detainees must have access to legal counsel from arrest.',
      ref:  'ICCPR Art.14',
      ok:   true,
    },
    {
      user: '0xd2a9…8e14',
      text: 'Religious minorities should be banned from public office.',
      ref:  'ICCPR Art.25 / Art.26',
      ok:   false,
      reason: 'discriminatory restriction on political rights',
    },
    {
      user: '0x71c3…4f6b',
      text: 'Every child deserves free primary education regardless of status.',
      ref:  'ICESCR Art.13',
      ok:   true,
    },
  ];

  var FA_POSTS = [
    {
      user: '0xa3f8…7d2e',
      text: 'دولت حق ندارد روزنامه‌های مخالف را تعطیل کند.',
      ref:  'ICCPR ماده ۱۹',
      ok:   true,
    },
    {
      user: '0xc14b…e391',
      text: 'کارگران اعتصابی باید در خیابان‌ها کشته شوند.',
      ref:  'ICCPR ماده ۶ / ماده ۲۰',
      ok:   false,
      reason: 'تحریک به خشونت',
    },
    {
      user: '0x82dc…1f0a',
      text: 'زنان باید حقوق برابر ارث در قانون داشته باشند.',
      ref:  'CEDAW ماده ۱۵',
      ok:   true,
    },
    {
      user: '0xf507…3b8c',
      text: 'اقلیت‌های قومی انسان نیستند و باید اخراج شوند.',
      ref:  'ICCPR ماده ۲۰',
      ok:   false,
      reason: 'نفرت‌پراکنی — ترویج تبعیض',
    },
    {
      user: '0x39e1…a47d',
      text: 'قطع اینترنت در اعتراضات ناقض آزادی بیان است.',
      ref:  'ICCPR ماده ۱۹',
      ok:   true,
    },
    {
      user: '0xb60f…5c29',
      text: 'بازداشت‌شدگان باید از همان ابتدا به وکیل دسترسی داشته باشند.',
      ref:  'ICCPR ماده ۱۴',
      ok:   true,
    },
    {
      user: '0xd2a9…8e14',
      text: 'اقلیت‌های مذهبی باید از تصدی مناصب عمومی منع شوند.',
      ref:  'ICCPR ماده ۲۵ / ماده ۲۶',
      ok:   false,
      reason: 'محدودیت تبعیض‌آمیز بر حقوق سیاسی',
    },
    {
      user: '0x71c3…4f6b',
      text: 'هر کودکی صرف‌نظر از وضعیتش حق آموزش ابتدایی رایگان دارد.',
      ref:  'ICESCR ماده ۱۳',
      ok:   true,
    },
  ];

  var DATA = FA ? FA_POSTS : POSTS;

  /* ── HTML helpers ── */
  function h(cls, text) {
    return '<span class="' + cls + '">' + esc(text) + '</span>';
  }
  function esc(s) {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* Build the sequence of terminal lines for one post */
  function buildSession(post) {
    var lines = [];

    /* separator */
    lines.push({ html: h('t-sep', '─'.repeat(52)), delay: 0 });

    /* prompt line:  $ agora evaluate --did 0xc14b…e391 */
    lines.push({
      html: h('t-prompt', '$ ') +
            h('t-cmd',    'agora') + ' ' +
            h('t-arg',    'evaluate') + ' ' +
            h('t-dim',    '--did ') +
            h('t-user',   post.user),
      delay: 120,
    });

    /* post text line */
    lines.push({
      html: h('t-dim', '> ') + h('t-user', '"' + post.text + '"'),
      delay: 180,
    });

    /* checking line */
    lines.push({
      html: h('t-dim', '  llm-eval ') + h('t-ref', post.ref) + h('t-dim', ' …'),
      delay: 600,
    });

    /* result line */
    if (post.ok) {
      lines.push({
        html: h('t-ok', '  ✓ PASSED') + h('t-dim', '  — admitted to deliberation pool'),
        delay: 500,
      });
    } else {
      lines.push({
        html: h('t-flag', '  ✗ FLAGGED') + h('t-dim', '  — ' + (post.reason || 'policy violation')),
        delay: 500,
      });
    }

    return lines;
  }

  /* ── DOM bootstrap ── */
  function init() {
    document.querySelectorAll('.agora-term').forEach(function (term) {
      if (term.dataset.agoraBooted) return;
      term.dataset.agoraBooted = '1';

      var linesEl = term.querySelector('.agora-term__lines');
      if (!linesEl) return;

      var started = false;
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && !started) {
            started = true;
            runLoop(linesEl);
          }
        });
      }, { threshold: 0.25 });
      io.observe(term);
    });
  }

  /* ── main loop ── */
  function runLoop(linesEl) {
    var visibleLines = []; /* tracks live DOM nodes, oldest first */

    /* Build flat queue: all sessions one after another, then restart */
    var queue = [];

    /* opening splash */
    var splashLines = FA ? [
      { html: h('t-dim', 'Agora LLM Filter v2.4.1 — راه‌اندازی …'), delay: 0 },
      { html: h('t-dim', 'بارگذاری مدل روی میثاق‌های حقوق بشر سازمان ملل …'), delay: 400 },
      { html: h('t-ok',  '✓ ') + h('t-dim', 'آماده — ارزیابی خودکار پست‌های شهروندان'), delay: 400 },
    ] : [
      { html: h('t-dim', 'Agora LLM Filter v2.4.1 — initialising …'), delay: 0 },
      { html: h('t-dim', 'Loading model weights · UN covenants & conventions …'), delay: 400 },
      { html: h('t-ok',  '✓ ') + h('t-dim', 'Ready — running automated evaluation pipeline'), delay: 400 },
    ];
    splashLines.forEach(function (l) { queue.push(l); });

    DATA.forEach(function (post, i) {
      var session = buildSession(post);
      /* stagger between posts: first post comes quickly, rest have a pause */
      session[0].delay += (i === 0 ? 300 : 900);
      session.forEach(function (l) { queue.push(l); });
    });

    /* restart sentinel */
    queue.push({ html: '', delay: 3500, restart: true });

    /* Fire queue */
    var t = 0;
    queue.forEach(function (item) {
      t += item.delay;
      setTimeout(function () {
        if (item.restart) {
          /* fade out all remaining */
          visibleLines.slice().forEach(function (el, idx) {
            setTimeout(function () {
              el.classList.remove('term-line--visible');
              setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
              }, 350);
            }, idx * 60);
          });
          visibleLines = [];
          setTimeout(function () { runLoop(linesEl); }, 800 + DATA.length * 60);
          return;
        }
        pushLine(linesEl, visibleLines, item.html);
      }, t);
    });
  }

  /* ── add one line, scroll oldest off if needed ── */
  function pushLine(linesEl, visibleLines, html) {
    /* evict oldest if over limit */
    if (visibleLines.length >= MAX_LINES) {
      var old = visibleLines.shift();
      old.classList.remove('term-line--visible');
      setTimeout(function () {
        if (old.parentNode) old.parentNode.removeChild(old);
      }, 300);
    }

    var el = document.createElement('div');
    el.className = 'term-line';
    el.innerHTML = html;
    linesEl.appendChild(el);
    visibleLines.push(el);

    /* trigger transition */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('term-line--visible');
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
