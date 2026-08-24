/**
 * FAQ, glossary and methodology — the reference pages AdSense reviewers look
 * for on an informational site, and that keep the generator from being the
 * whole identity of the project.
 */

import { SITE, num, oneIn, table, callout, dateLong, link, sourceList } from "./site.mjs";

function details(items) {
  return items
    .map(
      (item) => `<details class="faq-item">
  <summary>${item.q}</summary>
  <div class="faq-item__body">${item.a}</div>
</details>`,
    )
    .join("\n");
}

export function faqContent(ctx) {
  const mm = ctx.mm;
  const pb = ctx.pb;
  const items = [
    {
      q: "What are the jackpot odds for Mega Millions and Powerball?",
      a: `<p>Mega Millions is ${oneIn(mm.config.jackpotOdds)} (${mm.config.matrixLabel},
        ${mm.config.ticketPrice} a play). Powerball is ${oneIn(pb.config.jackpotOdds)}
        (${pb.config.matrixLabel}, ${pb.config.ticketPrice} a play). Those figures are
        combinations, not estimates: C(${mm.config.mainMax},&nbsp;5) × ${mm.config.specialMax}
        and C(${pb.config.mainMax},&nbsp;5) × ${pb.config.specialMax}. The full prize tables are
        in <a href="${link("guides/mega-millions-vs-powerball-odds.html", 0)}">the odds
        comparison</a>.</p>`,
    },
    {
      q: "Can past winning numbers predict the next drawing?",
      a: `<p>No. Each drawing reloads a full set of balls. Knowing last Friday's result does
        not change tonight's probabilities — that is the definition of an independent trial.
        A chi-square test of ${num(mm.history.count + pb.history.count)} drawings on this site
        is consistent with a fair game.
        <a href="${link("guides/independent-trials.html", 0)}">The full argument, with the
        test</a>.</p>`,
    },
    {
      q: "Do hot or cold numbers work?",
      a: `<p>They appear on charts because some numbers have been drawn more often than others
        — which is exactly what a fair random process produces over a few thousand drawings.
        Simulated fair histories of the same length produce the same extremes. A ranking that
        reshuffles when you change the analysis window is not information.
        <a href="${link("guides/hot-and-cold-numbers-tested.html", 0)}">The three tests we
        ran</a>.</p>`,
    },
    {
      q: "Does this site sell lottery tickets or guarantee a win?",
      a: `<p>Neither. We do not sell, broker or deliver tickets, and we do not take wagers.
        Generated numbers are for <strong>entertainment purposes only</strong>. Every ticket
        in a given game has the same jackpot probability. Nothing here can improve it. If you
        want to play, buy a ticket from an authorised retailer where that is legal for you.</p>`,
    },
    {
      q: "How is a jackpot taxed in the United States?",
      a: `<p>Lottery prizes are ordinary income. The lottery withholds 24% federal tax on
        prizes above $5,000, but a large jackpot is taxed at the 37% top federal bracket, so
        more is usually owed at filing. State tax ranges from 0% to about 11%. The advertised
        jackpot is an annuity; the cash option is roughly half of that before tax.
        <a href="${link("guides/record-jackpots-and-taxes.html", 0)}">Worked examples</a>.
        This is not tax advice.</p>`,
    },
    {
      q: "When are the drawings, in US Eastern Time?",
      a: `<p>Mega Millions: ${mm.config.drawDaysLabel} at ${mm.config.drawTimeLabel}.
        Powerball: ${pb.config.drawDaysLabel} at ${pb.config.drawTimeLabel}. All dates on this
        site are Eastern Time drawing dates.</p>`,
    },
    {
      q: "Why does the history start in 2015 and 2017, not at launch?",
      a: `<p>Both games have changed their ball pools. Numbers that did not exist under older
        rules cannot be compared with current ones. Powerball's current 5/69 + 1/26 matrix
        began on ${dateLong(pb.config.matrixSince)}; Mega Millions' 5/70 white balls on
        ${dateLong(mm.config.matrixSince)}. Mixing eras is the usual way lottery “hot number”
        tables go wrong.
        <a href="${link("methodology.html", 0)}">Methodology</a>.</p>`,
    },
    {
      q: "What changed in Mega Millions in April 2025?",
      a: `<p>The ticket became $5, the Mega Ball pool shrank from 25 to 24, the optional
        Megaplier was replaced by a built-in 2X–10X multiplier on every play, and jackpot odds
        improved to ${oneIn(mm.config.jackpotOdds)}.
        <a href="${link("guides/mega-millions-2025-rule-change.html", 0)}">The full
        breakdown</a>.</p>`,
    },
    {
      q: "Where do you get the winning numbers?",
      a: `<p>The New York State Open Data portal republishes the official multi-state results
        (<a href="https://data.ny.gov/d/5xaw-6ayf" target="_blank" rel="noopener">Mega Millions</a>,
        <a href="https://data.ny.gov/d/d6yy-54nr" target="_blank" rel="noopener">Powerball</a>).
        Feeds can lag. Never claim a prize from numbers shown here — only your state lottery
        can validate a ticket.</p>`,
    },
    {
      q: "Who can I contact?",
      a: `<p>${SITE.operatorName ? `${SITE.operatorName} edits this site. ` : ""}Email
        <a href="mailto:${SITE.email}">${SITE.email}</a> for corrections, privacy requests or
        advertising questions. We cannot check tickets, claim prizes, or speak for any lottery.
        If gambling is causing harm, call 1-800-GAMBLER.
        <a href="${link("about.html", 0)}">About and contact</a>.</p>`,
    },
  ];

  return {
    faq: items,
    body: `      <section class="panel prose prose--page">
        <p class="page-kicker">Reference</p>
        <h1>Frequently asked questions</h1>
        <p class="lede">
          Short answers, with links to the longer guides where the arithmetic lives. Nothing
          here is a recommendation to play, and nothing changes the printed odds.
        </p>
        <div class="faq-list">
        ${details(items)}
        </div>
        ${callout(
          "Still the rule",
          `<p class="disclaimer-text">${SITE.name} does not sell tickets. Generated numbers are
          entertainment only. Drawings are independent. 18+ (21+ in some states).</p>`,
          "warn",
        )}
        <p>
          Related:
          <a href="glossary.html">glossary</a> ·
          <a href="methodology.html">how the figures are computed</a> ·
          <a href="responsible-play.html">responsible play</a>.
        </p>
      </section>
`,
  };
}

export function glossaryPage() {
  const terms = [
    ["Annuity", "The advertised jackpot paid as 30 instalments over 29 years, each 5% larger than the last. Most winners take the cash option instead."],
    ["Cash option / lump sum", "A single payment equal to the present value of the annuity, typically around half the advertised jackpot, all taxable in one year."],
    ["Matrix", "The ball pools: how many white balls, from what range, plus the size of the bonus pool. Written 5/70 + 1/24 for current Mega Millions."],
    ["Mega Ball", "The gold bonus ball in Mega Millions, drawn from a separate machine. Currently 1–24."],
    ["Powerball (the ball)", "The red bonus ball in Powerball, currently 1–26, independent of the five white balls."],
    ["Megaplier", "The retired $1 Mega Millions add-on that multiplied non-jackpot prizes. Replaced in April 2025 by a built-in 2X–10X multiplier on every $5 play."],
    ["Power Play", "An optional $1 Powerball add-on that multiplies most non-jackpot prizes by 2X–10X. The $1 million tier is capped at $2 million."],
    ["Rollover", "What happens when nobody wins the jackpot: the prize is added to the next drawing. Harder jackpot odds produce longer rolls and larger advertised prizes."],
    ["Independent trials", "Each drawing is a new experiment. Previous outcomes do not change the probability of the next one."],
    ["Expected value", "The average result of a bet if it were repeated forever: each prize times its probability, summed. For these jackpots it is almost always below the ticket price once cash discount, tax and sharing are included."],
    ["Withholding vs tax owed", "US lotteries withhold 24% federal tax on large prizes. That is a prepayment. A jackpot is generally taxed at 37% federal, so more is usually due at filing, plus any state tax."],
    ["Overall odds", "The chance of winning any prize, not just the jackpot — about 1 in 23 for Mega Millions and 1 in 25 for Powerball. Most of those wins are a few dollars."],
    ["White balls", "The five main numbers. Order does not matter; they are published sorted."],
    ["Era / matrix change", "A date when the ball pools changed. Statistics on this site never mix drawings from different matrices."],
  ];

  return `      <section class="panel prose prose--page">
        <p class="page-kicker">Reference</p>
        <h1>Lottery terms, defined</h1>
        <p class="lede">
          The jargon on tickets, press releases and this site, in plain English. Linked where a
          longer explanation exists.
        </p>
        <dl class="glossary">
          ${terms
            .map(
              ([term, def]) => `<div class="glossary__row">
            <dt>${term}</dt>
            <dd>${def}</dd>
          </div>`,
            )
            .join("\n          ")}
        </dl>
        <p>
          For how the odds themselves are counted, see
          <a href="guides/how-lottery-odds-are-calculated.html">how to calculate lottery odds</a>.
          For the 24% / 37% tax split, see
          <a href="guides/record-jackpots-and-taxes.html">record jackpots and taxes</a>.
        </p>
      </section>
`;
}

export function methodologyPage(ctx) {
  const mm = ctx.mm;
  const pb = ctx.pb;

  return `      <section class="panel prose prose--page">
        <p class="page-kicker">Reference</p>
        <h1>How the figures on this site are computed</h1>
        <p class="lede">
          Every odds table is a combination count from the published ball matrix. Every
          frequency, dry spell and shape statistic is counted from the drawing record of the
          current matrix only. If a number cannot be reproduced from those two inputs, it does
          not appear.
        </p>
        <p class="note">Last updated: ${dateLong("2026-08-24")}.</p>

        <h2>1. Odds</h2>
        <p>
          Jackpot odds are C(N,&nbsp;5) × B, where N is the white-ball pool and B the bonus
          pool. Partial-match tiers use
        </p>
        <p class="formula">
          C(5,&nbsp;m) × C(N−5,&nbsp;5−m) / C(N,&nbsp;5) × (1/B or (B−1)/B)
        </p>
        <p>
          The resulting tables match the official Mega Millions and Powerball prize charts:
          jackpot ${oneIn(mm.config.jackpotOdds)} and ${oneIn(pb.config.jackpotOdds)}; any prize
          ${oneIn(mm.table.anyPrizeOneIn)} and ${oneIn(pb.table.anyPrizeOneIn)}.
        </p>

        <h2>2. Drawing data</h2>
        <p>
          Results come from the New York State Open Data portal, which republishes official
          multi-state drawings. The bundled snapshot currently runs through
          ${dateLong(mm.history.latestDraw)} (Mega Millions) and
          ${dateLong(pb.history.latestDraw)} (Powerball). The “Fetch latest results” button on
          each dashboard talks to that portal directly. Feeds can lag or contain errors;
          <strong>this site is not an official record</strong>.
        </p>
        ${table(
          ["Game", "Drawings used", "First drawing", "Why that start date"],
          [
            [
              mm.config.name,
              num(mm.history.count),
              dateLong(mm.history.firstDraw),
              "White balls became 1–70; earlier pools were 75, 56, 52…",
            ],
            [
              pb.config.name,
              num(pb.history.count),
              dateLong(pb.history.firstDraw),
              "Current 5/69 + 1/26 matrix; earlier white balls stopped at 59",
            ],
          ],
        )}

        <h2>3. The April 2025 Mega Ball change</h2>
        <p>
          On ${dateLong("2025-04-08")} the Mega Ball pool shrank from 25 to 24. White-ball
          statistics still use the full 5/70 history. Generated Mega Balls are never above 24.
          A separate “Current rules only” window starts at that date.
        </p>

        <h2>4. Tests we publish</h2>
        <p>
          A chi-square goodness-of-fit test compares each ball's count with the uniform
          expectation (${mm.expectedPerBall.toFixed(1)} Mega Millions appearances per ball,
          ${pb.expectedPerBall.toFixed(1)} Powerball). Current p-values are
          ${mm.chi.p.toFixed(2)} and ${pb.chi.p.toFixed(2)} — consistent with a fair game.
          Monte Carlo simulations of the same length produce “hot” and “cold” extremes as large
          as the real record. Details:
          <a href="guides/hot-and-cold-numbers-tested.html">hot and cold numbers tested</a>.
        </p>

        <h2>5. What the generator is</h2>
        <p>
          An optional way to sample combinations that look like historical winners (frequency,
          dry spells, sum, odd/even, low/high). It does not change anyone's odds. The
          “pure random” preset is uniform; our test suite checks that with a chi-square test.
        </p>

        <h2>6. Corrections</h2>
        <p>
          If a figure is wrong, email <a href="mailto:${SITE.email}">${SITE.email}</a> with a
          source. We will check it against the matrix or the drawing file and correct the page,
          with the date above updated. We do not silently rewrite history to match a press
          release; if an official chart and the combination formula disagree, the formula wins
          and we say so.
        </p>

        ${callout(
          "Independence",
          `<p>This project is not affiliated with the Mega Millions Consortium, MUSL, or any
          state lottery. Game names are used only to identify the games discussed.</p>`,
        )}

        ${sourceList(["nyMega", "nyPower", "mmHowTo", "pbPrizes", "mm2025", "pb2015"], 0)}
      </section>
`;
}
