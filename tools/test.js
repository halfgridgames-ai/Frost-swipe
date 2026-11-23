// node tools/test.js [outDir] [levels...] : plays levels by real drags along the bot's planned lines
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[2] || 'shots'; const pick = process.argv.slice(3).map(Number);
const levels = pick.length ? pick : [...Array.from({ length: 25 }, (_, i) => i + 1), 30, 34, 40, 42, 50, 53, 60, 77, 100, 150];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(3600);
  await page.evaluate(() => { __fs.TEST.speed = 4; Object.assign(__fs.save.seen, { find: 1, boost: 1, sticker: 1, ice: 1, fog: 1, mud: 1, hard: 1, shape: 1, findgoal: 1, snow: 1, algae: 1 }); __fs.save.lives = 99; });
  const res = [];
  for (const L of levels) {
    await page.evaluate(L => __fs.startLevel(L), L); await page.waitForTimeout(100);
    if (L === 1) await page.evaluate(() => { __fs.G.tut = null; });
    const plan = await page.evaluate(() => __fs.G.spec.plan.map(s => s.map(([x, y]) => __fs.toScreen(x, y))));
    for (const s of plan) {
      await page.mouse.move(s[0][0], s[0][1]); await page.mouse.down();
      for (let k = 1; k < s.length; k++) await page.mouse.move(s[k][0], s[k][1], { steps: Math.max(2, Math.round(Math.hypot(s[k][0] - s[k - 1][0], s[k][1] - s[k - 1][1]) / 6)) });
      await page.mouse.up(); await page.waitForTimeout(30);
    }
    await page.waitForTimeout(300); await page.evaluate(() => { if (__fs.G.state === 'play' && !document.querySelector('#doneBtn').hidden) document.querySelector('#doneBtn').click(); });
    await page.waitForFunction(() => __fs.G.state === 'won' || __fs.G.state === 'failed', null, { timeout: 8000 }).catch(() => {});
    const st = await page.evaluate(() => ({ g: __fs.G.spec.goal + (__fs.G.spec.zone ? ':' + __fs.G.spec.zone.kind : ''), s: __fs.G.state, pct: Math.floor(__fs.G.cover.pct() * 100), stars: __fs.G.spec.stars, used: __fs.G.used, frame: __fs.G.spec.frame, f: __fs.G.found.filter(Boolean).length + '/' + __fs.G.found.length }));
    if (pick.length || [1, 2, 5, 7, 9, 25, 34].includes(L)) { await page.waitForTimeout(500); await page.screenshot({ path: `${out}/L${L}-end.png` }); }
    res.push(`L${L} ${st.frame} ${st.g} pct ${st.pct} stars ${st.stars.join('/')} used ${st.used} finds ${st.f} ${st.s.toUpperCase()}`);
  }
  console.log(res.join('\n')); console.log('errors:', [...new Set(errs)].join('\n') || 'none');
  await browser.close();
})();
