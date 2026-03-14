/**
 * render-pattern.js
 *
 * Truly generative Hat monotile renderer.
 *
 * Architecture
 *   - NO offscreen buffer. Every tile is drawn live every frame.
 *   - Each tile has its own opacity, line weight, breathe phase, and
 *     per-edge bezier curve magnitudes — all randomized per scene.
 *   - Tiles fade in individually over ~35 frames after spawning.
 *   - After all tiles are born they slowly breathe (opacity oscillation).
 *   - After a randomized hold the scene fades out and a new one with
 *     completely different parameters fades in.
 *   - Click for immediate new scene.
 */

document.addEventListener('DOMContentLoaded', () => {

    const container = document.getElementById('pattern-overlay');
    if (!container || typeof Patterns === 'undefined') return;

    container.style.backgroundImage = 'none';
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    // ── Viewport ─────────────────────────────────────────────────────────
    let W, H, DPR;
    function resize() {
        DPR = window.devicePixelRatio || 1;
        W   = container.clientWidth;
        H   = container.clientHeight;
        canvas.width  = W * DPR;
        canvas.height = H * DPR;
        ctx.scale(DPR, DPR);
    }
    resize();

    // ── Theme ─────────────────────────────────────────────────────────────
    function themeRgb() {
        return document.documentElement.getAttribute('data-theme') === 'light'
            ? [15, 23, 42] : [255, 255, 255];
    }

    // ── Deterministic hash (no seeded RNG needed per-vertex) ──────────────
    function hash3(a, b, c) {
        let h = Math.imul(a | 0, 2654435761) ^ Math.imul(b | 0, 2246822519) ^ Math.imul(c | 0, 3266489917);
        h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
        return ((h ^ (h >>> 16)) >>> 0) / 0xFFFFFFFF;
    }

    function makeRng(seed) {
        let x = seed | 0 || 1;
        return () => { x ^= x << 13; x ^= x >> 17; x ^= x << 5; return (x >>> 0) / 0xFFFFFFFF; };
    }

    // ── Per-unit style helper ─────────────────────────────────────────────
    // Called for every drawable unit regardless of pattern type.
    function styleUnit(cx, cy, s1, s2, breatheAmp, fillChance, bothChance, dashChance, maxDashLen, maxGapLen, sortJitter, midX, midY) {
        const bx = cx | 0, by = cy | 0;
        const h1 = hash3(bx, by, s1),       h2 = hash3(bx, by, s2);
        const h3 = hash3(bx, by, s1 + 7),   h4 = hash3(bx, by, s2 + 3);
        const h5 = hash3(bx, by, s1 + 41),  h6 = hash3(bx, by, s2 + 53);
        const h7 = hash3(bx, by, s1 + 97),  h8 = hash3(bx, by, s2 + 113);
        const doFill = h5 < fillChance;
        return {
            strokeOpacity: 0.12 + h1 * 0.52,
            lineWidth:     0.25 + h2 * 1.60,
            breathePhase:  h3 * Math.PI * 2,
            breatheAmpT:   breatheAmp * (0.3 + h4 * 1.4),
            doFill,
            doStroke:    !doFill || h6 < bothChance,
            fillOpacity: doFill ? 0.04 + h7 * 0.18 : 0,
            doDash:      !doFill && h8 < dashChance,
            dashLen:     1 + hash3(bx + 1, by, s1) * maxDashLen,
            gapLen:      1 + hash3(bx, by + 1, s2) * maxGapLen,
            _sortKey:    Math.hypot(cx - midX, cy - midY) + (hash3(bx, by, s1 + 99) - 0.5) * sortJitter,
            born: -1,
        };
    }

    // ── Build a scene — randomly picks hat / rosette / truchet ────────────
    const SCENE_TYPES = ['hat', 'hat', 'rosette', 'truchet'];  // hat weighted

    function buildScene() {
        const rand = makeRng(Math.floor(Math.random() * 1e9));
        const type = SCENE_TYPES[Math.floor(rand() * SCENE_TYPES.length)];

        // Shared style params
        const breatheSpeed = 0.3  + rand() * 1.2;
        const breatheAmp   = 0.04 + rand() * 0.18;
        const tilesPerTick = 2    + Math.floor(rand() * 8);
        const holdLimit    = 480  + Math.floor(rand() * 1440);
        const s1 = Math.floor(rand() * 1e9),  s2 = Math.floor(rand() * 1e9);
        const midX = W / 2, midY = H / 2;
        const sortJitter  = Math.hypot(midX, midY) * (0.04 + rand() * 0.25);
        const fillChance  = rand() * 0.40;
        const bothChance  = rand() * 0.25;
        const dashChance  = rand() * 0.35;
        const maxDashLen  = 2 + rand() * 6;
        const maxGapLen   = 2 + rand() * 6;
        const SA = [s1, s2, breatheAmp, fillChance, bothChance, dashChance, maxDashLen, maxGapLen, sortJitter, midX, midY];

        let tiles;

        if (type === 'hat') {
            const edgeLen    = 12 + Math.floor(rand() * 26);
            const orientSeed = Math.floor(rand() * 65521);
            const jitterAmp  = rand() * 3.2;
            const curveMag   = 0.3 + rand() * 4.0;
            const curveProb  = 0.4 + rand() * 0.5;
            tiles = new Patterns.HatTiling(edgeLen, orientSeed).generateTiles(W, H).map(bt => {
                const jPoly = bt.poly.map((pt, vi) => [
                    pt[0] + (hash3(Math.round(pt[0]*8), Math.round(pt[1]*8), s1 + vi*13) - 0.5) * jitterAmp * 2,
                    pt[1] + (hash3(Math.round(pt[0]*8), Math.round(pt[1]*8), s2 + vi*17) - 0.5) * jitterAmp * 2,
                ]);
                const edgeMags = jPoly.map((_, i) =>
                    hash3(bt.cx|0 + i, bt.cy|0 + i, s1 + i*31) > curveProb ? 0
                    : (hash3(bt.cx|0, bt.cy|0 + i, s2 + i*29) - 0.5) * curveMag * 2
                );
                return { kind: 'poly', poly: jPoly, edgeMags, cx: bt.cx, cy: bt.cy,
                         ...styleUnit(bt.cx, bt.cy, ...SA) };
            });

        } else if (type === 'rosette') {
            const CFGS = [
                [6,2,84],[7,2,78],[7,3,78],[8,2,72],[8,3,72],
                [9,2,66],[9,3,66],[9,4,66],[10,3,60],[10,4,60],[12,4,52],[12,5,52],
            ];
            const cfg  = CFGS[Math.floor(rand() * CFGS.length)];
            const data = new Patterns.Rosette(...cfg).tile(W, H);
            tiles = [];
            data.phases.forEach(phase => {
                phase.forEach(cmd => {
                    let cx, cy;
                    if      (cmd.type === 'line')   { cx = (cmd.x1+cmd.x2)/2; cy = (cmd.y1+cmd.y2)/2; }
                    else if (cmd.type === 'circle') { cx = cmd.x;  cy = cmd.y; }
                    else if (cmd.points) {
                        cx = cmd.points.reduce((s,p)=>s+(p.x??p[0]),0)/cmd.points.length;
                        cy = cmd.points.reduce((s,p)=>s+(p.y??p[1]),0)/cmd.points.length;
                    } else return;
                    tiles.push({ kind: cmd.type, cmd, cx, cy,
                                 baseOpacity: cmd.opacity ?? 0.4,
                                 ...styleUnit(cx, cy, ...SA) });
                });
            });

        } else {  // truchet
            const baseSize  = 60  + Math.floor(rand() * 100);
            const minSize   = 8   + Math.floor(rand() * 16);
            const splitProb = 0.40 + rand() * 0.38;
            const data = new Patterns.Truchet(baseSize, minSize, splitProb)
                             .generate(W, H, Math.floor(rand() * 999983));
            tiles = data.cmds.map(cmd => ({
                kind: 'arc', cmd, cx: cmd.midX, cy: cmd.midY,
                ...styleUnit(cmd.midX, cmd.midY, ...SA),
            }));
        }

        tiles.sort((a, b) => a._sortKey - b._sortKey);
        return { type, tiles, tilesPerTick, holdLimit, breatheSpeed,
                 spawnIdx: 0, done: false, holdAge: 0, alpha: 0, fadingOut: false };
    }

    // ── Trace a polygon path with optional bezier edge curves ─────────────
    function tracePoly(poly, edgeMags) {
        ctx.beginPath();
        ctx.moveTo(poly[0][0], poly[0][1]);
        for (let i = 0; i < poly.length - 1; i++) {
            const p1 = poly[i], p2 = poly[i + 1], mag = edgeMags[i];
            if (mag !== 0) {
                const mx = (p1[0]+p2[0])*0.5, my = (p1[1]+p2[1])*0.5;
                const dx = p2[0]-p1[0],       dy = p2[1]-p1[1];
                const len = Math.hypot(dx, dy) || 1;
                ctx.quadraticCurveTo(mx-(dy/len)*mag, my+(dx/len)*mag, p2[0], p2[1]);
            } else {
                ctx.lineTo(p2[0], p2[1]);
            }
        }
        ctx.closePath();
    }

    // ── Draw any unit — dispatches on unit.kind ──────────────────────────
    function drawUnit(u, fadeIn, breathe, rgb) {
        const so = u.strokeOpacity * fadeIn * breathe;
        const fo = u.fillOpacity   * fadeIn;
        const rs = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${so.toFixed(3)})`;
        const rf = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${fo.toFixed(3)})`;
        ctx.lineWidth = u.lineWidth;
        ctx.setLineDash(u.doDash ? [u.dashLen, u.gapLen] : []);

        if (u.kind === 'poly') {
            if (u.doFill && fo > 0.001)   { tracePoly(u.poly, u.edgeMags); ctx.fillStyle = rf; ctx.fill(); }
            if (u.doStroke && so > 0.001) { tracePoly(u.poly, u.edgeMags); ctx.strokeStyle = rs; ctx.stroke(); }

        } else if (u.kind === 'line') {
            if (so > 0.001) {
                ctx.strokeStyle = rs;
                ctx.beginPath(); ctx.moveTo(u.cmd.x1, u.cmd.y1); ctx.lineTo(u.cmd.x2, u.cmd.y2); ctx.stroke();
            }

        } else if (u.kind === 'circle') {
            if (so > 0.001) {
                ctx.strokeStyle = rs;
                ctx.beginPath(); ctx.arc(u.cmd.x, u.cmd.y, u.cmd.r, 0, Math.PI * 2); ctx.stroke();
            }

        } else if (u.kind === 'petal' || u.kind === 'diamond') {
            const pts = u.cmd.points;
            if (!pts || pts.length < 3) return;
            ctx.beginPath();
            ctx.moveTo(pts[0].x ?? pts[0][0], pts[0].y ?? pts[0][1]);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x ?? pts[i][0], pts[i].y ?? pts[i][1]);
            ctx.closePath();
            if (u.doFill && fo > 0.001)   { ctx.fillStyle   = rf; ctx.fill(); }
            if (u.doStroke && so > 0.001) { ctx.strokeStyle = rs; ctx.stroke(); }

        } else if (u.kind === 'arc') {
            if (so > 0.001) {
                const c = u.cmd;
                ctx.strokeStyle = rs;
                ctx.beginPath(); ctx.arc(c.cx, c.cy, c.r, c.startAngle, c.endAngle, c.ccw); ctx.stroke();
            }
        }
        ctx.setLineDash([]);
    }

    // ── Scene management ──────────────────────────────────────────────────
    let scene     = null;
    let nextScene = null;
    let frame     = 0;
    let rafId     = null;
    const FADE_FRAMES = 30;
    const SCENE_FADE  = 0.015;

    function triggerNewScene() {
        if (scene && !scene.fadingOut && !nextScene) {
            scene.fadingOut = true;
            nextScene = buildScene();
        }
    }

    // ── Main loop ─────────────────────────────────────────────────────────
    function loop() {
        frame++;
        ctx.clearRect(0, 0, W, H);

        // Scene cross-fade
        if (scene && scene.fadingOut) {
            scene.alpha = Math.max(0, scene.alpha - SCENE_FADE);
            if (scene.alpha <= 0) {
                scene          = nextScene;
                nextScene      = null;
                if (scene) scene.alpha = 0;
            }
        } else if (scene && scene.alpha < 1) {
            scene.alpha = Math.min(1, scene.alpha + SCENE_FADE);
        }

        if (!scene) { rafId = requestAnimationFrame(loop); return; }

        // Spawn new tiles
        if (!scene.done) {
            for (let i = 0; i < scene.tilesPerTick; i++) {
                if (scene.spawnIdx >= scene.tiles.length) { scene.done = true; break; }
                scene.tiles[scene.spawnIdx++].born = frame;
            }
        } else {
            scene.holdAge++;
            if (scene.holdAge > scene.holdLimit && !nextScene) triggerNewScene();
        }

        // Draw every born tile live
        const rgb = themeRgb();
        const t   = frame / 60;
        ctx.save();
        ctx.globalAlpha = scene.alpha;
        for (const tile of scene.tiles) {
            if (tile.born < 0) continue;
            const age     = frame - tile.born;
            const fadeIn  = age < FADE_FRAMES ? age / FADE_FRAMES : 1;
            const breathe = 1 + Math.sin(t * scene.breatheSpeed + tile.breathePhase) * tile.breatheAmpT;
            drawUnit(tile, fadeIn, breathe, rgb);
        }
        ctx.restore();

        rafId = requestAnimationFrame(loop);
    }

    // ── Start ─────────────────────────────────────────────────────────────
    scene = buildScene();
    rafId = requestAnimationFrame(loop);

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            cancelAnimationFrame(rafId);
            resize();
            scene = buildScene(); nextScene = null; frame = 0;
            rafId = requestAnimationFrame(loop);
        }, 250);
    });

    container.addEventListener('click', triggerNewScene);
    container.style.cursor = 'pointer';

});
