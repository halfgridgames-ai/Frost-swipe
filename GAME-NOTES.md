# Frost Swipe: Scrape & Reveal

Five-swipe frost-scraping game, built 2026-11-22 from the Half Grid Hit Forecast (#2, https://claude.ai/artifact/FK6LVEWnvZJSnD7LhrdYft):
"defrost the phone in five strokes" is a current TikTok challenge, and winter is starting. Must ship by mid December.
Playable web build: https://claude.ai/artifact/SHzg5AAJMHhSQGJvmuFL8a (published from frost-swipe.html).

## Rules
- Drag on the glass to scrape. Each drag is one swipe, five per level. Each swipe has a length limit (the scraper fills
  with frost), so you plan your lines. Pass by clearing the 1-star %, 2 and 3 stars for more. Done button once passed;
  spare swipes pay 5 coins each.
- Frames: window (1x1 to 3x2 panes), arch, porthole, car windscreen (rear-view mirror blocks), phone (camera pill), oval
  mirror (fog), shop door. Mud on car windscreens from L30. Stickers (L9+) can't be scraped and don't count.
  Thick ice patches (L15+, frost only) need two passes. Hidden finds under the frost (robin, mitten, cookie, gem, hat,
  key, penguin, cocoa) count when 68% uncovered: +5 coins and a tally in the album. HARD every 10th from L20, double coins.
- Levels 1-10 hand-tuned intro; after that generated from the level number. The bot (core.js `plan`) tries 18 serpentine
  plans and its best % sets the stars: 1 star = bot x 0.70-0.86, 3 stars = bot x 0.95. `tools/test.js` plays the bot's
  lines with real mouse drags (all sampled levels 1-150 WON on 22 Nov).

## v2 (23 Nov 2026, after Joseph said it needed work and more variety)
- New glass: foggy glasses (two lenses), snow globe (snow surface), fish tank (algae surface, swimming fish),
  train window (scrolling countryside), freezer door, space hatch (Earth view). 15 views in all.
- Level goals: Shape levels (from L7, then every n%5==2): only glass inside a dotted heart/star/diamond/circle/tree
  counts. Find levels (L10, then n%7==3): uncover every hidden thing to pass; stars by %.
- Finds are placed only where the bot's five lines reach, and sit on their own layer (not blurred into the frost).
- Frost grows in at level start with a sparkle sound; "Nice! / Great line! / Amazing!" pop-ups for big swipes.
- Intro order 1-15: window, phone, porthole, 2-pane, car, glasses, heart window, globe, train, tank (find), freezer,
  space, star arch, mirror, door. v1 build kept in the scratchpad only.

## Art and feel
- Nine drawn views behind the glass (village, cosy room, snow garden, mountain road, lock screen, harbour, bathroom,
  bakery, frozen lake), each with something moving (snow, flicker, lighthouse beam, aurora twinkle, steam).
- Frost shows a blurred copy of the view through it plus ice ferns; fog has droplets; mud has splats. Erasing is real
  canvas erasing with crumbly edges; shavings fly off the blade and pile on the window sill; the scraper heap grows as
  it fills; ice cracks with chunks and a screen shake; on a win the frost melts away with drips.
- All sound is WebAudio: live scrape voice (crunch follows speed, squeak on clean glass), ice crack, flick, scraper-full
  clunk, find chime, star bells, % tick, melt drips, warm-breath whoosh, soft wind in levels.

## Economy
- Coins: 100 start; 10/15/25 by stars, +5 per find, +5 per spare swipe, x2 hard, daily +40. "Collect x3" ad.
- Boosters (2 each to start; then ad or coins): +1 Swipe (100), Wide blade (80, next swipe 1.6x wide, 0.8x long),
  Warm breath (80, tap to melt a patch). Fail screen: +1 swipe by ad or 100 coins.
- Lives: 5, one lost on giving up after a fail, one back every 20 min; ad = +1, 150 coins = refill.
- Scrapers: Classic, Mint 300, Berry 500, Midnight 900, Loyalty card 1400, Candy 2000, Gold + Crystal (scraper_pack).
- Products: remove_ads £2.99, coins_600 £0.99, coins_2500 £2.99, scraper_pack £1.99. Free 40 coins by ad.
- Interstitials from level 12, every 3rd level, 100 s apart, never after Remove ads. Consent after level 1. PG max rating.
- Daily challenge: a phone screen, same for everyone that day, streak + share text ("I cleared 94%... beat that").

## Build and test
- Edit src/frost-swipe.src.html (game) and src/core.js (shapes, coverage, levels, bot).
- `node tools/build.js` -> frost-swipe.html (core inlined, studio splash added).
- `node tools/test.js <outDir> [levels]` plays levels by real drags. `node tools/shots.js <outDir>` takes screenshots.

## Not done
- No GitHub repo yet (Joseph creates halfgridgames-ai/frost-swipe), no Play/iOS packaging, no TikTok clip.
