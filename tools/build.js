// node tools/build.js -> index.html (core inlined, studio splash added)
const fs = require('fs'), path = require('path'), { execSync } = require('child_process');
const root = path.resolve(__dirname, '..');
let s = fs.readFileSync(root + '/src/frost-swipe.src.html', 'utf8');
s = s.replace('/*@CORE*/', () => fs.readFileSync(root + '/src/core.js', 'utf8').replace("if (typeof module !== 'undefined') module.exports = FS;", ''));
fs.writeFileSync(root + '/index.html', s);
const splash = process.env.SPLASH || path.join(root, 'tools/studio-splash/install.py');
if (fs.existsSync(splash)) execSync(`python3 ${splash} ${root}/index.html`, { stdio: 'inherit' });
console.log('built', (fs.statSync(root + '/index.html').size / 1024).toFixed(0) + ' KB');
