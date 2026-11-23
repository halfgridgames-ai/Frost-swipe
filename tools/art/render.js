// node tools/art/render.js : draws icon.html to web/icon-512.png, icon-192.png, apple-touch-icon.png, tools/art/icon-1024.png and store/feature-graphic-1024x500.png
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const root = path.resolve(__dirname, '../..'), b = await chromium.launch();
  for (const [mode, w, h, out] of [['icon', 1024, 1024, 'tools/art/icon-1024.png'], ['feature', 1024, 500, 'store/feature-graphic-1024x500.png']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto('file://' + __dirname + '/icon.html?mode=' + mode); await p.waitForFunction(() => window.done); await p.waitForTimeout(300);
    if (mode === 'feature') await p.reload(), await p.waitForFunction(() => window.done), await p.waitForTimeout(500);
    await p.screenshot({ path: path.join(root, out), clip: { x: 0, y: 0, width: w, height: h } });
  }
  await b.close();
})();
