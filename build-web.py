# Builds the installable GitHub Pages version (web/) from the single-file game (index.html).
# index.html itself is built from src/ by `node tools/build.js`; this script only wraps it for the web and the apps.
import hashlib, pathlib, shutil
root = pathlib.Path(__file__).parent
src = (root / 'index.html').read_text()
assert 'cdnjs' not in src   # the game has no script libraries; fonts come from Google Fonts and are cached by sw.js
head = '''
<meta name="theme-color" content="#0f1f3a">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Frost Swipe">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon-192.png">
<link rel="apple-touch-icon" href="apple-touch-icon.png">'''
i = src.index('<meta charset="utf-8">') + len('<meta charset="utf-8">')
out = src[:i] + head + src[i:]
sw_tag = "<script>if ('serviceWorker' in navigator && !window.Capacitor) addEventListener('load', () => navigator.serviceWorker.register('sw.js'));</script>\n"
j = out.rindex('</body>') if '</body>' in out else len(out)
out = out[:j] + sw_tag + out[j:]
web = root / 'web'; web.mkdir(exist_ok=True)
(web / 'index.html').write_text(out)
shutil.copy(root / 'privacy.html', web / 'privacy.html')
shutil.copy(root / 'terms.html', web / 'terms.html')
ver = hashlib.sha1((out + (web / 'manifest.webmanifest').read_text()).encode()).hexdigest()[:10]
(web / 'sw.js').write_text((root / 'sw-template.js').read_text().replace('__VERSION__', ver))
print('built web/ version', ver)

# Store assets page (web/store.html) so the store graphics can be saved from a phone.
store = root / 'store'
if store.exists():
    shutil.copytree(store, web / 'store', dirs_exist_ok=True, ignore=shutil.ignore_patterns('*.md', 'raw'))
    shutil.copy(web / 'icon-512.png', web / 'store' / 'icon-512.png')
    items = [('App icon (512×512)', 'store/icon-512.png')]
    if (store / 'feature-graphic-1024x500.png').exists(): items.append(('Feature graphic (1024×500)', 'store/feature-graphic-1024x500.png'))
    for sub, label in (('screenshots', 'Phone screenshot'), ('ios', 'iPhone screenshot')):
        items += [(f'{label} {p.stem}', f'store/{sub}/' + p.name) for p in sorted((store / sub).glob('*.png'))]
    cards = '\n'.join(f'<figure><img src="{u}" alt="{t}"><figcaption>{t} <a href="{u}" download>Download</a></figcaption></figure>' for t, u in items)
    (web / 'store.html').write_text(f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Frost Swipe store assets</title>
<style>body{{margin:0;padding:16px;background:#0f1f3a;color:#f4f9ff;font:16px/1.4 system-ui,sans-serif}}
h1{{font-size:22px;color:#8fd8ff}}p{{opacity:.85}}figure{{margin:0 0 28px}}img{{display:block;max-width:100%;border-radius:8px}}
figcaption{{margin-top:8px;display:flex;justify-content:space-between;gap:8px}}a{{color:#ff8a3d;font-weight:700}}</style></head>
<body><h1>Frost Swipe store assets</h1><p>Press and hold an image, then choose Save or Download image. Or tap Download.</p>
{cards}
</body></html>
''')
