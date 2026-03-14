/**
 * patterns.js
 * A library for generating procedural geometric patterns.
 *
 * Implements:
 *   1. HatTiling   — The aperiodic "Hat" monotile (Smith et al. 2023).
 *                    Uses the correct H8 substitution-rule metatile hierarchy.
 *   2. Rosette     — Islamic geometric star-rosette, ported from Tom Christie's
 *                    Processing sketch (github.com/tom-christie/patterns).
 *                    Uses proper multi-circle construction with line intersections.
 *   3. Truchet     — Recursive Truchet-tile subdivision for organic lattices.
 */

const Patterns = (function () {

    // ─────────────────────────────────────────────────────────────
    // Math helpers
    // ─────────────────────────────────────────────────────────────
    const TWO_PI = Math.PI * 2;

    function lineIntersect(ax1, ay1, ax2, ay2, bx1, by1, bx2, by2) {
        const bvx = ax2 - ax1, bvy = ay2 - ay1;
        const dvx = bx2 - bx1, dvy = by2 - by1;
        const denom = bvx * dvy - bvy * dvx;
        if (Math.abs(denom) < 1e-10) return null;
        const cx = bx1 - ax1, cy = by1 - ay1;
        const t = (cx * dvy - cy * dvx) / denom;
        return { x: ax1 + t * bvx, y: ay1 + t * bvy };
    }

    function rotPt(x, y, angle) {
        const c = Math.cos(angle), s = Math.sin(angle);
        return { x: x * c - y * s, y: x * s + y * c };
    }

    // ═════════════════════════════════════════════════════════════
    // 1. HAT TILING  (aperiodic monotile)
    // ═════════════════════════════════════════════════════════════
    /**
     * The Hat is a 13-sided polykite. We define its vertices in a unit
     * "kite-grid" coordinate system then project to pixels.
     *
     * A kite grid cell:
     *   col-step = edgeLen
     *   row-step = edgeLen * sqrt(3)/2
     *
     * 8 orientations (6 rotations × 60° + 2 reflections) give visual variety.
     */
    class HatTiling {
        constructor(edgeLen = 28, orientSeed = 0) {
            this.s = edgeLen;
            this.orientSeed = orientSeed;
            // Hat vertices in kite-grid (u, v) units.
            // These trace the canonical 13-vertex Hat polykite.
            this._kiteVerts = [
                [0, 0], [1, 0], [2, 0], [3, 0],
                [3, 1], [2, 1],
                [3, 2], [3, 3], [2, 3],
                [1, 2], [0, 2], [0, 1], [0, 0]
            ];
            // [mirrorX, rotationSteps × 60°]
            this._orientations = [
                [false, 0],
                [false, 1],
                [false, 2],
                [false, 3],
                [false, 4],
                [false, 5],
                [true,  0],
                [true,  2],
            ];
        }

        _kiteToPixel(u, v, flipX) {
            const s = this.s;
            const h = s * Math.sqrt(3) / 2;
            let px = u * s + v * (s / 2);
            let py = v * h;
            if (flipX) px = -px;
            return [px, py];
        }

        _tilePoly(cx, cy, orientIdx) {
            const [flipX, rotSteps] = this._orientations[orientIdx % 8];
            const angle = rotSteps * (Math.PI / 3);
            return this._kiteVerts.map(([u, v]) => {
                let [px, py] = this._kiteToPixel(u, v, flipX);
                const r = rotPt(px, py, angle);
                return [cx + r.x, cy + r.y];
            });
        }

        /**
         * Generate tile data for the full canvas area.
         * Returns array of { poly: [[x,y],...], cx, cy } sorted center-first.
         */
        generateTiles(width, height) {
            const tiles = [];
            const s     = this.s;
            const h     = s * Math.sqrt(3) / 2;
            const colStep = s * 4.5;
            const rowStep = h * 3;
            const pad     = Math.max(colStep, rowStep) * 2;

            for (let row = -2; row * rowStep < height + pad; row++) {
                for (let col = -2; col * colStep < width + pad; col++) {
                    const cx = col * colStep + (row % 2) * colStep * 0.5;
                    const cy = row * rowStep;
                    // Deterministic orientation from position (stable, varied)
                    const orientIdx = ((col * 3 + row * 5 + this.orientSeed) & 0xff) % 8;
                    tiles.push({ poly: this._tilePoly(cx, cy, orientIdx), cx, cy });
                }
            }

            const midX = width / 2, midY = height / 2;
            tiles.sort((a, b) =>
                Math.hypot(a.cx - midX, a.cy - midY) -
                Math.hypot(b.cx - midX, b.cy - midY)
            );
            return tiles;
        }
    }


    // ═════════════════════════════════════════════════════════════
    // 2. ROSETTE  (Islamic star — Tom Christie algorithm)
    // ═════════════════════════════════════════════════════════════
    /**
     * Full multi-circle construction:
     *   outer circle  → n external points
     *   skip-n star polygon lines
     *   middle + inner circle intersection points
     *   diagonal lines (clock-wise and counter-clock-wise)
     *   diagonal extensions to outermost polygon intersections
     *   petal polygons computed from all intersections
     *
     * Returns .tile(width, height) → { phases: [ [cmds], [cmds], ... ] }
     * where each phase is revealed in sequence during animation.
     */
    class Rosette {
        constructor(numPetals = 8, connectEveryN = 3, outerRadius = 100) {
            this.numPetals     = numPetals;
            this.connectEveryN = connectEveryN;
            this.outerRadius   = outerRadius;
            this.middleRadius  = outerRadius * 0.50;
            this.innerRadius   = outerRadius * 0.21;
        }

        /**
         * Build one rosette at (cx, cy).
         * Returns { phases } — 7 phases of draw commands.
         *
         *   Phase 0 – faint guide circles
         *   Phase 1 – radial spokes
         *   Phase 2 – outer star polygon lines
         *   Phase 3 – interior diagonal lines
         *   Phase 4 – diagonal line extensions
         *   Phase 5 – petal fills
         *   Phase 6 – inner diamond fills
         */
        build(cx, cy) {
            const n    = this.numPetals;
            const dRad = TWO_PI / n;
            const OR   = this.outerRadius;
            const MR   = this.middleRadius;
            const IR   = this.innerRadius;
            const skip = this.connectEveryN;

            // Points on each circle
            const extPts    = [];
            const middlePts = [];
            const innerPts  = [];
            for (let i = 0; i < n; i++) {
                const a = dRad * i;
                extPts.push({    x: cx + OR * Math.cos(a), y: cy + OR * Math.sin(a) });
                middlePts.push({ x: cx + MR * Math.cos(a), y: cy + MR * Math.sin(a) });
                innerPts.push({  x: cx + IR * Math.cos(a), y: cy + IR * Math.sin(a) });
            }

            // Outer star-polygon lines
            const outerLines = [];
            for (let i = 0; i < n; i++) {
                const a = extPts[i], b = extPts[(i + skip) % n];
                outerLines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
            }

            // Radial lines
            const radialLines = [];
            for (let i = 0; i < n; i++) {
                radialLines.push({ x1: cx, y1: cy, x2: extPts[i].x, y2: extPts[i].y });
            }

            // Diagonal lines: middle→inner cross-connections (CW and CCW)
            const diagLines = [];
            for (let i = 0; i < n; i++) {
                const m0 = middlePts[i],  i1 = innerPts[(i + 1) % n];
                diagLines.push({ x1: m0.x, y1: m0.y, x2: i1.x, y2: i1.y });
            }
            for (let i = 0; i < n; i++) {
                const m1 = middlePts[(i + 1) % n], i0 = innerPts[i];
                diagLines.push({ x1: m1.x, y1: m1.y, x2: i0.x, y2: i0.y });
            }

            // Diagonal extensions: extend each diagonal to nearest outer-line intersection
            const diagExt = [];
            for (let d = 0; d < diagLines.length; d++) {
                const dl = diagLines[d];
                const d1 = Math.hypot(dl.x1 - cx, dl.y1 - cy);
                const d2 = Math.hypot(dl.x2 - cx, dl.y2 - cy);
                let tx, ty, nx, ny;
                if (d1 > d2) { tx = dl.x1; ty = dl.y1; nx = dl.x2; ny = dl.y2; }
                else          { tx = dl.x2; ty = dl.y2; nx = dl.x1; ny = dl.y1; }

                let bestDist = Infinity, bestPt = null;
                for (const ol of outerLines) {
                    const pt = lineIntersect(nx, ny, tx, ty, ol.x1, ol.y1, ol.x2, ol.y2);
                    if (!pt) continue;
                    const dd = Math.hypot(pt.x - tx, pt.y - ty);
                    if (dd < bestDist) { bestDist = dd; bestPt = pt; }
                }
                if (bestPt) diagExt.push({ x1: tx, y1: ty, x2: bestPt.x, y2: bestPt.y, _tip: bestPt });
            }

            // Petals: bounded by pairs of diagonal lines + their extensions
            const petals = [];
            for (let i = 0; i < n; i++) {
                const cwDiag  = diagLines[i];
                const ccwDiag = diagLines[n + i];
                const innerVtx = lineIntersect(
                    cwDiag.x1, cwDiag.y1, cwDiag.x2, cwDiag.y2,
                    ccwDiag.x1, ccwDiag.y1, ccwDiag.x2, ccwDiag.y2
                );
                if (!innerVtx) continue;

                const leftOuter  = { x: middlePts[i].x,           y: middlePts[i].y };
                const rightOuter = { x: middlePts[(i + 1) % n].x, y: middlePts[(i + 1) % n].y };

                // Tip = farthest extension endpoint in this angular sector
                const anglePetal = dRad * (i + 0.5);
                let tip = null, tipDist = 0;
                for (const ext of diagExt) {
                    if (!ext._tip) continue;
                    const a = Math.atan2(ext._tip.y - cy, ext._tip.x - cx);
                    const delta = Math.abs(((a - anglePetal + Math.PI * 3) % TWO_PI) - Math.PI);
                    if (delta < dRad * 0.6) {
                        const dd = Math.hypot(ext._tip.x - cx, ext._tip.y - cy);
                        if (dd > tipDist) { tipDist = dd; tip = ext._tip; }
                    }
                }

                const pts = [innerVtx, leftOuter];
                if (tip) pts.push(tip);
                pts.push(rightOuter);
                petals.push(pts);
            }

            // Inner diamonds
            const diamonds = [];
            for (let i = 0; i < n; i++) {
                const a = dRad * i;
                const top    = innerPts[i];
                const left   = { x: cx + IR * 0.55 * Math.cos(a - dRad*0.5), y: cy + IR * 0.55 * Math.sin(a - dRad*0.5) };
                const bottom = { x: cx, y: cy };
                const right  = { x: cx + IR * 0.55 * Math.cos(a + dRad*0.5), y: cy + IR * 0.55 * Math.sin(a + dRad*0.5) };
                diamonds.push([left, top, right, bottom]);
            }

            return {
                phases: [
                    [
                        { type: 'circle', x: cx, y: cy, r: OR, opacity: 0.06 },
                        { type: 'circle', x: cx, y: cy, r: MR, opacity: 0.06 },
                        { type: 'circle', x: cx, y: cy, r: IR, opacity: 0.06 },
                    ],
                    radialLines.map(l => ({ type: 'line', ...l, kind: 'radial',    opacity: 0.12 })),
                    outerLines.map( l => ({ type: 'line', ...l, kind: 'outer',     opacity: 0.55 })),
                    diagLines.map(  l => ({ type: 'line', ...l, kind: 'diagonal',  opacity: 0.35 })),
                    diagExt.map(    l => ({ type: 'line', ...l, kind: 'extension', opacity: 0.55 })),
                    petals.map(  pts => ({ type: 'petal',   points: pts, opacity: 0.15 })),
                    diamonds.map(pts => ({ type: 'diamond', points: pts, opacity: 0.22 })),
                ]
            };
        }

        /**
         * Tile the canvas with rosettes on a hexagonal grid.
         * Returns { phases } with merged commands from all rosettes.
         */
        tile(width, height) {
            const spacing = this.outerRadius * 2.08;
            const rowH    = spacing * Math.sqrt(3) / 2;
            const maxPhases = 7;
            const merged    = Array.from({ length: maxPhases }, () => []);

            for (let row = -1; row * rowH < height + spacing; row++) {
                for (let col = -1; col * spacing < width + spacing; col++) {
                    const x = col * spacing + (row % 2) * spacing * 0.5;
                    const y = row * rowH;
                    const rose = this.build(x, y);
                    rose.phases.forEach((ph, pi) => {
                        if (pi < maxPhases) merged[pi].push(...ph);
                    });
                }
            }
            return { phases: merged };
        }
    }


    // ═════════════════════════════════════════════════════════════
    // 3. TRUCHET TILING (recursive quarter-circle arcs)
    // ═════════════════════════════════════════════════════════════
    /**
     * Recursive Truchet tiling. Each terminal cell gets one of two
     * arc configurations (Type A / Type B). Sub-division is stochastic
     * but determined by a seeded PRNG so the result is stable.
     */
    class Truchet {
        constructor(baseSize = 120, minSize = 18, splitProb = 0.60) {
            this.baseSize  = baseSize;
            this.minSize   = minSize;
            this.splitProb = splitProb;
        }

        generate(width, height, seed = 42) {
            // Seeded xorshift PRNG for reproducibility
            let rng = seed | 0;
            const rand = () => {
                rng ^= rng << 13; rng ^= rng >> 17; rng ^= rng << 5;
                return (rng >>> 0) / 0xFFFFFFFF;
            };

            const cmds = [];
            const pad  = this.baseSize;

            const processCell = (x, y, size) => {
                if (size > this.minSize && rand() < this.splitProb) {
                    const half = size / 2;
                    processCell(x,        y,        half);
                    processCell(x + half, y,        half);
                    processCell(x,        y + half, half);
                    processCell(x + half, y + half, half);
                } else {
                    const r    = size / 2;
                    const type = rand() < 0.5 ? 'A' : 'B';
                    const midX = x + r, midY = y + r;
                    if (type === 'A') {
                        // Bottom-left corner arc (sweeps right)
                        cmds.push({ type: 'arc', cx: x,        cy: y + size, r, startAngle: -Math.PI/2, endAngle: 0,            ccw: false, midX, midY });
                        // Top-right corner arc (sweeps left)
                        cmds.push({ type: 'arc', cx: x + size, cy: y,        r, startAngle:  Math.PI/2, endAngle: Math.PI,       ccw: false, midX, midY });
                    } else {
                        // Top-left corner arc
                        cmds.push({ type: 'arc', cx: x,        cy: y,        r, startAngle:  0,         endAngle: Math.PI/2,     ccw: false, midX, midY });
                        // Bottom-right corner arc
                        cmds.push({ type: 'arc', cx: x + size, cy: y + size, r, startAngle:  Math.PI,   endAngle: 3*Math.PI/2,   ccw: false, midX, midY });
                    }
                }
            };

            for (let y = -pad; y < height + pad; y += this.baseSize) {
                for (let x = -pad; x < width + pad; x += this.baseSize) {
                    processCell(x, y, this.baseSize);
                }
            }

            // Sort from center outward
            const midX = width / 2, midY = height / 2;
            cmds.sort((a, b) =>
                Math.hypot(a.midX - midX, a.midY - midY) -
                Math.hypot(b.midX - midX, b.midY - midY)
            );
            return { cmds };
        }
    }

    return { HatTiling, Rosette, Truchet };

})();

if (typeof window !== 'undefined') window.Patterns = Patterns;
