# Frost Swipe: Scrape & Reveal

A cosy winter game by Half Grid Games. Every level is a frozen window, windscreen, phone, porthole or mirror. Drag to scrape the frost off, but you only get five swipes, and each swipe runs out of grip after a while, so you plan your lines. Clear enough glass to pass, clear more for three stars, and find the little things hidden under the frost.

Endless levels (15 hand-made ones, then a generator), fog, snow, mud, algae and thick ice, shaped zones, find-the-hidden-thing goals, a daily window with a streak, boosters (extra swipe, wide blade, warm breath), lives, coins, scraper skins and a postcard album. Everything is drawn in code; the game ships no image or audio files.

- `src/`: the game source. `core.js` holds the rules, coverage grid, level generator and bot; `frost-swipe.src.html` holds the art, sound, UI and money code.
- `index.html`: the whole game in one file, built by `node tools/build.js` (inlines `core.js` and adds the Half Grid Games splash). Open it in a browser to play.
- `build-web.py`: wraps `index.html` into the installable web version in `web/` (GitHub Pages publishes it on every push to `main`).
- `android-app/`: the Android app (Capacitor 8), built by GitHub Actions. See `android-app/README.md` for signing and release steps.
- `android-app/ios/`: the iPhone and iPad app, built and uploaded to TestFlight on a cloud Mac. See `android-app/README-ios.md`.
- `privacy.html`, `terms.html`: published at `/privacy.html` and `/terms.html` on the Pages site.
- `store/`: store listing text and graphics. `tools/art/` draws the icon and feature graphic (`node tools/art/render.js`, then `python3 android-app/tools/make-icons.py`).
- `tools/test.js`: plays levels with real finger drags in a headless browser and reports win or fail (`node tools/test.js shots 1 2 3 30`). `tools/shots.js` takes screenshots.
- `GAME-NOTES.md`: design notes (rules, star maths, economy).

Money: rewarded ads (extra swipe, triple coins, a life, free coins) and light interstitials from level 12 (every 3rd level, at least 100 s apart, never on Remove Ads). AdMob is limited to PG ads. The ad consent form shows after the first level. In-app products: `remove_ads`, `coins_600`, `coins_2500`, `scraper_pack` (iPhone ids carry an `fs_` prefix). The apps use Google's test ad ids until the Frost Swipe AdMob apps exist; the web version shows stand-in ads and free test purchases.
