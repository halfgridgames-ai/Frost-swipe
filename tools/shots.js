// node tools/shots.js <outDir> : menu, tutorial, mid-scrape, frames, win, fail, shop, album screenshots
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = process.argv[2] || 'shots'; const scale = +(process.argv[3] || 1);
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: scale });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + path.resolve(__dirname, '../index.html')); await page.waitForTimeout(6500);
  await page.screenshot({ path: `${out}/01-menu.png` });
  await page.evaluate(() => { __fs.save.lives = 5; }); await page.click('#playBtn'); await page.waitForTimeout(900); await page.screenshot({ path: `${out}/02-l1-tutorial.png` });
  const drag = async (pts, hold) => { const P = await page.evaluate(p => p.map(([x, y]) => __fs.toScreen(x, y)), pts); await page.mouse.move(P[0][0], P[0][1]); await page.mouse.down(); for (let k = 1; k < P.length; k++) await page.mouse.move(P[k][0], P[k][1], { steps: 18 }); if (!hold) await page.mouse.up(); };
  for (const lv of [6, 7, 8, 9, 10, 11, 12, 13]) {
    await page.evaluate(L => { Object.assign(__fs.save.seen, { find: 1, boost: 1, sticker: 1, ice: 1, fog: 1, mud: 1, hard: 1, shape: 1, findgoal: 1, snow: 1, algae: 1 }); __fs.startLevel(L); }, lv); await page.waitForTimeout(400);
    const plan = await page.evaluate(() => __fs.G.spec.plan);
    await drag(plan[0]); await page.waitForTimeout(150);
    const s = plan[1]; await drag([s[0], [s[0][0] + (s[1][0] - s[0][0]) * 0.6, s[0][1] + (s[1][1] - s[0][1]) * 0.6]], true);
    await page.waitForTimeout(120); await page.screenshot({ path: `${out}/03-L${lv}-scraping.png` }); await page.mouse.up(); await page.waitForTimeout(300);
  }
  // full win on level 6 to show the melt + card
  await page.evaluate(() => __fs.startLevel(6)); await page.waitForTimeout(300);
  for (const s of await page.evaluate(() => __fs.G.spec.plan)) await drag(s);
  await page.waitForTimeout(1500); await page.screenshot({ path: `${out}/04-melt.png` }); await page.waitForTimeout(2600); await page.screenshot({ path: `${out}/05-win.png` });
  // fail on level 9
  await page.evaluate(() => __fs.startLevel(9)); await page.waitForTimeout(300);
  for (let i = 0; i < 5; i++) await drag([[20 + i * 3, 30], [24 + i * 3, 50]]);
  await page.waitForTimeout(2200); await page.screenshot({ path: `${out}/06-fail.png` });
  await page.evaluate(() => { __fs.showMenu(); }); await page.waitForTimeout(400);
  await page.click('#shopBtn'); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/07-shop.png` }); await page.click('#shopClose');
  await page.click('#albumBtn'); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/08-album.png` }); await page.click('#albumClose');
  await page.evaluate(() => { __fs.save.seen = {}; __fs.startLevel(25); }); await page.waitForTimeout(500); await page.screenshot({ path: `${out}/09-tip.png` });
  console.log('errors:', errs.join('\n') || 'none'); await browser.close();
})();
