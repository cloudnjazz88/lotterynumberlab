/**
 * Tools hub, spending calculator, ticket match checker, and odds explorer.
 */

import { adSlot, callout, link, num, oneIn, dateLong } from "./site.mjs";

export function toolsHub() {
  return `      <section class="hero hero--compact hero--page">
        <p class="hero__eyebrow">Tools</p>
        <h1>Practical lottery tools</h1>
        <p class="hero__lead">
          Three browser-based utilities for Mega Millions and Powerball: estimate what
          repeated play costs, compare your picks with published drawings, and explore how
          prize-tier odds change with tickets and drawings. Each page shows its formulas.
          None predict winners or advise purchases.
        </p>
      </section>

      <section class="panel panel--warm" aria-labelledby="tools-available">
        <h2 class="section__title" id="tools-available">Available now</h2>
        <p class="section__lead">
          These three tools are live. Open any card for the form, worked examples, and assumptions.
        </p>
        <ul class="utility-rail">
          <li class="utility-rail__item">
            <a href="lottery-spending-calculator.html">
              <span class="utility-rail__label">Lottery Spending Calculator</span>
              <span class="utility-rail__hint">
                Turn plays per drawing, drawings per week, and ticket price into weekly,
                monthly, and yearly cost. Optional jackpot-odds context shows how small the
                chance stays after hundreds of plays. Arithmetic only — not a forecast.
              </span>
            </a>
          </li>
          <li class="utility-rail__item">
            <a href="ticket-match-checker.html">
              <span class="utility-rail__label">Ticket Match &amp; History Checker</span>
              <span class="utility-rail__hint">
                Enter five white balls and a bonus, pick a published drawing date, and see
                which numbers matched. Search the loaded history for the same combination.
                Pattern check only — not a prize claim.
              </span>
            </a>
          </li>
          <li class="utility-rail__item">
            <a href="odds-explorer.html">
              <span class="utility-rail__label">Lottery Odds Explorer</span>
              <span class="utility-rail__hint">
                See how each prize tier&apos;s probability changes when you scale tickets and
                drawings. Compare Mega Millions and Powerball on the same attempt count.
                Educational combinatorics — not a predictor.
              </span>
            </a>
          </li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="tools-choose">
        <h2 class="section__title" id="tools-choose">Choose the right tool</h2>
        <p class="section__lead">
          Start from the question you have. Each tool answers a different one.
        </p>
        <ul class="tool-intent-list">
          <li>
            <strong>“I want to understand what repeated play costs”</strong>
            → <a href="lottery-spending-calculator.html">Lottery Spending Calculator</a>.
            Use this when a weekly habit feels abstract and you want a concrete dollar total.
          </li>
          <li>
            <strong>“I want to compare my numbers with published results”</strong>
            → <a href="ticket-match-checker.html">Ticket Match &amp; History Checker</a>.
            Use this after a drawing posts, or to see whether a set appears in this site&apos;s history.
          </li>
          <li>
            <strong>“I want to understand how unlikely each prize tier is”</strong>
            → <a href="odds-explorer.html">Lottery Odds Explorer</a>.
            Use this when “more tickets” sounds meaningful and you want at-least-one probabilities in plain numbers.
          </li>
        </ul>
      </section>

      <section class="panel" aria-labelledby="tools-how">
        <h2 class="section__title" id="tools-how">How the tools fit together</h2>
        <p>
          Lottery Number Lab keeps <em>cost</em>, <em>match checking</em>, and <em>probability</em>
          on separate pages so each formula stays checkable. Spending multiplies cost × plays ×
          drawings and can apply the published jackpot denominator. Ticket Match validates the
          selected game&apos;s ranges, resolves a drawing by date (including dates older than the
          latest-20 list), and ranks identical white-ball sets across the loaded history.
          Odds Explorer treats each ticket as an independent trial and evaluates
          1 − (1 − p)<sup>n</sup> with stable browser math so tiny jackpot probabilities do not
          round to zero.
        </p>
        <p>
          Prices, schedules, and ball matrices match the same published rules used on the
          methodology and game pages. When an official matrix or price changes, rebuild the site
          so every tool picks up the same numbers as the rest of Lottery Number Lab.
        </p>
      </section>

      <section class="trust-strip" aria-labelledby="tools-trust">
        <h2 class="trust-strip__title" id="tools-trust">Privacy, data, and limits</h2>
        <p class="trust-strip__dek">
          All calculator math runs in your browser. Ticket Match does not upload your picks to a
          server — numbers stay on the device where you type them. Match results and history
          rankings use the published drawing records this site ships with. These tools are not
          purchase advice, not win/loss prediction, and not official winner verification. To claim
          a prize, follow your state lottery&apos;s official process with the ticket they recognize.
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
          <a class="text-link" href="${link("guides/how-lottery-odds-are-calculated.html", depth)}">How odds are calculated</a>
          ·
          <a class="text-link" href="${link("guides/mega-millions-vs-powerball-odds.html", depth)}">MM vs PB odds guide</a>
          ·
          <a class="text-link" href="${link("responsible-play.html", depth)}">Responsible play</a>
        </p>
      </article>
`;
}
