// node tools/store/screens.js : store screenshots (Play 1080x1920 in store/screenshots, iPhone 6.9" 1320x2868 in store/ios).
// Plays real levels in a headless browser, then frames each shot in a phone with a caption (compose.html).
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const root = path.resolve(__dirname, '../..');
const SHOTS = [
  ['1-scrape', 'Scrape the frost', 'Five swipes to clear the glass', { level: 1, part: 0.65 }],
  ['2-windscreen', 'Frozen windscreens', 'Phones, portholes, mirrors and more', { level: 5, part: 0.6 }],
  ['3-reveal', 'Reveal cosy scenes', 'Clear more glass for three stars', { level: 6, win: true }],
  ['4-snow', 'Snow, fog and ice', 'Every surface scrapes differently', { level: 8, part: 0.55 }],
  ['5-hidden', 'Find hidden things', 'Little surprises under the frost', { level: 3, part: 0.7 }],
  ['6-menu', 'A new window every day', 'Keep your daily streak going', { menu: true }],
];
async function raw(b, w, h, spec) {
  const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 3 });
  await page.goto('file://' + path.join(root, 'index.html')); await page.waitForTimeout(6500);
  if (!spec.menu) {
    await page.evaluate(L => { Object.assign(__fs.save.seen, { find: 1, boost: 1, sticker: 1, ice: 1, fog: 1, mud: 1, hard: 1, shape: 1, findgoal: 1, snow: 1, algae: 1, tut: 1 }); __fs.save.level = Math.max(__fs.save.level, L); __fs.save.fullTips = 9; __fs.startLevel(L); }, spec.level);
    await page.waitForTimeout(900);
    const plan = await page.evaluate(() => __fs.G.spec.plan);
    const drag = async (pts, hold) => { const P = await page.evaluate(p => p.map(([x, y]) => __fs.toScreen(x, y)), pts); await page.mouse.move(P[0][0], P[0][1]); await page.mouse.down(); for (let k = 1; k < P.length; k++) await page.mouse.move(P[k][0], P[k][1], { steps: 14 }); if (!hold) await page.mouse.up(); };
    const n = spec.win ? plan.length : Math.max(1, Math.round(plan.length * spec.part));
    for (let i = 0; i < n; i++) { await drag(plan[i], !spec.win && i === n - 1); await page.waitForTimeout(120); }
    await page.waitForTimeout(spec.win ? 7500 : 200);
  } else { await page.evaluate(() => { __fs.save.level = 23; __fs.save.coins = 640; __fs.save.daily.streak = 4; __fs.showMenu(); }); await page.waitForTimeout(1800); }
  const buf = await page.screenshot(); await page.close(); return buf;
}
(async () => {
  const b = await chromium.launch();
  for (const [dir, W, H, vw, vh] of [['screenshots', 1080, 1920, 390, 844], ['ios', 1320, 2868, 430, 932]]) {
    fs.mkdirSync(path.join(root, 'store', dir), { recursive: true });
    for (const [name, title, sub, spec] of SHOTS) {
      const img = (await raw(b, vw, vh, spec)).toString('base64');
      const p = await b.newPage({ viewport: { width: W, height: H } });
      await p.goto('file://' + path.join(__dirname, 'compose.html')); await p.evaluate(a => window.setShot(...a), [img, title, sub, W, H]); await p.waitForFunction(() => window.ready);
      await p.screenshot({ path: path.join(root, 'store', dir, name + '.png') }); await p.close(); console.log(dir, name);
    }
  }
  await b.close();
})();
