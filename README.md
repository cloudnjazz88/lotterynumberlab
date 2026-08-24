# US Lottery Statistics — Mega Millions & Powerball

A static, English-language statistics site for the two national US lottery games. It publishes
the probability mathematics behind both games, measures their complete drawing records, and
provides number generators weighted by that history.

Every figure on the site is **computed**, not typed in: prize-tier odds come from the published
ball matrices via the combination formula, and all statistics come from the bundled drawing
history. The generated odds tables reproduce the official Mega Millions and Powerball prize
charts exactly.

```
npm install          # puppeteer-core, for the browser smoke test only
npm run build        # render every HTML page, sitemap.xml, robots.txt, favicon
npm start            # serve the folder at http://localhost:5173
npm run check        # engine validation + headless browser test
npm run update-data  # refetch drawing history, then rebuild
```

There is no bundler and no framework. The generated files are plain HTML, CSS and JavaScript
that work from any static host — or straight off disk.

---

## Before you publish

Open `content/site.mjs` and fill in these three values, then run `npm run build`:

| Field | Why it matters |
| --- | --- |
| `url` | Canonical URLs, Open Graph tags and `sitemap.xml` all use it |
| `email` | The contact address shown on About, Privacy and Terms |
| `adsensePublisherId` | Leave empty until AdSense approves you. When set, the build injects the AdSense script, activates the reserved ad slots, and writes `ads.txt` |

`npm run build` prints an "ACTION REQUIRED" list for anything still at a placeholder value.

### AdSense readiness checklist

The site was built to satisfy the things Google's reviewers look for. What is already done:

- **Real pages, real URLs.** 16 crawlable HTML documents — no hash routing, no client-rendered
  content. Each has a unique `<title>`, a unique meta description, a canonical link, Open Graph
  tags, one `<h1>`, and JSON-LD (`Article` + `BreadcrumbList` on guides, `WebSite` on the home
  page). `sitemap.xml` and `robots.txt` are generated.
- **Substantial original content.** Eight guides of roughly 1,200–1,500 words each, all with
  computed tables rather than copied lists.
- **The pages reviewers ask for.** About (with contact address and data sources), Privacy policy
  (including the Google advertising cookie disclosures and opt-out links), Terms & full
  disclaimer, Responsible play.
- **Prominent disclaimers.** The entertainment-only statement appears in the footer of every
  page, inside every generator, and on every guide.
- **Ad slots reserved** in the layout, inert until a publisher ID is configured, so no blank ad
  frames are ever served.

What only you can do:

1. Host it on a domain you own and let it be crawlable for a while before applying.
2. Configure a Google-certified consent management platform (AdSense → Privacy & messaging) if
   you expect EEA/UK/Swiss traffic. Do not hand-roll a consent banner.
3. Keep the drawing data fresh (`npm run update-data`); stale results look abandoned.

Realistic expectation: **nobody can guarantee AdSense approval.** Lottery-related content sits
in a sensitive category, so even after approval Google may restrict which advertisers bid on
these pages. The site is deliberately positioned as statistics and education — it sells nothing,
promises nothing, links to no ticket seller, and states the odds honestly — which is the best
available position for a review.

---

## The two games

| | Mega Millions | Powerball |
| --- | --- | --- |
| Matrix | 5 of 70 + 1 of 24 | 5 of 69 + 1 of 26 |
| Ticket | $5 (2X–10X multiplier included) | $2 (+$1 optional Power Play) |
| Jackpot odds | 1 in 290,472,336 | 1 in 292,201,338 |
| Any prize | 1 in 23.07 | 1 in 24.87 |
| Drawings (ET) | Tue & Fri, 11:00 p.m. | Mon, Wed & Sat, 10:59 p.m. |
| History analysed | from 2017-10-31 | from 2015-10-07 |

All dates and times on the site are US Eastern Time.

### Why the history starts where it does

Ball-pool changes make older drawings statistically incomparable — before October 2015,
Powerball numbers 60–69 did not exist, so an all-time frequency table would show them as
permanently "cold". Statistics therefore begin at the first drawing of each current matrix.

One wrinkle is handled explicitly: on 2025-04-08 the Mega Ball pool shrank from 25 to 24.
The site uses the full 5/70 history for statistics (including drawings where a 25 was possible)
but **never generates a Mega Ball above 24**, and `tools/validate.mjs` asserts that.

---

## How the generator works

For each of the five lines:

1. **Weight every ball** by draw frequency, dry spell, momentum over the last 60 drawings, and
   affinity with balls already chosen. Bayesian smoothing (a 25-drawing uniform prior) keeps
   small windows from producing extreme weights.
2. **Sample a real structure.** Rather than filtering random picks, the generator samples an
   odd/even × low/high composition from its historical distribution, then fills it.
3. **Check the shape** against historical sum bands for that composition, decade spread and
   consecutive-pair frequency, relaxing in tiers only if a line cannot be placed.
4. **Reject duplicates** — combinations that have already won, and lines overlapping each other
   by more than the configured number of balls.

This produces lines that are *statistically typical* of past winners. It does not and cannot
improve the odds, which the site says plainly wherever numbers are generated.

---

## Layout

```
index.html  mega-millions.html  powerball.html      generated pages
guides/*.html  about.html  privacy-policy.html      generated pages
terms.html  responsible-play.html
sitemap.xml  robots.txt  favicon.svg  (ads.txt)     generated

content/site.mjs        site config, HTML shell, formatting helpers
content/app-views.mjs   home page and generator page markup
content/guides.mjs      the eight guides
content/legal.mjs       about, privacy, terms, responsible play

src/data.js       game definitions, eras, windows, ET drawing schedule
src/stats.js      frequencies, gaps, momentum, pairs, structural distributions
src/generator.js  weighted sampling and shape matching
src/charts.js     canvas charts
src/app.js        generator page wiring (no routing — one page per game)

data/draws.js     bundled snapshot loaded by the generator pages
data/draws.json   same data, for tooling

tools/build-site.mjs       renders every page
tools/compute-context.mjs  odds, chi-square, Monte Carlo, break-even figures
tools/fetch-draws.mjs      refreshes the history from data.ny.gov
tools/validate.mjs         engine checks (uniformity, ranges, shape fidelity)
tools/browser-check.mjs    crawls the built site in headless Chrome
tools/serve.mjs            local static server
```

**The HTML files are build output.** Edit `content/*.mjs` and re-run `npm run build`; direct
edits to the generated pages are overwritten.

---

## Testing

`npm run validate` checks the statistics and generator engine: ball ranges, era boundaries,
drawing-day consistency, the 24-Mega-Ball rule, uniformity of pure-random mode (chi-square),
and that generated sums and odd/even and low/high splits match the historical distributions.

`npm run smoke` serves the built site over HTTP and drives it in headless Chrome. It audits
every page (single `<h1>`, unique title and description, canonical link, JSON-LD, word count,
footer disclaimer, no dead internal links, no console errors), then exercises both generators,
the statistics tabs, preset switching, settings persistence across page loads, and the live data
refresh — at desktop and mobile widths, writing screenshots to `screenshots/`.

---

## Data source

Drawing results come from the New York State Open Data portal
([Mega Millions](https://data.ny.gov/d/5xaw-6ayf), [Powerball](https://data.ny.gov/d/d6yy-54nr)),
which republishes the official multi-state results. Game rules, prize structures and odds
statements come from megamillions.com and powerball.com.

---

## Disclaimer

The numbers this site produces are reference figures for **entertainment purposes only**, based
on historical statistics and a random sampling algorithm. Every lottery drawing is a perfectly
independent event, so nothing here guarantees or improves a win. Please do not buy lottery
tickets excessively.

This project is not affiliated with, endorsed by or connected to the Mega Millions Consortium,
the Multi-State Lottery Association (MUSL), or any state lottery. It sells no tickets and pays
no prizes. Verify every result with your state lottery before acting on it. Play only where
legal, and only if you are 18 or older (21 in some states). If gambling stops being fun, call
1-800-GAMBLER or visit [ncpgambling.org](https://www.ncpgambling.org/).
