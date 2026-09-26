/* Markup for the home page and the two generator pages. */

import {
  SITE,
  CORE_DISCLAIMER,
  adSlot,
  link,
  num,
  oneIn,
  pct,
  table,
  dateLong,
} from "./site.mjs";
import { jackpotMarkup } from "../tools/jackpot-present.mjs";

const pad = (n) => String(n).padStart(2, "0");

function balls(config, draw) {
  return (
    draw.n.map((n) => `<span class="ball">${pad(n)}</span>`).join("") +
    `<span class="balls__plus">+</span>` +
    `<span class="ball ball--special" title="${config.specialName}">${pad(draw.s)}</span>`
  );
}

/** Time-sensitive text is filled in by the browser; this is the build-time value. */
function nextDrawing(config, gameId) {
  return `<span data-next-drawing="${gameId}">see below</span>`;
}
function awaitingBanner(game) {
  if (!game.awaitingUpdate) return "";
  const latest = game.history.draws[0];
  return `<p class="latest-status latest-status--awaiting" data-awaiting-update="${game.config.id}" data-latest-draw="${latest.d}">
            <strong>Last confirmed result:</strong> ${dateLong(latest.d)}.
            A newer drawing should already have been posted; this page updates when the official feed refreshes. Numbers are never invented here.
          </p>`;
}


function gameHref(config) {
  return config.id === "megamillions" ? "mega-millions.html" : "powerball.html";
}

function latestSpotlight(game) {
  const config = game.config;
  const latest = game.history.draws[0];
  const estimate = jackpotMarkup(game.jackpot, true);
  const showSchedule =
    !game.jackpot || game.jackpot.state === "expired"
      ? `
          <p class="latest-card__next">
            Next drawing ${nextDrawing(config, config.id)} · ${config.drawDaysLabel}, ${config.drawTimeLabel}
          </p>`
      : "";
  return `<article class="latest-card" data-game="${config.id}">
          <div class="latest-card__head">
            <span class="latest-card__mark">${config.tag}</span>
            <div>
              <p class="latest-card__kicker">Latest drawing</p>
              <h2>${config.name}</h2>
              <p>${dateLong(latest.d)} · ${config.specialAbbr} = ${config.specialName}</p>
            </div>
          </div>
          <div class="balls balls--xl">${balls(config, latest)}</div>
          ${awaitingBanner(game)}
          ${estimate}${showSchedule}
          <a class="latest-card__btn latest-card__btn--generator" href="${gameHref(config)}">Open the ${config.name} generator</a>
        </article>`;
}

function gameCard(game, depth) {
  const config = game.config;
  const latest = game.history.draws[0];
  return `<a class="game-card" href="${link(`${config.id === "megamillions" ? "mega-millions" : "powerball"}.html`, depth)}" data-game="${config.id}">
          <div class="game-card__head">
            <span class="game-card__mark">${config.tag}</span>
            <div>
              <h3>${config.name}</h3>
              <p>${config.matrixLabel} · ${config.ticketPrice} per play</p>
            </div>
          </div>
          <div class="game-card__draw">
            <span class="game-card__label">Latest result · ${dateLong(latest.d)}</span>
            <div class="balls">${balls(config, latest)}</div>
          </div>
          <dl class="game-card__facts">
            <div><dt>Next drawing</dt><dd>${nextDrawing(config, config.id)}</dd></div>
            <div><dt>Schedule</dt><dd>${config.drawDaysLabel}, ${config.drawTimeLabel}</dd></div>
            <div><dt>Jackpot odds</dt><dd>${oneIn(config.jackpotOdds)}</dd></div>
            <div><dt>Any prize</dt><dd>${oneIn(game.table.anyPrizeOneIn)}</dd></div>
            <div>
              <dt>History analysed</dt>
              <dd>${num(game.history.count)} drawings since ${dateLong(game.history.firstDraw)}</dd>
            </div>
          </dl>
          <span class="game-card__cta">Open the statistics dashboard <span aria-hidden="true">→</span></span>
        </a>`;
}

function recentColumn(game) {
  const config = game.config;
  return `<div class="recent-col" data-game="${config.id}">
          <div class="recent-col__head">
            <span class="recent-col__mark">${config.tag}</span>
            <div>
              <h3>${config.name}</h3>
              <p>${config.specialAbbr} = ${config.specialName} · last 8 drawings</p>
            </div>
          </div>
          ${game.history.draws
            .slice(0, 8)
            .map(
              (draw) => `<div class="draw-row">
            <span class="draw-row__date">${dateLong(draw.d)}</span>
            ${balls(config, draw)}
            <span class="draw-row__sum">sum ${draw.n.reduce((a, b) => a + b, 0)}</span>
          </div>`,
            )
            .join("\n          ")}
        </div>`;
}

export function guideCards(guides, depth, limit) {
  return (limit ? guides.slice(0, limit) : guides)
    .map(
      (guide) => `<a class="guide-card" href="${link(`guides/${guide.slug}.html`, depth)}">
          <span class="guide-card__kicker">${guide.kicker}</span>
          <h3>${guide.title}</h3>
          <p>${guide.dek}</p>
          <span class="guide-card__more">Read the guide <span aria-hidden="true">→</span></span>
        </a>`,
    )
    .join("\n        ");
}


function homeRecentRows(game) {
  const config = game.config;
  return game.history.draws
    .slice(0, 5)
    .map(
      (draw) => `<li class="home-recent__row">
              <time datetime="${draw.d}">${dateLong(draw.d)}</time>
              <div class="balls balls--sm" aria-label="Winning numbers">${balls(config, draw)}</div>
            </li>`,
    )
    .join("\n            ");
}

function homeRecentPanel(mm, pb) {
  const col = (game) => {
    const config = game.config;
    return `<div class="home-recent__col" data-game="${config.id}">
            <h3 class="home-recent__game">${config.name}</h3>
            <ol class="home-recent__list">
            ${homeRecentRows(game)}
            </ol>
          </div>`;
  };
  return `<section class="home-recent" aria-labelledby="home-recent-heading">
        <div class="home-recent__head">
          <h2 class="section__title" id="home-recent-heading">Recent drawings</h2>
          <a class="text-link" href="results/index.html">Full archive</a>
        </div>
        <div class="home-recent__grid">
          ${col(mm)}
          ${col(pb)}
        </div>
      </section>`;
}

export function homeBody(ctx, guides) {
  const mm = ctx.mm;
  const pb = ctx.pb;
  const featured =
    guides.find((g) => g.slug === "independent-trials") || guides[1];
  const related = [
    guides.find((g) => g.slug === "mega-millions-vs-powerball-odds") || guides[0],
    guides.find((g) => g.slug === "hot-and-cold-numbers-tested") || guides[6],
    guides.find((g) => g.slug === "record-jackpots-and-taxes") || guides[2],
  ].filter(Boolean);

  return `      <section class="hero hero--compact">
        <p class="hero__eyebrow">INDEPENDENT LOTTERY DATA</p>
        <h1>Understand the numbers before you play.</h1>
        <p class="hero__lead">
          Verified Mega Millions and Powerball results, honest odds, and tools that
          explain what the numbers mean — without hype or predictions.
        </p>
        <div class="hero-ctas hero-ctas--compact">
          <a class="hero-cta" href="tools/index.html">Explore the tools</a>
          <a class="hero-cta hero-cta--secondary" href="results/index.html">Browse results</a>
        </div>
        <p class="hero__note">${SITE.timeZoneNote} This site does not sell tickets.</p>
      </section>

      <section class="latest-strip" aria-labelledby="latest-heading">
        <div class="latest-strip__head">
          <h2 class="section__title" id="latest-heading">Latest results</h2>
          <p>
            Most recent drawings. Confirm a ticket with your state lottery before you claim.
            <a class="text-link" href="results/index.html">Full archive</a>
          </p>
        </div>
        <div class="latest-grid">
        ${latestSpotlight(mm)}
        ${latestSpotlight(pb)}
        </div>
        ${homeRecentPanel(mm, pb)}
      </section>

      <section class="panel panel--warm panel--utility" aria-labelledby="tools-rail-heading">
        <h2 class="section__title" id="tools-rail-heading">What do you want to know?</h2>
        <p class="section__lead section__lead--warm">
          Four starting points — each link is a real page, not a fake checker.
        </p>
        <ul class="utility-rail">
          <li class="utility-rail__item">
            <a href="tools/ticket-match-checker.html">
              <span class="utility-rail__label">Check numbers</span>
              <span class="utility-rail__hint">Compare your numbers with a published drawing or search past results</span>
            </a>
          </li>
          <li class="utility-rail__item">
            <a href="tools/odds-explorer.html">
              <span class="utility-rail__label">Compare odds</span>
              <span class="utility-rail__hint">Odds explorer: jackpot and prize-tier chances across tickets</span>
            </a>
          </li>
          <li class="utility-rail__item">
            <a href="guides/record-jackpots-and-taxes.html">
              <span class="utility-rail__label">Estimate take-home</span>
              <span class="utility-rail__hint">Tax guide: cash option and what winners actually receive</span>
            </a>
          </li>
          <li class="utility-rail__item">
            <a href="tools/lottery-spending-calculator.html">
              <span class="utility-rail__label">Track spending</span>
              <span class="utility-rail__hint">Spending calculator: weekly to multi-year ticket cost</span>
            </a>
          </li>
        </ul>
      </section>

      <section class="panel panel--warm" aria-labelledby="analysis-heading">
        <h2 class="section__title" id="analysis-heading">Analysis &amp; explanations</h2>
        <p class="section__lead section__lead--warm">
          Start with the evidence. More guides live under Learn.
        </p>
        <div class="analysis-feature">
          <a class="analysis-feature__main" href="guides/${featured.slug}.html">
            <span class="guide-card__kicker">${featured.kicker}</span>
            <h3>${featured.title}</h3>
            <p>${featured.dek}</p>
            <span class="guide-card__more">Read the guide <span aria-hidden="true">→</span></span>
          </a>
          <ul class="analysis-feature__related">
            ${related
              .map(
                (g) => `<li>
              <a href="guides/${g.slug}.html">
                <strong>${g.title}</strong>
                <span>${g.dek}</span>
              </a>
            </li>`,
              )
              .join("")}
          </ul>
        </div>
        <p class="section__after">
          <a class="text-link" href="guides/index.html">Browse all guides →</a>
          ·
          <a class="text-link" href="analyze/index.html">Open Analyze hub →</a>
        </p>
      </section>

${adSlot("home-mid")}

      <section class="trust-strip" aria-labelledby="trust-heading">
        <h2 class="trust-strip__title" id="trust-heading">Verified data. Transparent methods.</h2>
        <p class="trust-strip__dek">
          Drawing records come from public open-data feeds. Odds are computed from published
          matrices. Corrections are welcome.
        </p>
        <nav class="trust-strip__links" aria-label="Trust and policy">
          <a href="methodology.html">Methodology</a>
          <a href="methodology.html#sources">Sources</a>
          <a href="methodology.html#corrections">Corrections</a>
          <a href="responsible-play.html">Responsible play</a>
        </nav>
      </section>
`;
}

/* ------------------------------ generator page ---------------------------- */

function prizeRows(game) {
  return game.table.rows.map((row) => [
    row.match,
    row.prize === "Jackpot" ? "<b>Jackpot</b>" : row.prize,
    oneIn(row.oneIn),
  ]);
}

export function gameBody(ctx, gameId, guides) {
  const game = ctx.games[gameId];
  const config = game.config;
  const other = gameId === "megamillions" ? ctx.pb : ctx.mm;
  const otherHref = gameId === "megamillions" ? "powerball.html" : "mega-millions.html";
  const multiplierNote =
    gameId === "megamillions"
      ? `Every $5 play carries a built-in random multiplier of 2X, 3X, 4X, 5X or 10X that is
         applied to any non-jackpot prize, so the smallest possible win is $10.`
      : `Power Play is an optional $1 add-on that multiplies non-jackpot prizes by 2X–10X
         (the $1,000,000 tier is capped at $2,000,000).`;
  const latest = game.history.draws[0];
  const archiveYear = latest.d.slice(0, 4);
  const archiveHref = `results/${gameId === "megamillions" ? "mega-millions" : "powerball"}-${archiveYear}.html`;

  return `      <section class="panel panel--generator">
        <div class="gen-head">
          <div>
            <h1 id="genTitle">${config.name} winning numbers and number generator</h1>
            <p id="genSubtitle">
              Latest ${config.name} drawing ${dateLong(latest.d)}. Generate ticket lines, compare
              them with frequencies from ${num(game.history.count)} drawings since
              ${dateLong(game.history.firstDraw)}, and review official odds. Drawn
              ${config.drawDaysLabel} at ${config.drawTimeLabel}.
            </p>
            <p class="next-draw">
              Next drawing:
              <b data-next-drawing="${config.id}">${config.drawDaysLabel}, ${config.drawTimeLabel}</b>
            </p>
          </div>
          <button id="generateBtn" class="cta" type="button">
            <span class="cta__icon" aria-hidden="true">✦</span>
            <span class="cta__label">Generate 5 lines</span>
          </button>
        </div>

        <section class="latest-on-game" aria-label="Latest ${config.name} drawing">
          <p class="latest-on-game__kicker">${game.awaitingUpdate ? "Last confirmed winning numbers" : "Latest winning numbers"} · ${dateLong(latest.d)} ET</p>
          <div class="balls balls--xl">${balls(config, latest)}</div>
          ${awaitingBanner(game)}
          ${jackpotMarkup(game.jackpot)}
          <ol class="latest-on-game__recent">
            ${game.history.draws
              .slice(1, 6)
              .map(
                (draw) => `<li>
              <time datetime="${draw.d}">${dateLong(draw.d)}</time>
              ${balls(config, draw)}
            </li>`,
              )
              .join("")}
          </ol>
          <p class="latest-on-game__note">
            Confirm a ticket with your state lottery before you claim.
            <a class="text-link" href="${archiveHref}">${config.name} winning numbers for ${archiveYear}</a>
          </p>
        </section>

        <div id="games" class="games" aria-live="polite">
          <div class="empty-state">
            <div class="empty-state__balls" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
            <p>Press <b>Generate 5 lines</b> to get your ${config.name} numbers.</p>
            <span
              >Frequency, dry spells, recent momentum, pair affinity, sums and odd/even balance
              all come from the real winning history.</span
            >
          </div>
        </div>

        <div class="ball-legend" id="ballLegend" hidden>
          <span><i class="dot--hot"></i>running hot</span>
          <span><i class="dot--cold"></i>running cold</span>
          <span><i class="dot--due"></i>long dry spell</span>
          <span class="ball-legend__hint">Hover a ball for its full statistics</span>
        </div>

        <div class="gen-foot">
          <div class="gen-foot__meta" id="genMeta"></div>
          <div class="gen-foot__actions">
            <button id="copyAll" class="btn btn--ghost" type="button" disabled>Copy all</button>
          </div>
        </div>

        <p class="inline-disclaimer">${CORE_DISCLAIMER}</p>
      </section>

      <aside class="panel panel--settings">
        <h2>Method settings</h2>

        <div class="field">
          <label for="windowSelect">Analysis window</label>
          <select id="windowSelect"></select>
          <p class="field__hint" id="windowHint"></p>
        </div>

        <div class="field">
          <span class="field__label">Weighting preset</span>
          <div class="presets" id="presets">
            <button type="button" class="chip is-on" data-preset="balanced">Balanced</button>
            <button type="button" class="chip" data-preset="hot">Hot numbers</button>
            <button type="button" class="chip" data-preset="cold">Cold &amp; overdue</button>
            <button type="button" class="chip" data-preset="max">Max statistics</button>
            <button type="button" class="chip" data-preset="pure">Pure random</button>
          </div>
        </div>

        <div class="sliders" id="sliders">
          <div class="slider" data-key="freq">
            <div class="slider__top">
              <label for="wFreq">Draw frequency</label>
              <output id="wFreqOut">0.60</output>
            </div>
            <input id="wFreq" type="range" min="-1.2" max="1.2" step="0.05" value="0.6" />
            <div class="slider__ends"><span>rarely drawn</span><span>often drawn</span></div>
          </div>
          <div class="slider" data-key="gap">
            <div class="slider__top">
              <label for="wGap">Dry spell</label>
              <output id="wGapOut">0.50</output>
            </div>
            <input id="wGap" type="range" min="-1.2" max="1.2" step="0.05" value="0.5" />
            <div class="slider__ends"><span>drawn recently</span><span>missing longest</span></div>
          </div>
          <div class="slider" data-key="momentum">
            <div class="slider__top">
              <label for="wMomentum">Momentum <small>(last 60 drawings)</small></label>
              <output id="wMomentumOut">0.45</output>
            </div>
            <input id="wMomentum" type="range" min="-1.2" max="1.2" step="0.05" value="0.45" />
            <div class="slider__ends"><span>cooling off</span><span>heating up</span></div>
          </div>
          <div class="slider" data-key="pair">
            <div class="slider__top">
              <label for="wPair">Pair affinity</label>
              <output id="wPairOut">0.40</output>
            </div>
            <input id="wPair" type="range" min="0" max="1.2" step="0.05" value="0.4" />
            <div class="slider__ends"><span>ignore</span><span>strong</span></div>
          </div>
        </div>

        <div class="field field--toggles">
          <label class="switch">
            <input id="matchPatterns" type="checkbox" checked />
            <span class="switch__box"></span>
            <span class="switch__text">
              Match historical shape
              <small>Sum, odd/even, low/high and decade spread follow the real distribution</small>
            </span>
          </label>
          <label class="switch">
            <input id="avoidPast" type="checkbox" checked />
            <span class="switch__box"></span>
            <span class="switch__text">
              Skip past jackpot combinations
              <small>Exclude the five-number sets that have already been drawn</small>
            </span>
          </label>
        </div>

        <div class="field">
          <label for="maxOverlap">Max shared numbers between lines</label>
          <select id="maxOverlap">
            <option value="1">1 number</option>
            <option value="2">2 numbers</option>
            <option value="3" selected>3 numbers</option>
            <option value="5">No limit</option>
          </select>
        </div>

        <div class="field field--data">
          <button id="refreshBtn" class="btn btn--ghost btn--full" type="button">
            Fetch latest results
          </button>
          <p class="field__hint" id="refreshStatus"></p>
          <p class="field__hint field__hint--src" id="dataSource"></p>
        </div>
      </aside>

      <section class="panel panel--stats">
        <div class="stats-head">
          <h2>Drawing statistics</h2>
          <div class="tabs" id="tabs" role="tablist">
            <button type="button" class="tab is-on" data-tab="main" role="tab">White balls</button>
            <button type="button" class="tab" data-tab="special" role="tab" id="tabSpecial">
              ${config.specialName}
            </button>
            <button type="button" class="tab" data-tab="sum" role="tab">Sum spread</button>
            <button type="button" class="tab" data-tab="grid" role="tab">Ball by ball</button>
            <button type="button" class="tab" data-tab="recent" role="tab">Recent draws</button>
          </div>
        </div>

        <div class="summary" id="summary"></div>

        <div class="tab-panel is-on" data-panel="main">
          <p class="chart-caption">
            How often each white ball (1–${config.mainMax}) has come up across
            ${num(game.history.count)} drawings. The dashed line is the count expected from pure
            chance — every ball should sit near ${game.expectedPerBall.toFixed(0)} — and
            highlighted bars are the numbers you just generated.
          </p>
          <div class="chart-box"><canvas id="chartMain"></canvas></div>
        </div>

        <div class="tab-panel" data-panel="special">
          <p class="chart-caption">
            ${config.specialName} frequency (1–${config.specialMax}).${
              gameId === "megamillions"
                ? " The pool shrank from 25 to 24 balls on April 8, 2025, so 25 is left out of both the statistics and the picks."
                : ""
            }
          </p>
          <div class="chart-box chart-box--short"><canvas id="chartSpecial"></canvas></div>
        </div>

        <div class="tab-panel" data-panel="sum">
          <p class="chart-caption">
            How the five white balls have added up historically. The
            <b class="hl">accent lines</b> mark the sums of the lines you just generated.
          </p>
          <div class="chart-box chart-box--short"><canvas id="chartSum"></canvas></div>
          <div class="sum-legend" id="sumLegend"></div>
        </div>

        <div class="tab-panel" data-panel="grid">
          <p class="chart-caption">
            Warmer colours are drawn more often. The small number is
            <b>drawings since that ball last appeared</b>.
          </p>
          <div class="number-grid" id="numberGrid"></div>
          <div class="grid-legend">
            <span class="grid-legend__scale" aria-hidden="true"></span>
            <span>cold</span>
            <span class="grid-legend__spacer"></span>
            <span>hot</span>
          </div>
        </div>

        <div class="tab-panel" data-panel="recent">
          <div class="recent" id="recentDraws"></div>
        </div>
      </section>

      ${adSlot("game-mid")}

      <section class="panel prose panel--reference">
        <h2>${config.name} rules, odds and prize tiers</h2>
        <p>
          ${config.name} draws five white balls from 1–${config.mainMax} and one
          ${config.specialName} from 1–${config.specialMax}. Order does not matter, so the
          number of possible tickets is
          C(${config.mainMax},&nbsp;5)&nbsp;×&nbsp;${config.specialMax} =
          ${num(config.jackpotOdds)} — the jackpot odds. Drawings are held
          ${config.drawDaysLabel.toLowerCase()} at ${config.drawTimeLabel}.
          ${multiplierNote}
        </p>
        ${table(["Match", "Base prize", "Odds"], prizeRows(game), {
          caption: `${config.name} prize tiers (${config.matrixLabel}). Overall odds of winning something: ${oneIn(game.table.anyPrizeOneIn)}.`,
        })}
        <p>
          Adding up every tier, the fixed prizes return ${pct(game.breakEvenBase.fixedReturn)}
          of the ${config.ticketPrice} ticket price on average. The rest of a ticket's value
          sits in the jackpot, which is why the expected value of a play swings so widely with
          the advertised prize.
          <a class="text-link" href="${link("guides/expected-value-of-a-lottery-ticket.html", 0)}"
            >See the break-even calculation →</a
          >
        </p>
        <h3>What this generator does — and what it cannot do</h3>
        <p>
          The generator weights each ball by how often it has been drawn, how long it has been
          missing, its momentum over the last 60 drawings and which balls it tends to appear
          with, then shapes each line so its sum, odd/even split, low/high split and decade
          spread look like a real drawing. That makes the output <em>statistically typical</em>
          of past winners. It does not make it more likely to win: the ${num(config.jackpotOdds)}
          possible tickets are, and remain, equally likely.
          <a class="text-link" href="${link("guides/independent-trials.html", 0)}"
            >Why past numbers cannot predict the next draw →</a
          >
        </p>
        <p class="reference__cross">
          Playing the other game too?
          <a class="text-link" href="${link(otherHref, 0)}"
            >Open the ${other.config.name} generator →</a
          >
        </p>
      </section>

      <section class="section" aria-labelledby="related-heading">
        <h2 class="section__title" id="related-heading">Related reading</h2>
        <div class="guide-cards">
        ${guideCards(guides, 0, 3)}
        </div>
      </section>

      <div class="toast" id="toast" role="status" aria-live="polite"></div>
`;
}
