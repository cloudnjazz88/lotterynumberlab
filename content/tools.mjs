/**
 * Tools hub, spending calculator, ticket match checker, and odds explorer.
 */

import { adSlot, callout, link, num, oneIn, dateLong } from "./site.mjs";

export function toolsHub() {
  return `      <section class="hero hero--compact hero--page tools-hub-hero">
        <p class="hero__eyebrow">Lottery tools</p>
        <h1>Practical Lottery Tools</h1>
        <p class="hero__subhead">Choose a tool for the question you have.</p>
        <p class="hero__lead">
          Four browser-based tools for Mega Millions and Powerball.
          Each page shows its formulas. None predict winners or advise purchases.
        </p>
      </section>

      <section class="panel panel--warm tools-hub" aria-labelledby="tools-interactive">
        <div class="tools-hub__head">
          <h2 class="section__title" id="tools-interactive">Interactive tools</h2>
          <p class="section__lead">
            Open a tool for the form, assumptions, and live results in your browser.
          </p>
        </div>
        <ul class="tools-hub__grid">
          <li>
            <a class="tools-hub-card" href="lottery-what-if-calculator.html">
              <span class="tools-hub-card__cat">Historical Replay</span>
              <span class="tools-hub-card__name">What If Calculator</span>
              <h3 class="tools-hub-card__question">What if I played these numbers every drawing?</h3>
              <p class="tools-hub-card__desc">Replay one fixed Mega Millions or Powerball line across bundled history.</p>
              <div class="tools-hub-card__preview" aria-hidden="true">
                <span>Ticket cost</span>
                <span class="tools-hub-card__dot" aria-hidden="true">·</span>
                <span>Estimated base prizes</span>
                <span class="tools-hub-card__dot" aria-hidden="true">·</span>
                <span>Estimated net</span>
              </div>
              <span class="tools-hub-card__cta">Replay your numbers <span aria-hidden="true">→</span></span>
            </a>
          </li>
          <li>
            <a class="tools-hub-card" href="ticket-match-checker.html">
              <span class="tools-hub-card__cat">Result Check</span>
              <span class="tools-hub-card__name">Ticket Match &amp; History Checker</span>
              <h3 class="tools-hub-card__question">Did these numbers match a published drawing?</h3>
              <p class="tools-hub-card__desc">Compare one line with a selected drawing or search loaded history.</p>
              <div class="tools-hub-card__preview" aria-hidden="true">
                <span>Match count</span>
                <span class="tools-hub-card__dot" aria-hidden="true">·</span>
                <span>Prize tier</span>
                <span class="tools-hub-card__dot" aria-hidden="true">·</span>
                <span>Drawing date</span>
              </div>
              <span class="tools-hub-card__cta">Check a ticket <span aria-hidden="true">→</span></span>
              <span class="tools-hub-card__note">Pattern check only — not official claim verification.</span>
            </a>
          </li>
          <li>
            <a class="tools-hub-card" href="odds-explorer.html">
              <span class="tools-hub-card__cat">Probability</span>
              <span class="tools-hub-card__name">Lottery Odds Explorer</span>
              <h3 class="tools-hub-card__question">How unlikely is each prize tier?</h3>
              <p class="tools-hub-card__desc">Compare Mega Millions and Powerball prize-tier probabilities.</p>
              <div class="tools-hub-card__preview tools-hub-card__preview--odds" aria-hidden="true">
                <span class="tools-hub-card__odds">Jackpot 1 in 290,472,336 (MM)</span>
                <span class="tools-hub-card__odds-sub">Tiers · repeated attempts · no jackpot $ amounts</span>
              </div>
              <span class="tools-hub-card__cta">Compare the odds <span aria-hidden="true">→</span></span>
            </a>
          </li>
          <li>
            <a class="tools-hub-card" href="lottery-spending-calculator.html">
              <span class="tools-hub-card__cat">Cost</span>
              <span class="tools-hub-card__name">Lottery Spending Calculator</span>
              <h3 class="tools-hub-card__question">What does repeated play cost over time?</h3>
              <p class="tools-hub-card__desc">Weekly, monthly, yearly, and multi-year cost from your play rate.</p>
              <div class="tools-hub-card__preview tools-hub-card__preview--spend" aria-hidden="true">
                <span class="tools-hub-card__spend">$10/week</span>
                <span class="tools-hub-card__spend-arrow" aria-hidden="true">→</span>
                <span class="tools-hub-card__spend tools-hub-card__spend--year">$520/year</span>
                <span class="tools-hub-card__spend-note">Arithmetic example — not a recommendation</span>
              </div>
              <span class="tools-hub-card__cta">Calculate spending <span aria-hidden="true">→</span></span>
            </a>
          </li>
        </ul>
      </section>

      <section class="panel tools-differ" aria-labelledby="tools-differ">
        <h2 class="section__title" id="tools-differ">How the tools differ</h2>
        <ul class="tools-differ__roles">
          <li><strong>What If</strong> — historical replay of one fixed line across bundled drawings.</li>
          <li><strong>Ticket Match</strong> — compare one line to a selected drawing or search history.</li>
          <li><strong>Odds Explorer</strong> — prize-tier probabilities for Mega Millions and Powerball.</li>
          <li><strong>Spending</strong> — cost arithmetic from plays, schedule, and ticket price.</li>
        </ul>
        <p class="tools-differ__trust">
          Prices, matrices, and loaded drawing records match the rest of Lottery Number Lab.
          When an official rule changes, rebuild so every tool stays in sync.
        </p>
        <p class="tools-differ__method">
          <a class="text-link" href="../methodology.html">Read the methodology <span aria-hidden="true">→</span></a>
        </p>
      </section>

      <section class="trust-strip" aria-labelledby="tools-trust">
        <h2 class="trust-strip__title" id="tools-trust">Limits</h2>
        <p class="trust-strip__dek">
          Results are historical or hypothetical. These tools do not predict winners, do not advise
          you to play, and are not official claim verification. Ticket prices, matrices, and
          drawing records follow the methodology and the data this site loads.
        </p>
        <nav class="trust-strip__links" aria-label="Related policies">
          <a href="../methodology.html">Methodology</a>
          <a href="../responsible-play.html">Responsible play</a>
          <a href="../privacy-policy.html">Privacy</a>
        </nav>
      </section>

      ${adSlot("tools-hub")}
`;
}

export function spendingCalculatorPage(ctx) {
  const mm = ctx.mm;
  const pb = ctx.pb;
  const depth = 1;

  return `      <article class="prose prose--page spending-page">
        <p class="eyebrow"><a href="${link("tools/index.html", depth)}">Tools</a> / Spending</p>
        <h1>Lottery spending calculator</h1>
        <p class="lede">
          Estimate how much a regular Mega Millions or Powerball habit costs over weeks,
          months, and years. Every figure is arithmetic from your inputs  --  not a forecast,
          and not investment advice.
        </p>

        ${callout(
          "Spending more does not improve any individual ticket",
          `<p>
            Each play is an independent trial at the published odds. Buying more tickets
            raises the chance that <em>some</em> ticket in the batch wins, but it does not
            make any <em>single</em> ticket more likely to win than another. Treat the cost
            as entertainment spending, not as a strategy.
          </p>`,
          "warn",
        )}

        <section class="panel panel--warm spending-calc" aria-labelledby="calc-heading">
          <h2 id="calc-heading">Calculator</h2>
          <form id="spending-form" class="spending-form" novalidate>
            <fieldset class="spending-form__presets">
              <legend>Preset</legend>
              <div class="spending-form__preset-row" role="group" aria-label="Game presets">
                <button type="button" class="preset-btn" data-preset="megamillions">Mega Millions ($5)</button>
                <button type="button" class="preset-btn" data-preset="powerball">Powerball ($2)</button>
                <button type="button" class="preset-btn is-on" data-preset="custom">Custom</button>
              </div>
            </fieldset>

            <div class="spending-form__grid">
              <label class="field">
                <span class="field__label">Cost per play (USD)</span>
                <input id="cost-per-play" name="costPerPlay" type="number" inputmode="decimal"
                  min="0.01" max="1000" step="0.01" value="2" required aria-describedby="cost-hint" />
                <span class="field__hint" id="cost-hint">Official ticket prices: Mega Millions $5, Powerball $2.</span>
              </label>

              <label class="field">
                <span class="field__label">Plays per drawing</span>
                <input id="plays-per-drawing" name="playsPerDrawing" type="number" inputmode="numeric"
                  min="1" max="10000" step="1" value="1" required />
              </label>

              <label class="field">
                <span class="field__label">Drawings per week</span>
                <input id="drawings-per-week" name="drawingsPerWeek" type="number" inputmode="decimal"
                  min="0.1" max="21" step="0.1" value="3" required
                  aria-describedby="drawings-hint" />
                <span class="field__hint" id="drawings-hint">
                  Mega Millions: 2/week · Powerball: 3/week (current schedules).
                </span>
              </label>

              <label class="field">
                <span class="field__label">Horizon (years)</span>
                <select id="horizon-years" name="horizonYears" aria-describedby="horizon-hint">
                  <option value="1">1 year</option>
                  <option value="5" selected>5 years</option>
                  <option value="10">10 years</option>
                  <option value="20">20 years</option>
                </select>
                <span class="field__hint" id="horizon-hint">Optional long-range total for planning only.</span>
              </label>

              <label class="field">
                <span class="field__label">Jackpot context game</span>
                <select id="odds-game" name="oddsGame">
                  <option value="none">None</option>
                  <option value="megamillions">Mega Millions (1 in ${num(mm.config.jackpotOdds)})</option>
                  <option value="powerball" selected>Powerball (1 in ${num(pb.config.jackpotOdds)})</option>
                </select>
              </label>
            </div>

            <p class="spending-form__live" id="spending-status" role="status" aria-live="polite"></p>
          </form>

          <div class="spending-results" id="spending-results" aria-live="polite">
            <dl class="spending-results__grid">
              <div><dt>Weekly cost</dt><dd id="out-weekly"> -- </dd></div>
              <div><dt>Monthly average</dt><dd id="out-monthly"> -- </dd></div>
              <div><dt>Annual cost</dt><dd id="out-annual"> -- </dd></div>
              <div><dt>Selected-period total</dt><dd id="out-period"> -- </dd></div>
              <div><dt>Plays purchased (period)</dt><dd id="out-plays"> -- </dd></div>
              <div><dt>Jackpot odds context</dt><dd id="out-odds"> -- </dd></div>
            </dl>
          </div>
        </section>

        <h2>Formulas and assumptions</h2>
        <ul>
          <li><strong>Weekly cost</strong> = cost per play × plays per drawing × drawings per week</li>
          <li><strong>Annual cost</strong> = weekly cost × 52</li>
          <li><strong>Monthly average</strong> = annual cost ÷ 12</li>
          <li><strong>Period total</strong> = annual cost × horizon years</li>
          <li><strong>Plays purchased</strong> = plays per drawing × drawings per week × 52 × horizon years</li>
          <li><strong>At-least-one jackpot probability</strong> (context only) =
            1 − (1 − 1/N)<sup>P</sup>, where N is the published jackpot odds denominator and P is plays purchased.
            This is still vanishingly small for realistic budgets.</li>
        </ul>
        <p>
          Assumptions: prices and schedules match current published rules
          (Mega Millions ${mm.config.ticketPrice}, ${mm.config.drawDaysLabel};
          Powerball ${pb.config.ticketPrice}, ${pb.config.drawDaysLabel}).
          Holidays, missed drawings, multipacks, and add-ons (Power Play, etc.) are ignored.
          Inputs stay in your browser; nothing is uploaded.
        </p>

        <h2>Worked examples</h2>
        <h3>Powerball, one play, three drawings a week, five years</h3>
        <p>
          Cost per play $2 × 1 play × 3 drawings = <strong>$6 per week</strong>.
          Annual = $6 × 52 = <strong>$312</strong>. Five-year total = <strong>$1,560</strong>
          for 780 plays. Against ${oneIn(pb.config.jackpotOdds)} jackpot odds, 780 independent
          plays still leave the chance of hitting the jackpot extremely small.
        </p>
        <h3>Mega Millions, two plays, two drawings a week, one year</h3>
        <p>
          $5 × 2 × 2 = <strong>$20 per week</strong>, <strong>$1,040 per year</strong>,
          208 plays. Doubling plays doubles spend and doubles the (still tiny) chance that
          <em>at least one</em> ticket wins  --  it does not double the chance for each ticket.
        </p>

        <h2>Responsible play</h2>
        <p>
          Set a budget you can afford to lose entirely. If chasing losses or spending money
          meant for necessities, stop and get help:
          <a href="${link("responsible-play.html", depth)}">responsible play resources</a>,
          1-800-GAMBLER, or
          <a href="https://www.ncpgambling.org/" target="_blank" rel="noopener nofollow">ncpgambling.org</a>.
        </p>

        <h2>FAQ</h2>
        <dl class="faq-list">
          <dt>Does this tell me if I will win?</dt>
          <dd>No. It only converts play frequency into dollar cost and optional odds context.</dd>
          <dt>Why monthly average instead of calendar months?</dt>
          <dd>We use annual÷12 so irregular month lengths do not imply false precision.</dd>
          <dt>Are Power Play / Megaplier included?</dt>
          <dd>No. Add those costs yourself under Custom if you buy them.</dd>
          <dt>Is my data stored?</dt>
          <dd>No. All math runs in your browser. Clearing the page clears the inputs.</dd>
        </dl>

        <p class="section__after">
          <a class="text-link" href="${link("guides/expected-value-of-a-lottery-ticket.html", depth)}">Expected value of a ticket →</a>
          ·
          <a class="text-link" href="${link("guides/record-jackpots-and-taxes.html", depth)}">Taxes and take-home →</a>
        </p>
      </article>
`;
}

export function ticketMatchCheckerPage(ctx) {
  const mm = ctx.mm;
  const pb = ctx.pb;
  const depth = 1;
  const mmLatest = mm.history.draws[0];
  const pbLatest = pb.history.draws[0];
  const pad2 = (n) => String(n).padStart(2, "0");
  const drawPlain = (draw) =>
    `${draw.n.map(pad2).join("-")} + ${pad2(draw.s)}`;

  return `      <article class="prose prose--page ticket-match-page">
        <p class="eyebrow"><a href="${link("tools/index.html", depth)}">Tools</a> / Ticket match</p>
        <h1>Lottery Ticket Match &amp; History Checker</h1>
        <p class="lede">
          Compare a Mega Millions or Powerball ticket with one published drawing, then
          optionally scan the same numbers across the current-matrix history bundled on
          this page. This is a pattern check  --  not a prize calculator, not a claim service,
          and not an official validation.
        </p>

        ${callout(
          "Not a win announcement",
          `<p>
            Matching numbers here never means "You won." Prize amounts, multipliers, and
            claim rules are not computed from this data. Always verify with your state lottery
            before making any claim.
          </p>`,
          "warn",
        )}

        <noscript>
          <aside class="callout callout--warn">
            <h3>Interactive checker requires JavaScript</h3>
            <p>
              Your browser has JavaScript disabled, so the number grid, recent-drawing list,
              older-date lookup, and live results cannot run. The how-to, privacy notes,
              worked example, and FAQ below remain available. Enable JavaScript to compare
              a ticket against a published drawing in this browser.
            </p>
          </aside>
        </noscript>

        <section class="panel panel--warm ticket-match" id="tm-tool" data-tm-game="megamillions" aria-labelledby="tm-heading">
          <h2 id="tm-heading">Checker</h2>
          <p class="tm-js-needed" hidden>
            Interactive results require JavaScript. Explanations on this page still work without it.
          </p>
          <form id="tm-form" class="tm-form" novalidate>
            <fieldset class="tm-form__games">
              <legend>Game</legend>
              <div class="tm-form__game-row" role="group" aria-label="Lottery game">
                <button type="button" class="tm-game-btn is-on" data-game="megamillions" aria-pressed="true">Mega Millions</button>
                <button type="button" class="tm-game-btn" data-game="powerball" aria-pressed="false">Powerball</button>
              </div>
            </fieldset>

            <fieldset class="tm-form__picks">
              <legend id="tm-white-legend">White balls (pick 5 from 1-70)</legend>
              <div id="tm-white-grid" class="tm-grid" role="group" aria-labelledby="tm-white-legend"></div>
            </fieldset>

            <fieldset class="tm-form__picks">
              <legend id="tm-bonus-legend">Mega Ball (pick 1 from 1-24)</legend>
              <div id="tm-bonus-grid" class="tm-grid tm-grid--bonus tm-grid--mm" role="group" aria-labelledby="tm-bonus-legend"></div>
            </fieldset>

            <p class="tm-selection" id="tm-selection" aria-live="polite">Select 5 white balls and 1 Mega Ball</p>

            <div class="tm-draw-controls">
              <label class="field tm-draw-field">
                <span class="field__label">Recent drawing</span>
                <select id="tm-draw-select" name="drawDate" aria-describedby="tm-draw-hint"></select>
                <span class="field__hint" id="tm-draw-hint">Latest 20 bundled drawings for this game (Eastern Time dates). Defaults to the latest.</span>
              </label>

              <label class="field tm-draw-field tm-draw-field--older">
                <span class="field__label">Or choose an older drawing date</span>
                <input type="date" id="tm-draw-date" name="drawDateOlder" aria-describedby="tm-draw-date-hint" />
                <span class="field__hint" id="tm-draw-date-hint">Eastern Time drawing date. Bounds match the first and latest drawings in this page&apos;s bundled history.</span>
              </label>

              <p class="tm-active-draw" id="tm-active-draw" aria-live="polite">Selected drawing: latest (ET)</p>
              <p class="tm-date-msg" id="tm-date-msg" role="status" hidden></p>
            </div>

            <div class="tm-actions">
              <button type="submit" class="tm-btn tm-btn--primary" id="tm-check">Check</button>
              <button type="button" class="tm-btn tm-btn--ghost" id="tm-clear">Clear</button>
            </div>
            <p class="tm-status" id="tm-status" role="status" aria-live="polite"></p>
          </form>

          <div id="tm-selected-result" class="tm-selected-result" hidden aria-live="polite"></div>
          <div id="tm-history-result" class="tm-history-result" hidden aria-live="polite"></div>
        </section>

        <h2>How to use</h2>
        <ol>
          <li>Choose Mega Millions (5 of 70 + Mega Ball 1-24) or Powerball (5 of 69 + Powerball 1-26).</li>
          <li>Select five unique white balls on the grid, then one bonus ball (the bonus may match a white number).</li>
          <li>Choose a Recent drawing (latest 20, defaults to the latest) or enter an older Eastern Time drawing date, then press Check. The last field you change is the active source.</li>
          <li>Read the selected-drawing comparison first; the historical search uses the same numbers underneath.</li>
        </ol>

        <h2>Privacy</h2>
        <p>
          All matching runs in your browser against the drawing history bundled with this page.
          Your ticket numbers are not uploaded to a server.
        </p>

        <h2>What this is not</h2>
        <ul>
          <li>Not an official lottery validation or claim service.</li>
          <li>Not a payout calculator (multipliers and prize amounts are not in this dataset).</li>
          <li>Not a prediction tool. Past similarity does not change future odds; each drawing is an independent trial.</li>
        </ul>

        <h2>Sources and matrix range</h2>
        <p>
          Drawings come from the New York State Open Data portal (Mega Millions and Powerball),
          limited to each game's current ball matrix:
          Mega Millions ${mm.config.matrixLabel} since ${mm.config.matrixSinceLabel}
          (${num(mm.history.count)} drawings in the bundle, latest ${dateLong(mmLatest.d)}: ${drawPlain(mmLatest)});
          Powerball ${pb.config.matrixLabel} since ${pb.config.matrixSinceLabel}
          (${num(pb.history.count)} drawings, latest ${dateLong(pbLatest.d)}: ${drawPlain(pbLatest)}).
          Dates are Eastern Time drawing dates.
          Mega Millions historical search uses post-2017 white-ball matrix history; the Mega Ball pool
          changed from 25 to 24 in 2025, so the current input range is 1–24 while past Mega Ball 25
          drawings can still appear in the bundle and are not data errors.
        </p>

        <h2>Worked example</h2>
        <p>
          Suppose you check Mega Millions numbers 25-57-58-67-68 + 16 against the
          ${dateLong(mmLatest.d)} drawing (${drawPlain(mmLatest)}). If those are the official
          numbers, the selected result reads "5 white + Mega Ball matched" as a pattern
          description only. The historical section then ranks every current-matrix drawing by
          white-match count, then bonus match, then newest date, and lists up to ten rows.
        </p>

        <h2>FAQ</h2>
        <dl class="faq-list">
          <dt>Does a full match mean I won money?</dt>
          <dd>No. This tool never states that you won and never shows dollar prizes. Confirm with your state lottery.</dd>
          <dt>Can the bonus ball equal one of my white balls?</dt>
          <dd>Yes. White balls must be unique among themselves; the bonus may repeat a white number.</dd>
          <dt>Why aren't prize amounts shown?</dt>
          <dd>Payouts and multipliers are not in the bundled drawing file. Use the official prize chart links for published tiers.</dd>
          <dt>Is my ticket sent anywhere?</dt>
          <dd>No. Comparison stays in your browser.</dd>
        </dl>

        <p class="section__after">
          <a class="text-link" href="${link("tools/lottery-spending-calculator.html", depth)}">Spending calculator</a>
          ·
          <a class="text-link" href="${link("tools/odds-explorer.html", depth)}">Odds explorer</a>
          ·
          <a class="text-link" href="${link("tools/lottery-what-if-calculator.html", depth)}">What If calculator</a>
          ·
          <a class="text-link" href="${link("guides/independent-trials.html", depth)}">Independent trials</a>
          ·
          <a class="text-link" href="${link("results/index.html", depth)}">Past winning numbers</a>
</p>
      </article>
`;
}


export function oddsExplorerPage(ctx) {
  const mm = ctx.mm;
  const pb = ctx.pb;
  const depth = 1;

  const packGame = (game) => ({
    id: game.config.id,
    name: game.config.name,
    specialAbbr: game.config.specialAbbr,
    specialName: game.config.specialName,
    ticketPrice: game.config.id === "megamillions" ? 5 : 2,
    ticketPriceLabel: game.config.ticketPrice,
    jackpotOdds: game.config.jackpotOdds,
    anyPrize: game.table.anyPrize,
    anyPrizeOneIn: game.table.anyPrizeOneIn,
    matrixLabel: game.config.matrixLabel,
    tiers: game.table.rows.map((r) => ({
      key: r.key,
      match: r.match,
      probability: r.probability,
      oneIn: r.oneIn,
    })),
  });

  const dataJson = JSON.stringify({
    megamillions: packGame(mm),
    powerball: packGame(pb),
  }).replace(/</g, "\\u003c");

  return `      <article class="prose prose--page odds-explorer-page">
        <p class="eyebrow"><a href="${link("tools/index.html", depth)}">Tools</a> / Odds explorer</p>
        <h1>Lottery Odds Explorer</h1>
        <p class="lede">
          Explore how Mega Millions and Powerball jackpot and prize-tier odds behave across
          multiple independent tickets and drawings. This is an educational probability tool
           --  not a predictor, not a number recommender, and not investment advice.
        </p>

        ${callout(
          "More tickets do not make lottery play a good investment",
          `<p>
            Independent tickets still face tiny jackpot odds. Buying more tickets raises the
            chance that <em>some</em> ticket in the batch wins, but cost scales with every
            ticket you add. Nothing here is advice to play more, or to play at all.
          </p>`,
          "warn",
        )}

        <noscript>
          <aside class="callout callout--warn">
            <h3>Interactive explorer needs JavaScript</h3>
            <p>
              Your browser has JavaScript disabled, so the live ticket and drawing controls
              cannot run. The purpose, base jackpot odds, formula, worked examples, sources,
              and FAQ below remain available.
            </p>
            <p>
              Base jackpot odds (current matrices): Mega Millions
              ${oneIn(mm.config.jackpotOdds)}; Powerball ${oneIn(pb.config.jackpotOdds)}.
              Overall any-prize odds: Mega Millions ${oneIn(mm.table.anyPrizeOneIn)};
              Powerball ${oneIn(pb.table.anyPrizeOneIn)}.
            </p>
            <p>
              For independent tickets, the chance of at least one jackpot across n attempts is
              p_at_least_one = 1 - (1 - p)^n, where p is the one-ticket jackpot probability.
              Numerically this site uses -expm1(n * log1p(-p)) for stability with tiny p.
            </p>
            <p>
              Example A: 1 Mega Millions ticket has probability 1/${num(mm.config.jackpotOdds)}.
              Example B: 104 independent Mega Millions tickets still leave the jackpot chance
              extremely small  --  cost is $520 at $5 each, while (1 - p)^104 stays near 1.
            </p>
            <p>
              Odds are derived from published ball matrices on this site&apos;s methodology page.
              Prize dollars and multipliers are jurisdiction-specific and are not shown here.
            </p>
            <dl class="faq-list">
              <dt>Does buying more tickets make each ticket better?</dt>
              <dd>No. Each ticket stays an independent trial at the same published odds.</dd>
              <dt>Is this a prediction tool?</dt>
              <dd>No. It only restates combinatoric odds for the attempts you enter.</dd>
              <dt>Why are prize amounts missing?</dt>
              <dd>Base prizes and multipliers vary; this explorer shows match patterns and probabilities only.</dd>
              <dt>Where do the denominators come from?</dt>
              <dd>From the same prize-tier matrix this site publishes on game pages and in methodology.</dd>
            </dl>
          </aside>
        </noscript>

        <script type="application/json" id="odds-explorer-data">${dataJson}</script>

        <section class="panel panel--warm odds-explorer" id="odds-explorer" aria-labelledby="odds-heading">
          <h2 id="odds-heading">Explorer</h2>
          <form id="odds-form" class="odds-form" novalidate>
            <fieldset class="odds-form__modes">
              <legend>Game</legend>
              <div class="odds-form__mode-row" role="group" aria-label="Game selection">
                <button type="button" class="odds-mode-btn is-on" data-mode="megamillions" aria-pressed="true">Mega Millions</button>
                <button type="button" class="odds-mode-btn" data-mode="powerball" aria-pressed="false">Powerball</button>
                <button type="button" class="odds-mode-btn" data-mode="compare" aria-pressed="false">Compare both</button>
              </div>
            </fieldset>

            <fieldset class="odds-form__tickets">
              <legend>Tickets per drawing</legend>
              <div class="odds-form__chip-row" role="group" aria-label="Tickets per drawing">
                <button type="button" class="odds-tickets-btn is-on" data-value="1" aria-pressed="true">1</button>
                <button type="button" class="odds-tickets-btn" data-value="5" aria-pressed="false">5</button>
                <button type="button" class="odds-tickets-btn" data-value="10" aria-pressed="false">10</button>
                <button type="button" class="odds-tickets-btn" data-value="25" aria-pressed="false">25</button>
                <button type="button" class="odds-tickets-btn" data-value="custom" aria-pressed="false">Custom</button>
              </div>
              <label class="field odds-custom-field" id="odds-tickets-custom-field" hidden>
                <span class="field__label">Custom tickets (1-1000)</span>
                <input id="odds-tickets-custom" name="ticketsCustom" type="number" inputmode="numeric"
                  min="1" max="1000" step="1" value="1" />
              </label>
            </fieldset>

            <fieldset class="odds-form__drawings">
              <legend>Drawings</legend>
              <div class="odds-form__chip-row" role="group" aria-label="Number of drawings">
                <button type="button" class="odds-drawings-btn is-on" data-value="1" aria-pressed="true">1</button>
                <button type="button" class="odds-drawings-btn" data-value="10" aria-pressed="false">10</button>
                <button type="button" class="odds-drawings-btn" data-value="52" aria-pressed="false">52</button>
                <button type="button" class="odds-drawings-btn" data-value="104" aria-pressed="false">104</button>
                <button type="button" class="odds-drawings-btn" data-value="custom" aria-pressed="false">Custom</button>
              </div>
              <label class="field odds-custom-field" id="odds-drawings-custom-field" hidden>
                <span class="field__label">Custom drawings (1-1000)</span>
                <input id="odds-drawings-custom" name="drawingsCustom" type="number" inputmode="numeric"
                  min="1" max="1000" step="1" value="1" />
              </label>
            </fieldset>

            <p class="odds-attempts" id="odds-attempts" aria-live="polite">1 total attempts (tickets x drawings)</p>
            <p class="odds-form__live" id="odds-status" role="status" aria-live="polite"></p>
          </form>

          <div class="odds-results" id="odds-results" aria-live="polite"></div>
        </section>

        <h2>Formula and methodology</h2>
        <p>
          Each ticket is treated as an independent Bernoulli trial with success probability
          p equal to the published one-ticket odds for that prize tier. Across
          <strong>n = tickets × drawings</strong> attempts,
        </p>
        <p class="odds-formula">
          <strong>p_at_least_one = 1 - (1 - p)<sup>n</sup></strong>,
          evaluated as <code>-expm1(n * log1p(-p))</code> so tiny jackpot probabilities stay accurate.
        </p>
        <p>
          Jackpot denominators and prize-tier probabilities come from the same combinatoric
          matrix used elsewhere on this site (Mega Millions ${mm.config.matrixLabel},
          Powerball ${pb.config.matrixLabel}). Base prize dollars are omitted here because
          multipliers and jurisdiction rules change the cash amount without changing the match pattern.
        </p>

        <h2>Worked examples</h2>
        <h3>One Mega Millions ticket</h3>
        <p>
          Cost ${mm.config.ticketPrice}. Jackpot probability
          1/${num(mm.config.jackpotOdds)}. Chance of any prize
          ${oneIn(mm.table.anyPrizeOneIn)}. With n = 1, p_at_least_one equals p.
        </p>
        <h3>104 Mega Millions tickets (one per drawing for a year of twice-weekly play is different -- here n = 104 flat)</h3>
        <p>
          Estimated spend $520 at $5 each. The jackpot chance becomes
          1 - (1 - 1/${num(mm.config.jackpotOdds)})<sup>104</sup>, which is still on the order of
          104 / ${num(mm.config.jackpotOdds)}  --  tiny. More tickets raise spend linearly and
          raise at-least-one probability only slightly above n × p when n × p is small.
        </p>
        <h3>Compare: 10 tickets × 52 drawings</h3>
        <p>
          Same n = 520 attempts for both games. Mega Millions spend $2,600; Powerball spend $1,040
          at published ticket prices. Jackpot p differs only by each game&apos;s denominator
          (${num(mm.config.jackpotOdds)} vs ${num(pb.config.jackpotOdds)}).
        </p>

        <h2>Sources and update basis</h2>
        <p>
          Ball matrices and prize-tier odds match
          <a href="${link("methodology.html", depth)}">this site&apos;s methodology</a>
          and the game pages. Official charts:
          <a href="https://www.megamillions.com/How-to-Play.aspx" target="_blank" rel="noopener nofollow">Mega Millions how to play</a>,
          <a href="https://www.powerball.com/powerball-prize-chart" target="_blank" rel="noopener nofollow">Powerball prize chart</a>.
          When a matrix changes, rebuild the site so this explorer picks up the new table.
        </p>

        <h2>FAQ</h2>
        <dl class="faq-list">
          <dt>Does buying more tickets make each ticket better?</dt>
          <dd>No. Each ticket remains an independent trial at the same published one-ticket odds.</dd>
          <dt>Is this a prediction or recommendation tool?</dt>
          <dd>No. It only applies the published odds to the number of attempts you enter.</dd>
          <dt>Why are dollar prizes missing from the tables?</dt>
          <dd>Multipliers and state rules change payouts. Match patterns and probabilities stay the useful constant.</dd>
          <dt>What does &quot;expected per 1M tickets&quot; mean?</dt>
          <dd>Average hits of that tier if one million independent tickets were played  --  a rate, not a promise for your batch.</dd>
          <dt>Can I compare Mega Millions and Powerball with different ticket counts?</dt>
          <dd>Compare both uses the same tickets×drawings for both games so the attempt count stays fair.</dd>
        </dl>

        <p class="section__after">
          <a class="text-link" href="${link("tools/lottery-spending-calculator.html", depth)}">Spending calculator</a>
          ·
          <a class="text-link" href="${link("tools/ticket-match-checker.html", depth)}">Ticket match</a>
          ·
          <a class="text-link" href="${link("tools/lottery-what-if-calculator.html", depth)}">What If calculator</a>
          ·
          <a class="text-link" href="${link("guides/how-lottery-odds-are-calculated.html", depth)}">How odds are calculated</a>
          ·
          <a class="text-link" href="${link("guides/mega-millions-vs-powerball-odds.html", depth)}">MM vs PB odds guide</a>
          ·
          <a class="text-link" href="${link("guides/does-buying-more-lottery-tickets-improve-your-odds.html", depth)}">Does buying more tickets improve your odds?</a>
          ·
          <a class="text-link" href="${link("responsible-play.html", depth)}">Responsible play</a>
        </p>
      </article>
`;
}

export function whatIfCalculatorPage(ctx) {
  const mm = ctx.mm;
  const pb = ctx.pb;
  const depth = 1;
  const mmFirst = mm.history.draws[mm.history.draws.length - 1];
  const pbFirst = pb.history.draws[pb.history.draws.length - 1];
  const mmLatest = mm.history.draws[0];
  const pbLatest = pb.history.draws[0];

  return `      <article class="prose prose--page what-if-page">
        <p class="eyebrow"><a href="${link("tools/index.html", depth)}">Tools</a> / What If</p>
        <h1>What If I Played These Lottery Numbers?</h1>
        <p class="lede">
          Replay the same Mega Millions or Powerball numbers across this site&apos;s bundled
          current-matrix history. See how often those picks would have matched published
          prize tiers, and estimate fixed base prizes versus hypothetical ticket cost.
          This is a historical pattern tool  --  not a prediction, not advice to play, and
          not official claim verification.
        </p>

        <aside class="callout callout--note">
  <h3>Different from Ticket Match</h3>
  <p>
            <a href="${link("tools/ticket-match-checker.html", depth)}">Ticket Match</a>
            compares your picks with <em>one</em> drawing. What If holds the same numbers
            fixed and walks them across many drawings. Multi-ticket input only scales cost
            and fixed base prizes; it never improves odds per ticket.
          </p>
</aside>

        <aside class="callout callout--warn">
  <h3>Estimated and hypothetical only</h3>
  <p>
            Dollar figures use official base prize amounts by drawing date. Mega Millions
            ticket cost is $2 before Apr 8, 2025 and $5 from that drawing on. Post-change
            totals use base-before-multiplier amounts (built-in 2X–10X multipliers are not
            in the draw history). Optional Megaplier, Power Play, taxes, and jurisdiction
            rules are excluded. Jackpot-tier patterns are counted but historical jackpot
            cash is <strong>not</strong> estimated. Nothing here means you are owed a prize.
          </p>
</aside>

        <noscript>
          <aside class="callout callout--warn">
            <h3>Interactive calculator needs JavaScript</h3>
            <p>
              Your browser has JavaScript disabled, so the number grids and live results
              cannot run. Purpose, method, assumptions, worked example, FAQs, and related
              links below remain available. Enable JavaScript to replay picks across the
              bundled history in this browser.
            </p>
          </aside>
        </noscript>

        <section class="panel panel--warm what-if" id="wi-tool" data-wi-game="megamillions" aria-labelledby="wi-heading">
          <h2 id="wi-heading">What If calculator</h2>
          <p class="wi-js-needed" hidden>
            Interactive results require JavaScript. Explanations on this page still work without it.
          </p>
          <form id="wi-form" class="wi-form" novalidate>
            <fieldset class="wi-form__games">
              <legend>Game</legend>
              <div class="wi-form__game-row" role="group" aria-label="Lottery game">
                <button type="button" class="wi-game-btn is-on" data-game="megamillions" aria-pressed="true">Mega Millions</button>
                <button type="button" class="wi-game-btn" data-game="powerball" aria-pressed="false">Powerball</button>
              </div>
            </fieldset>

            <fieldset class="wi-form__picks">
              <legend id="wi-white-legend">White balls (pick 5 from 1–70)</legend>
              <div id="wi-white-grid" class="tm-grid" role="group" aria-labelledby="wi-white-legend"></div>
            </fieldset>

            <fieldset class="wi-form__picks">
              <legend id="wi-bonus-legend">Mega Ball (pick 1 from 1–24)</legend>
              <div id="wi-bonus-grid" class="tm-grid tm-grid--bonus tm-grid--mm" role="group" aria-labelledby="wi-bonus-legend"></div>
            </fieldset>

            <p class="wi-selection" id="wi-selection" aria-live="polite">Select 5 white balls and 1 Mega Ball</p>

            <fieldset class="wi-form__period">
              <legend>Period (Eastern Time drawing dates)</legend>
              <div class="wi-period-row">
                <label class="wi-period-opt"><input type="radio" name="wi-period" value="last1y" checked /> Last 1 year</label>
                <label class="wi-period-opt"><input type="radio" name="wi-period" value="last5y" /> Last 5 years</label>
                <label class="wi-period-opt"><input type="radio" name="wi-period" value="all" /> All current-matrix</label>
                <label class="wi-period-opt"><input type="radio" name="wi-period" value="custom" /> Custom dates</label>
              </div>
              <div class="wi-custom-row" id="wi-custom-row" hidden>
                <label class="field">
                  <span class="field__label">Start (ET)</span>
                  <input type="date" id="wi-start" name="start" />
                </label>
                <label class="field">
                  <span class="field__label">End (ET)</span>
                  <input type="date" id="wi-end" name="end" />
                </label>
              </div>
            </fieldset>

            <label class="field wi-tickets-field">
              <span class="field__label">Tickets per drawing</span>
              <input id="wi-tickets" name="tickets" type="number" inputmode="numeric" min="1" max="100" step="1" value="1" required
                aria-describedby="wi-tickets-hint" />
              <span class="field__hint" id="wi-tickets-hint">
                Same numbers on every drawing. Scales cost and fixed base prizes only — does not improve odds per ticket. Max 100.
              </span>
            </label>

            <p class="wi-status" id="wi-status" role="status" hidden></p>

            <div class="wi-actions">
              <button type="submit" class="btn btn--primary">Analyze history</button>
              <button type="button" class="btn btn--ghost" id="wi-clear">Clear picks</button>
            </div>
          </form>

          <div id="wi-results" class="wi-results" hidden></div>
        </section>

        <section aria-labelledby="wi-value">
          <h2 id="wi-value">What this tells you</h2>
          <p>
            Separate drawings are independent trials. Holding the same five whites and bonus ball
            fixed does not create a streak, a debt, or a pattern the next draw must repay.
            Identical lines in the same drawing are not independent of each other: they win or
            lose together. Hot and cold counts describe the past; they do not raise or lower the published
            odds on the next ticket.
          </p>
          <p>
            Cost scales linearly with tickets and drawings. A jackpot match remains extremely
            rare even after hundreds of identical plays. Fixed-prize tiers can occasionally
            appear in a long window; that still does not turn lottery play into a reliable return.
          </p>
          <p>
            Figures here are historical and hypothetical. Mega Millions ticket cost uses $2 before Apr 8, 2025 and $5 from that drawing on; Powerball stays $2. Prize totals use official base amounts by era (legacy MM table before the change; base-before-multiplier afterward). They are not a prediction and not a way to verify a claim with your state lottery.
          </p>
        </section>

        <section aria-labelledby="wi-how">
          <h2 id="wi-how">How it works</h2>
          <ol>
            <li>Choose Mega Millions or Powerball (current matrix ranges).</li>
            <li>Pick five unique white balls and one bonus ball (bonus may equal a white).</li>
            <li>Select Last 1 year, Last 5 years, All current-matrix history, or custom ET dates.</li>
            <li>Optionally set tickets per drawing (identical numbers each drawing).</li>
            <li>Review the estimated loss or gain summary, ticket cost versus estimated prizes, run details, prize results by match tier, and up to 20 winning drawings.</li>
          </ol>
          <p>
            Scope: bundled current-matrix history only
            (Mega Millions from October 31, 2017, Powerball from October 7, 2015;
            latest MM ${dateLong(mmLatest.d)}, PB ${dateLong(pbLatest.d)}).
            Older incompatible matrices are not merged. Optional Megaplier / Power Play are excluded; post-Apr 2025 MM built-in multipliers are not applied (base-before-multiplier only).
          </p>
        </section>

        <section aria-labelledby="wi-assumptions">
          <h2 id="wi-assumptions">Assumptions</h2>
          <ul>
            <li>Official base prize amounts by era (MM legacy before Apr 8, 2025; base-before-multiplier afterward); jackpot cash is never invented.</li>
            <li>Per-drawing historical ticket prices (Mega Millions $2 before Apr 8, 2025; $5 from Apr 8, 2025 onward; Powerball $2).</li>
            <li>Eastern Time drawing dates as shipped in this site&apos;s snapshot.</li>
            <li>Identical lines in the same drawing scale cost and estimated fixed-tier prizes together. Buying duplicates does not increase the probability that those numbers are drawn.</li>
            <li>Empty ranges show an empty state instead of inventing drawings.</li>
          </ul>
        </section>

        <section aria-labelledby="wi-example">
          <h2 id="wi-example">Worked example</h2>
          <p>
            Suppose you replay Powerball picks 01-02-03-04-05 + PB 07 across five synthetic
            drawings and buy two identical tickets each time. A 5+0 hit contributes
            2 × $1,000,000 in estimated base prizes; a jackpot-tier 5+1 hit is counted but
            its cash value is left unestimated. Spend is 2 × $2 × 5 drawings = $20. Net uses
            only the estimated fixed prizes minus spend.
          </p>
        </section>

        <section aria-labelledby="wi-fixed">
          <h2 id="wi-fixed">Fixed numbers vs changing numbers</h2>
          <p>
            Replaying one fixed set across history measures that set&apos;s past matches. Changing
            numbers every drawing would produce a different path, but each individual ticket
            still faces the same published per-draw odds. Fixing the numbers does not create
            an edge; it only makes the historical path easy to inspect.
          </p>
        </section>

        <section aria-labelledby="wi-limits">
          <h2 id="wi-limits">Limitations</h2>
          <ul>
            <li>No optional Megaplier / Power Play; post-Apr 2025 MM built-in multipliers not applied (base-before-multiplier only).</li>
            <li>No tax withholding or annuity vs cash modeling.</li>
            <li>No jurisdiction-specific prize rules or promotions.</li>
            <li>Jackpot advertised amounts vary; they are not estimated here.</li>
            <li>Snapshot history may lag the official feeds until the next refresh.</li>
          </ul>
        </section>

        <section aria-labelledby="wi-responsible">
          <h2 id="wi-responsible">Responsible play</h2>
          <p>
            Lottery tickets are entertainment spending with long odds. Set a budget you can
            afford to lose, and stop if play stops being fun. See
            <a href="${link("responsible-play.html", depth)}">responsible play</a>.
            Help: 1-800-GAMBLER.
          </p>
        </section>

        <section aria-labelledby="wi-privacy">
          <h2 id="wi-privacy">Privacy</h2>
          <p>
            Picks and results stay in your browser. This page does not upload your numbers to
            a server. See the <a href="../privacy-policy.html">privacy policy</a>.
          </p>
        </section>

        <section aria-labelledby="wi-method">
          <h2 id="wi-method">Methodology and sources</h2>
          <p>
            Matching uses order-independent white-ball overlap plus bonus equality — the same
            pattern logic as Ticket Match. Prize labels and fixed values come from the same
            official base tables used elsewhere on this site (via shared compute helpers).
            Drawing dates and numbers come from the bundled NY Open Data–sourced snapshot.
            Full method: <a href="${link("methodology.html", depth)}">methodology</a>.
          </p>
          <p>
            Snapshot basis: Mega Millions ${num(mm.history.count)} drawings
            (${dateLong(mmFirst.d)} – ${dateLong(mmLatest.d)});
            Powerball ${num(pb.history.count)} drawings
            (${dateLong(pbFirst.d)} – ${dateLong(pbLatest.d)}).
          </p>
        </section>

                <section aria-labelledby="wi-faq">
          <h2 id="wi-faq">Frequently asked questions</h2>
          <h3>Is this the same as Ticket Match?</h3>
          <p>No. Ticket Match compares one drawing. What If replays the same numbers across many drawings in the bundled history.</p>
          <h3>Does buying more identical tickets improve my odds?</h3>
          <p>Identical lines in the same drawing win or lose together. Buying duplicates does not increase the probability that those numbers are drawn. This tool scales cost and estimated fixed-tier prizes only. Separate drawings are independent of one another; identical tickets within one drawing are not.</p>
          <h3>Why is the jackpot not given a dollar amount?</h3>
          <p>Advertised jackpots change by drawing. A jackpot-tier pattern is counted, but historical jackpot cash is not estimated here.</p>
          <h3>Are Megaplier and Power Play included?</h3>
          <p>No. Optional Megaplier and Power Play are excluded. For Mega Millions drawings on/after Apr 8, 2025, totals use published base amounts before the built-in multiplier (the per-ticket multiplier is not in the drawing history). Taxes and jurisdiction rules are also excluded.</p>
          <h3>Can I use dates outside the bundled matrix?</h3>
          <p>No. Only current-matrix history shipped with this site is analyzed. Future dates and incompatible older matrices are excluded.</p>
          <h3>Is this official winner verification?</h3>
          <p>No. Results are hypothetical and educational. Verify any real ticket with your state lottery.</p>
          <h3>Do hot or cold numbers change the result?</h3>
          <p>No. Frequency notes do not change per-draw odds. This tool only counts how a fixed set matched past published draws.</p>
        </section>

<section aria-labelledby="wi-related">
          <h2 id="wi-related">Related</h2>
          <ul class="year-related__list">
            <li><a href="${link("tools/ticket-match-checker.html", depth)}">Ticket Match &amp; History Checker</a></li>
            <li><a href="${link("tools/odds-explorer.html", depth)}">Lottery Odds Explorer</a></li>
            <li><a href="${link("tools/lottery-spending-calculator.html", depth)}">Lottery Spending Calculator</a></li>
            <li><a href="${link("results/index.html", depth)}">Winning numbers archive</a></li>
            <li><a href="${link("guides/independent-trials.html", depth)}">Independent trials</a></li>
            <li><a href="${link("guides/hot-and-cold-numbers-tested.html", depth)}">Hot and cold numbers tested</a></li>
            <li><a href="${link("methodology.html", depth)}">Methodology</a></li>
            <li><a href="${link("responsible-play.html", depth)}">Responsible play</a></li>
          </ul>
        </section>
      </article>`;
}
