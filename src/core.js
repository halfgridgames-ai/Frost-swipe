// Frost Swipe core: level shapes, the coverage grid, the level generator and the line-planning bot.
// Runs in the game (inlined by tools/build.js) and in node (tools/*.js) so levels can be checked headless.
const FS = (() => {
  const BW = 100, BH = 150;              // board units; one coverage cell per unit
  const SWIPES = 5;
  function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  /* ---------- shapes ---------- */
  // a shape is { t:'rect'|'circle'|'ellipse'|'arch'|'poly', ... } in board units
  function inShape(s, x, y) {
    switch (s.t) {
      case 'rect': {
        if (x < s.x || x > s.x + s.w || y < s.y || y > s.y + s.h) return false;
        const r = s.r || 0; if (!r) return true;
        const cx = Math.min(Math.max(x, s.x + r), s.x + s.w - r), cy = Math.min(Math.max(y, s.y + r), s.y + s.h - r);
        return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
      }
      case 'circle': return (x - s.x) ** 2 + (y - s.y) ** 2 <= s.r * s.r;
      case 'ellipse': return ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 <= 1;
      case 'arch': { // rect whose top is a half circle
        const r = s.w / 2; if (x < s.x || x > s.x + s.w || y > s.y + s.h || y < s.y) return false;
        if (y >= s.y + r) return true; return (x - (s.x + r)) ** 2 + (y - (s.y + r)) ** 2 <= r * r;
      }
      case 'poly': {
        let inside = false; const p = s.pts;
        for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
          const [xi, yi] = p[i], [xj, yj] = p[j];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
        }
        return inside;
      }
    }
    return false;
  }

  /* ---------- frames ---------- */
  // each frame kind gives the glass (union of shapes) and parts that are never frosted (blocks)
  function frameShapes(kind, R, opt) {
    const glass = [], blocks = [];
    if (kind === 'window') {
      const x0 = 10, y0 = 14, w = 80, h = 122, m = 4, cols = opt.cols || 1, rows = opt.rows || 1;
      const pw = (w - m * (cols - 1)) / cols, ph = (h - m * (rows - 1)) / rows;
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) glass.push({ t: 'rect', x: x0 + i * (pw + m), y: y0 + j * (ph + m), w: pw, h: ph, r: 1.5 });
    } else if (kind === 'arch') {
      glass.push({ t: 'arch', x: 12, y: 12, w: 76, h: 126 });
      if (opt.cols === 2) blocks.push({ t: 'rect', x: 48, y: 12, w: 4, h: 126 });
    } else if (kind === 'port') {
      glass.push({ t: 'circle', x: 50, y: 76, r: 42 });
    } else if (kind === 'car') {
      glass.push({ t: 'poly', pts: [[20, 34], [80, 34], [97, 112], [3, 112]] });
      blocks.push({ t: 'rect', x: 42, y: 34, w: 16, h: 13, r: 3 });           // rear-view mirror
    } else if (kind === 'phone') {
      glass.push({ t: 'rect', x: 15, y: 8, w: 70, h: 134, r: 11 });
      blocks.push({ t: 'rect', x: 40, y: 12, w: 20, h: 6, r: 3 });            // camera pill
    } else if (kind === 'mirror') {
      glass.push({ t: 'ellipse', x: 50, y: 74, rx: 41, ry: 58 });
    } else if (kind === 'door') { // shop door: tall pane plus a round light above
      glass.push({ t: 'rect', x: 18, y: 48, w: 64, h: 90, r: 2 });
      glass.push({ t: 'circle', x: 50, y: 25, r: 17 });
    } else if (kind === 'glasses') {
      glass.push({ t: 'ellipse', x: 27, y: 76, rx: 21, ry: 24 }); glass.push({ t: 'ellipse', x: 73, y: 76, rx: 21, ry: 24 });
    } else if (kind === 'globe') {
      glass.push({ t: 'circle', x: 50, y: 62, r: 40 });
    } else if (kind === 'tank') {
      glass.push({ t: 'rect', x: 6, y: 22, w: 88, h: 106, r: 3 });
    } else if (kind === 'train') {
      glass.push({ t: 'rect', x: 8, y: 30, w: 84, h: 92, r: 14 });
    } else if (kind === 'freezer') {
      glass.push({ t: 'rect', x: 12, y: 10, w: 76, h: 128, r: 5 });
    } else if (kind === 'hatch') {
      glass.push({ t: 'circle', x: 50, y: 74, r: 40 });
    }
    // stickers sit on the glass and can't be scraped
    for (const st of opt.stickers || []) blocks.push(st);
    return { glass, blocks };
  }

  // target outline for shape levels: only glass inside it counts
  function zoneShape(z) {
    const { kind, x, y, s } = z, pts = [];
    if (kind === 'circle') return { t: 'circle', x, y, r: s };
    if (kind === 'heart') for (let i = 0; i < 48; i++) { const t = i / 48 * Math.PI * 2; pts.push([x + 16 * Math.sin(t) ** 3 * s / 16, y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s / 16 - s * 0.1]); }
    if (kind === 'star') for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.5 : s; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * 1.05 + s * 0.08]); }
    if (kind === 'diamond') pts.push([x, y - s * 1.15], [x + s * 0.8, y], [x, y + s * 1.15], [x - s * 0.8, y]);
    if (kind === 'tree') pts.push([x, y - s * 1.2], [x + s * 0.5, y - s * 0.45], [x + s * 0.3, y - s * 0.45], [x + s * 0.75, y + s * 0.3], [x + s * 0.45, y + s * 0.3], [x + s * 0.95, y + s * 1.05], [x + s * 0.18, y + s * 1.05], [x + s * 0.18, y + s * 1.3], [x - s * 0.18, y + s * 1.3], [x - s * 0.18, y + s * 1.05], [x - s * 0.95, y + s * 1.05], [x - s * 0.45, y + s * 0.3], [x - s * 0.75, y + s * 0.3], [x - s * 0.3, y - s * 0.45], [x - s * 0.5, y - s * 0.45]);
    return { t: 'poly', pts };
  }
  function buildMask(spec) {
    const { glass, blocks } = frameShapes(spec.frame, null, spec);
    const zone = spec.zone ? zoneShape(spec.zone) : null;
    const mask = new Uint8Array(BW * BH), count = new Uint8Array(BW * BH); let total = 0;
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
      const px = x + 0.5, py = y + 0.5;
      if (glass.some(s => inShape(s, px, py)) && !blocks.some(s => inShape(s, px, py))) { mask[y * BW + x] = 1; if (!zone || inShape(zone, px, py)) { count[y * BW + x] = 1; total++; } }
    }
    return { mask, count, total, glass, blocks, zone };
  }
  function bounds(mask) {
    let x0 = BW, y0 = BH, x1 = 0, y1 = 0;
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) if (mask[y * BW + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return { x0, y0, x1: x1 + 1, y1: y1 + 1 };
  }

  /* ---------- coverage ---------- */
  class Cover {
    constructor(spec, M) {
      M = M || buildMask(spec); this.spec = spec; this.mask = M.mask; this.total = M.total; this.glass = M.glass; this.blocks = M.blocks;
      this.count = M.count || M.mask; this.hp = new Uint8Array(BW * BH); this.last = new Int16Array(BW * BH).fill(-1);
      for (let i = 0; i < BW * BH; i++) if (this.mask[i]) this.hp[i] = 1;
      for (const c of spec.ice || []) for (let y = Math.floor(c.y - c.r); y <= c.y + c.r; y++) for (let x = Math.floor(c.x - c.r); x <= c.x + c.r; x++) {
        if (x < 0 || y < 0 || x >= BW || y >= BH) continue; const i = y * BW + x;
        if (this.mask[i] && (x + 0.5 - c.x) ** 2 + (y + 0.5 - c.y) ** 2 <= c.r * c.r) this.hp[i] = 2;
      }
      this.cleared = 0; this.swipe = 0;
    }
    pct() { return this.total ? this.cleared / this.total : 1; }
    // scrape a disc; returns [cells cleared now, ice cells cracked now]
    disc(x, y, r) {
      let got = 0, ice = 0; const r2 = r * r, sw = this.swipe;
      const ya = Math.max(0, Math.floor(y - r)), yb = Math.min(BH - 1, Math.floor(y + r)), xa = Math.max(0, Math.floor(x - r)), xb = Math.min(BW - 1, Math.floor(x + r));
      for (let cy = ya; cy <= yb; cy++) { const dy = cy + 0.5 - y; for (let cx = xa; cx <= xb; cx++) {
        const i = cy * BW + cx; if (!this.hp[i] || this.last[i] === sw) continue;
        const dx = cx + 0.5 - x; if (dx * dx + dy * dy > r2) continue;
        this.last[i] = sw; if (--this.hp[i] === 0) { if (this.count[i]) this.cleared++; got++; } else ice++;
      } }
      return [got, ice];
    }
    seg(ax, ay, bx, by, r) { const d = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(d / 0.8)); let g = 0, ic = 0; for (let k = 1; k <= n; k++) { const [a, b] = this.disc(ax + (bx - ax) * k / n, ay + (by - ay) * k / n, r); g += a; ic += b; } return [g, ic]; }
    // a cell-level fraction for a circle (hidden finds)
    clearIn(c) { let n = 0, done = 0; for (let y = Math.floor(c.y - c.r); y <= c.y + c.r; y++) for (let x = Math.floor(c.x - c.r); x <= c.x + c.r; x++) { if (x < 0 || y < 0 || x >= BW || y >= BH) continue; const i = y * BW + x; if (!this.mask[i] || (x + 0.5 - c.x) ** 2 + (y + 0.5 - c.y) ** 2 > c.r * c.r) continue; n++; if (!this.hp[i]) done++; } return n ? done / n : 1; }
    // play whole strokes (arrays of [x,y]); each stroke capped at length L
    play(strokes, r, L) {
      for (const s of strokes) { this.swipe++; let left = L; this.disc(s[0][0], s[0][1], r);
        for (let k = 1; k < s.length && left > 0; k++) { let [ax, ay] = s[k - 1], [bx, by] = s[k]; const d = Math.hypot(bx - ax, by - ay); if (d > left) { bx = ax + (bx - ax) * left / d; by = ay + (by - ay) * left / d; } left -= Math.min(d, left); this.seg(ax, ay, bx, by, r); } }
      return this.pct();
    }
  }

  /* ---------- bot: plans five serpentine strokes ---------- */
  function plan(spec, M) {
    M = M || buildMask(spec); const CM = M.count || M.mask, B = bounds(CM), r = spec.r, L = spec.L;
    let best = null;
    for (const vert of [true, false]) for (const sp of [1.7, 1.85, 2]) for (const off of [0, 0.35, 0.7]) {
      const step = sp * r, lanes = [];
      const a0 = vert ? B.x0 : B.y0, a1 = vert ? B.x1 : B.y1, b0 = vert ? B.y0 : B.x0, b1 = vert ? B.y1 : B.x1;
      for (let a = a0 + r * (0.75 + off * 0.4); a < a1 + r * 0.6; a += step) {
        // glass interval along this lane, trimmed a little so the blade edge isn't wasted
        let lo = null, hi = null;
        for (let b = b0; b < b1; b++) { const x = vert ? Math.min(BW - 1, Math.max(0, Math.floor(a))) : b, y = vert ? b : Math.min(BH - 1, Math.max(0, Math.floor(a))); if (CM[y * BW + x]) { if (lo === null) lo = b; hi = b + 1; } }
        if (lo === null) continue; const trim = Math.min(r * 0.55, (hi - lo) / 3); lanes.push([a, lo + trim, hi - trim]);
      }
      const pts = []; lanes.forEach(([a, lo, hi], i) => { const fwd = i % 2 === 0; const p1 = fwd ? lo : hi, p2 = fwd ? hi : lo; pts.push(vert ? [a, p1] : [p1, a], vert ? [a, p2] : [p2, a]); });
      if (!pts.length) continue;
      // cut the path into SWIPES strokes of length L
      const strokes = []; let cur = [pts[0]], left = L, k = 1, at = pts[0];
      while (k < pts.length && strokes.length < SWIPES) {
        const nx = pts[k], d = Math.hypot(nx[0] - at[0], nx[1] - at[1]);
        if (d <= left) { cur.push(nx); left -= d; at = nx; k++; }
        else { const p = [at[0] + (nx[0] - at[0]) * left / d, at[1] + (nx[1] - at[1]) * left / d]; cur.push(p); strokes.push(cur); at = p; cur = [p]; left = L; }
      }
      if (cur.length > 1 && strokes.length < SWIPES) strokes.push(cur);
      const C = new Cover(spec, M), pct = C.play(strokes, r, L);
      if (!best || pct > best.pct) best = { pct, strokes, vert, sp, off };
    }
    return best;
  }

  /* ---------- levels ---------- */
  const SCENES = ['village', 'room', 'garden', 'road', 'lock', 'harbour', 'bath', 'bakery', 'lake', 'city', 'globe', 'tank', 'train', 'freezer', 'space'];
  const FINDS = ['robin', 'mitten', 'cookie', 'gem', 'hat', 'key', 'penguin', 'cocoa'];
  function sceneFor(frame, rnd, n) {
    const pick = a => a[Math.floor(rnd() * a.length)];
    if (frame === 'car') return 'road';
    if (frame === 'phone') return 'lock';
    if (frame === 'mirror') return 'bath';
    if (frame === 'port') return pick(['harbour', 'lake']);
    if (frame === 'door') return 'bakery';
    const fixed = { glasses: 'city', globe: 'globe', tank: 'tank', train: 'train', freezer: 'freezer', hatch: 'space' }; if (fixed[frame]) return fixed[frame];
    return pick(['village', 'room', 'garden', 'lake', 'bakery', 'room', 'village']);
  }
  const INTRO = [
    null,
    { frame: 'window', cols: 1, rows: 1, C: 2.1, r: 12, scene: 'village' },
    { frame: 'phone', C: 1.9, r: 10 },
    { frame: 'port', C: 1.8, r: 10, scene: 'harbour', finds: 1 },
    { frame: 'window', cols: 2, rows: 1, C: 1.7, r: 9, scene: 'room', finds: 1 },
    { frame: 'car', C: 1.7, r: 9 },
    { frame: 'glasses', C: 1.7, r: 7.5, surface: 'fog', finds: 1 },
    { frame: 'window', C: 1.7, r: 8, scene: 'garden', zone: 'heart' },
    { frame: 'globe', C: 1.6, r: 9, surface: 'snow', finds: 1 },
    { frame: 'train', C: 1.6, r: 9, finds: 1 },
    { frame: 'tank', C: 1.6, r: 8.5, surface: 'algae', goal: 'find', finds: 3 },
    { frame: 'freezer', C: 1.55, r: 8.5, finds: 1, iceN: 1 },
    { frame: 'hatch', C: 1.55, r: 8.5, finds: 1 },
    { frame: 'arch', C: 1.55, r: 8, scene: 'room', zone: 'star' },
    { frame: 'mirror', C: 1.5, r: 8.5, surface: 'fog', finds: 1 },
    { frame: 'door', C: 1.5, r: 8.5, finds: 2, stickers: 1 },
  ];
  const SURF = { mirror: 'fog', glasses: 'fog', globe: 'snow', tank: 'algae' };
  function capacity(n) { return Math.max(1.12, 1.55 - (n - 10) * 0.012); }
  function level(n, daily) {
    let h = (daily || n) * 2654435761 >>> 0; h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13;
    const seed = h || 1, rnd = rng(seed); rnd(); rnd(); const pick = a => a[Math.floor(rnd() * a.length)];
    const hard = !daily && n >= 20 && n % 10 === 0;
    let spec;
    if (!daily && n < INTRO.length) spec = Object.assign({ cols: 1, rows: 1, surface: 'frost' }, INTRO[n]);
    else {
      const pool = ['window', 'window', 'arch', 'port', 'car', 'phone', 'door', 'mirror', 'glasses', 'globe', 'tank', 'train', 'train', 'freezer', 'hatch'];
      const frame = daily ? 'phone' : pick(pool);
      spec = { frame, cols: 1, rows: 1, surface: SURF[frame] || 'frost' };
      if (!daily && !hard) { if (n % 5 === 2) spec.zone = pick(['heart', 'star', 'diamond', 'circle', 'tree']); else if (n % 7 === 3) spec.goal = 'find'; }
      if (frame === 'window') { const g = pick([[1, 1], [2, 1], [2, 2], [1, 2], [3, 2], [2, 3]]); spec.cols = g[0]; spec.rows = g[1]; }
      if (frame === 'arch') spec.cols = rnd() < 0.5 ? 2 : 1;
      if (frame === 'car' && n >= 30 && rnd() < 0.5) spec.surface = 'mud';
      spec.C = daily ? 1.2 : capacity(n) * (hard ? 0.9 : 1);
      spec.r = Math.round((6.5 + rnd() * 3) * 2) / 2;
      spec.finds = spec.goal === 'find' ? (n < 40 ? 3 : 4) : 1 + Math.floor(rnd() * 3);
      spec.stickers = n >= 9 && rnd() < 0.45 ? 1 + (rnd() < 0.3 ? 1 : 0) : 0;
      spec.iceN = n >= 15 && spec.surface === 'frost' && !spec.zone ? (rnd() < 0.7 ? 1 + Math.floor(rnd() * Math.min(4, 1 + (n - 15) / 12)) : 0) : 0;
    }
    spec.n = n; spec.seed = seed; spec.hard = hard; spec.daily = !!daily; spec.goal = spec.goal || 'pct';
    spec.scene = spec.scene || sceneFor(spec.frame, rnd, n);
    if (spec.zone) { const G0 = bounds(buildMask(Object.assign({}, spec, { stickers: [], zone: null })).mask), cx = (G0.x0 + G0.x1) / 2, cy = (G0.y0 + G0.y1) / 2, sz = Math.min(G0.x1 - G0.x0, (G0.y1 - G0.y0) * 0.8) * 0.42; spec.zone = { kind: spec.zone, x: cx, y: cy, s: sz }; }
    // stickers: small round or square decals on the glass
    const M0 = buildMask(Object.assign({}, spec, { stickers: [] })), B = bounds(M0.mask);
    const inGlass = (x, y, pad) => { for (let a = 0; a < 8; a++) { const xx = Math.round(x + Math.cos(a * 0.785) * pad), yy = Math.round(y + Math.sin(a * 0.785) * pad); if (xx < 0 || yy < 0 || xx >= BW || yy >= BH || !M0.mask[yy * BW + xx]) return false; } return !!M0.mask[Math.floor(y) * BW + Math.floor(x)]; };
    const spot = (pad, avoid) => { for (let t = 0; t < 200; t++) { const x = B.x0 + pad + rnd() * (B.x1 - B.x0 - 2 * pad), y = B.y0 + pad + rnd() * (B.y1 - B.y0 - 2 * pad); if (inGlass(x, y, pad) && !avoid.some(o => Math.hypot(o.x - x, o.y - y) < o.r + pad + 3)) return { x, y }; } return null; };
    const used = [];
    const stick = []; for (let i = 0; i < (spec.stickers || 0); i++) { const p = spot(8, used); if (!p) continue; const sq = rnd() < 0.5; const s = sq ? { t: 'rect', x: p.x - 7, y: p.y - 7, w: 14, h: 14, r: 2.5, deco: pick(['star', 'paw', 'heart', 'sun']) } : { t: 'circle', x: p.x, y: p.y, r: 7, deco: pick(['star', 'paw', 'heart', 'sun']) }; stick.push(s); used.push({ x: p.x, y: p.y, r: 8 }); }
    spec.stickers = stick;
    const ice = []; for (let i = 0; i < (spec.iceN || 0); i++) { const r = 9 + rnd() * 7, p = spot(r * 0.6, used); if (!p) continue; ice.push({ x: p.x, y: p.y, r }); used.push({ x: p.x, y: p.y, r: r * 0.6 }); }
    spec.ice = ice;
    spec.findsAt = [];
    // swipe length from the capacity target: five strokes of width 2r and length L cover C x the glass
    const M = buildMask(spec);
    spec.L = Math.round(spec.C * M.total / (SWIPES * 2 * spec.r));
    const bot = plan(spec, M);
    // hidden finds go where the bot's lines reach, so every find can be uncovered in five swipes
    const BC = new Cover(spec, M); BC.play(bot.strokes, spec.r, spec.L);
    const finds = []; for (let i = 0; i < (spec.finds || 0); i++) { let p = null; for (let t = 0; t < 40 && !p; t++) { const q = spot(6, used); if (q && BC.clearIn({ x: q.x, y: q.y, r: 5.5 }) >= 0.95 && (!M.zone || M.count[Math.floor(q.y) * BW + Math.floor(q.x)])) p = q; } if (!p) continue; finds.push({ x: p.x, y: p.y, r: 5.5, kind: FINDS[(n * 3 + i * 5 + (daily ? 1 : 0)) % FINDS.length] }); used.push({ x: p.x, y: p.y, r: 6 }); }
    spec.findsAt = finds;
    const b = Math.min(1, bot.pct);
    const k1 = n <= 3 ? 0.7 : n <= 10 ? 0.78 : hard ? 0.86 : 0.82;
    spec.bot = b; spec.plan = bot.strokes;
    spec.stars = [Math.floor(b * k1 * 100), Math.floor(b * (k1 + 0.95) / 2 * 100), Math.floor(b * 0.95 * 100)];
    spec.stars[1] = Math.max(spec.stars[1], spec.stars[0] + 4); spec.stars[2] = Math.max(spec.stars[2], spec.stars[1] + 3);
    spec.total = M.total;
    return spec;
  }
  return { BW, BH, SWIPES, rng, inShape, frameShapes, zoneShape, buildMask, bounds, Cover, plan, level, SCENES, FINDS };
})();
if (typeof module !== 'undefined') module.exports = FS;
