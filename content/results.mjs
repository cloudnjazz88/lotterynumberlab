/**
 * Past winning numbers: a hub plus one page per game per calendar year. Each
 * year page carries its own computed analysis, not just a table dump.
 */

import { num, pct, table, dateLong, adSlot, link, sourceList } from "./site.mjs";

const pad = (n) => String(n).padStart(2, "0");
const sumOf = (draw) => draw.n.reduce((a, b) => a + b, 0);

export const gameHref = (gameId) =>
  gameId === "megamillions" ? "mega-millions.html" : "powerball.html";
export const yearHref = (gameId, year) =>
  `${gameId === "megamillions" ? "mega-millions" : "powerball"}-${year}.html`;

function balls(config, draw, size = "") {
  const cls = size ? ` ball--${size}` : "";
  return (
    `<span class="draw-cell">` +
    draw.n.map((n) => `<span class="ball${cls}">${pad(n)}</span>`).join("") +
    `<span class="ball ball--special${cls}" title="${config.specialName}">${pad(draw.s)}</span>` +
    `</span>`
  );
}

function resultsTable(config, draws) {
  return table(
    ["Drawing date (ET)", "Winning numbers", "Sum", "Odd/even", "Low/high"],
    draws.map((draw) => {
      const odd = draw.n.filter((n) => n % 2 === 1).length;
      const low = draw.n.filter((n) => n <= Math.floor(config.mainMax / 2)).length;
      return [
        dateLong(draw.d),
        balls(config, draw, "sm"),
        String(sumOf(draw)),
        `${odd}:${5 - odd}`,
        `${low}:${5 - low}`,
      ];
    }),
    {
      className: "table--results",
      caption: `${config.name} results, newest first. The ${config.specialName} is the final,
        highlighted ball. Always verify a ticket with your state lottery — this table is a
        convenience copy, not an official record.`,
    },
  );
}

/* --------------------------------- the hub -------------------------------- */

export function resultsHub(ctx) {
  const games = [ctx.mm, ctx.pb];

  return `      <section class="hero hero--slim">
        <p class="hero__eyebrow">Archive</p>
        <h1>Past winning numbers</h1>
        <p class="hero__lead">
          Every Mega Millions drawing since ${dateLong(ctx.mm.history.firstDraw)} and every
          Powerball drawing since ${dateLong(ctx.pb.history.firstDraw)} —
          ${num(ctx.mm.history.count + ctx.pb.history.count)} results in total, broken down by
          year with the sums, splits and frequency analysis for each one. All dates are the
          Eastern Time drawing dates.
        </p>
      </section>

      ${games
        .map(
          (game) => `<section class="panel prose" aria-labelledby="hub-${game.config.id}">
        <h2 id="hub-${game.config.id}">${game.config.name}</h2>
        <p>
          ${num(game.history.count)} drawings under the current ${game.config.matrixLabel} matrix,
          from ${dateLong(game.history.firstDraw)} to ${dateLong(game.history.latestDraw)}. Drawn
          ${game.config.drawDaysLabel.toLowerCase()} at ${game.config.drawTimeLabel}.
        </p>
        <h3>Most recent results</h3>
        ${table(
          ["Date", "Numbers", "Sum"],
          game.history.draws
            .slice(0, 10)
            .map((draw) => [dateLong(draw.d), balls(game.config, draw, "sm"), String(sumOf(draw))]),
        )}
        <h3>By year</h3>
        ${table(
          ["Year", "Drawings", "Average sum", "Most drawn", "Full results"],
          game.years.map((year) => [
            `<b>${year.year}</b>`,
            String(year.count),
            year.sumMean.toFixed(1),
            year.hottest
              .slice(0, 3)
              .map((x) => `${x.n} (${x.count}×)`)
              .join(", "),
            `<a href="${yearHref(game.config.id, year.year)}">${year.year} results →</a>`,
          ]),
        )}
        <p>
          <a class="text-link" href="${link(gameHref(game.config.id), 1)}"
            >Open the ${game.config.name} statistics dashboard and generator →</a
          >
        </p>
      </section>`,
        )
        .join("\n\n      ")}

      ${adSlot("results-hub")}

      <section class="panel prose">
        <h2>How to read these tables</h2>
        <p>
          Each row is one drawing: the five white balls in ascending order, then the
          ${ctx.mm.config.specialName} or ${ctx.pb.config.specialName} highlighted at the end.
          The order the balls came out of the machine does not matter for prizes, so results are
          always published sorted.
        </p>
        <p>
          <b>Sum</b> is the total of the five white balls. It clusters near
          ${ctx.mm.shape.sumMean.toFixed(0)} because there are far more combinations that add up
          to a middling total than to an extreme one — the reason is explained in
          <a href="${link("guides/what-winning-combinations-look-like.html", 1)}">what real
          winning combinations look like</a>. <b>Odd/even</b> and <b>low/high</b> count how many
          of the five balls fell on each side of that split, with "low" meaning
          1–${Math.floor(ctx.mm.config.mainMax / 2)} for Mega Millions and
          1–${Math.floor(ctx.pb.config.mainMax / 2)} for Powerball.
        </p>
        <p>
          The archive starts at each game's most recent matrix change rather than at its launch,
          because older drawings used different ball pools and cannot be pooled with current ones
          without distorting every frequency.
          <a href="${link("guides/powerball-2015-rule-change.html", 1)}">That story is worth
          reading in full</a>.
        </p>
      </section>

      ${sourceList(["nyMega", "nyPower", "mmDrawings", "pbResults"], 1)}
`;
}

/* ------------------------------- a year page ------------------------------ */

function comparison(value, baseline, unit = "") {
  const diff = value - baseline;
  const size = Math.abs(diff);
  if (size < 1.5) return `almost exactly the long-run average of ${baseline.toFixed(1)}${unit}`;
  const word = size > 6 ? (diff > 0 ? "well above" : "well below") : diff > 0 ? "above" : "below";
  return `${word} the long-run average of ${baseline.toFixed(1)}${unit}`;
}

export function yearPage(ctx, gameId, year) {
  const game = ctx.games[gameId];
  const config = game.config;
  const data = game.years.find((y) => y.year === year);
  const index = game.years.findIndex((y) => y.year === year);
  const newer = game.years[index - 1];
  const older = game.years[index + 1];
  const isPartial = data.count < 90;
  const scheduleNote =
    gameId === "powerball" && Number(year) === 2021
      ? ` Powerball added a third weekly drawing on Mondays in August 2021, which is why the
         count sits between the two-a-week and three-a-week totals.`
      : "";

  const hottestShare = data.hottest[0].count / data.count;
  const expected = (data.count * config.pick) / config.mainMax;

  return `      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="${link("index.html", 1)}">Home</a>
        <span aria-hidden="true">/</span>
        <a href="index.html">Results</a>
        <span aria-hidden="true">/</span>
        <span>${config.name} ${year}</span>
      </nav>

      <article class="panel prose prose--article">
        <header class="article-head">
          <p class="page-kicker">${config.name} archive</p>
          <h1>${config.name} results for ${year}</h1>
          <p class="article-dek">
            All ${data.count} ${config.name} drawings held in ${year}, from
            ${dateLong(data.first)} to ${dateLong(data.last)}, with the year's frequency and shape
            analysis.
          </p>
          <p class="article-meta">
            Dates are Eastern Time drawing dates · ${config.matrixLabel} ·
            ${config.ticketPrice} per play
          </p>
        </header>

        <h2>The year in numbers</h2>
        <p>
          ${config.name} held <b>${data.count} drawings</b> in ${year}${
            isPartial
              ? Number(year) === Number(game.history.firstDraw.slice(0, 4))
                ? `, starting on ${dateLong(data.first)} — the first drawing under the current
                   ${config.matrixLabel} matrix`
                : `, a partial year so far`
              : ""
          }.${scheduleNote} The five white balls averaged
          <b>${data.sumMean.toFixed(1)}</b> per drawing, ${comparison(
            data.sumMean,
            game.shape.sumMean,
          )} for this matrix.
        </p>
        ${table(
          ["Measure", `${year}`, "All ${count} drawings".replace("${count}", num(game.history.count))],
          [
            ["Drawings", String(data.count), num(game.history.count)],
            ["Average sum", data.sumMean.toFixed(1), game.shape.sumMean.toFixed(1)],
            [
              "Drawings with consecutive numbers",
              pct(data.consecutiveShare),
              pct(game.shape.consecutiveRate),
            ],
            [
              "Drawings repeating a ball from the previous one",
              pct(data.repeatShare),
              pct(game.shape.repeatRate),
            ],
            [
              "All five balls in the lower half",
              String(data.allLowCount),
              `${pct(game.shape.allLowShare)} of drawings`,
            ],
          ],
          { className: "table--compare" },
        )}

        <h2>Most and least drawn numbers of ${year}</h2>
        <p>
          With ${data.count} drawings and five balls each, every number "should" appear about
          <b>${expected.toFixed(1)} times</b> if the machine is fair. The spread below is what
          fair randomness actually looks like over a single year — a leader several appearances
          clear of the field, and a tail of numbers that barely showed up.
        </p>
        ${table(
          ["Rank", "Number", "Times drawn", "Share of ${year} drawings".replace("${year}", year)],
          data.hottest.map((entry, i) => [
            `#${i + 1}`,
            `<b>${entry.n}</b>`,
            `${entry.count}×`,
            pct(entry.count / data.count),
          ]),
          { caption: `The five most-drawn white balls of ${year}.` },
        )}
        <p>
          ${config.name}'s most frequent number in ${year} was <b>${data.hottest[0].n}</b>, drawn
          ${data.hottest[0].count} times — in ${pct(hottestShare)} of the year's drawings.
          ${
            data.missing.length
              ? `<b>${data.missing.length}</b> numbers were never drawn at all in this period
                 (${data.missing.slice(0, 12).join(", ")}${data.missing.length > 12 ? ", …" : ""}).`
              : `Every number from 1 to ${config.mainMax} came up at least once, with the quietest
                 appearing just ${data.coldest[0].count} time${data.coldest[0].count === 1 ? "" : "s"}
                 (${data.coldest
                   .slice(0, 6)
                   .map((x) => x.n)
                   .join(", ")}${data.coldest.length > 6 ? ", …" : ""}).`
          }
          The most common ${config.specialName} was <b>${data.topSpecial.n}</b>, with
          ${data.topSpecial.count} appearances.
        </p>
        <p class="note">
          None of this predicts anything. A number that led one year has no better chance the
          next, and the ranking reshuffles completely from year to year — which is exactly what
          <a href="${link("guides/hot-and-cold-numbers-tested.html", 1)}">testing the full record
          against simulated fair draws</a> shows.
        </p>

        <h2>Extremes of the year</h2>
        <p>
          The lowest-scoring drawing of ${year} came on ${dateLong(data.sumMin.draw.d)}, when the
          five white balls added up to just <b>${data.sumMin.value}</b>:
        </p>
        <p class="draw-highlight">${balls(config, data.sumMin.draw)}</p>
        <p>
          The highest was ${dateLong(data.sumMax.draw.d)}, totalling
          <b>${data.sumMax.value}</b> — a spread of
          ${data.sumMax.value - data.sumMin.value} points across a single year:
        </p>
        <p class="draw-highlight">${balls(config, data.sumMax.draw)}</p>

        ${adSlot("results-year")}

        <h2>Every ${config.name} drawing in ${year}</h2>
        ${resultsTable(config, data.draws)}

        <footer class="article-foot">
          <p class="disclaimer-text">
            These results are a convenience copy of public data and may be delayed or incorrect.
            <strong>Never claim a prize or discard a ticket based on this page</strong> — only
            your state lottery can validate a ticket. Nothing here is a prediction or a
            recommendation to play; lottery drawings are independent random events. 18+ (21+ in
            some states). <a href="${link("terms.html", 1)}">Full disclaimer</a>.
          </p>
        </footer>
      </article>

      <nav class="article-nav" aria-label="Other years">
        ${
          older
            ? `<a class="article-nav__side" href="${yearHref(gameId, older.year)}">
          <span>Previous year</span><b>${config.name} ${older.year} results</b>
        </a>`
            : `<a class="article-nav__side" href="index.html">
          <span>Archive</span><b>All past winning numbers</b>
        </a>`
        }
        ${
          newer
            ? `<a class="article-nav__side article-nav__side--next" href="${yearHref(gameId, newer.year)}">
          <span>Next year</span><b>${config.name} ${newer.year} results</b>
        </a>`
            : `<a class="article-nav__side article-nav__side--next" href="${link(gameHref(gameId), 1)}">
          <span>Statistics</span><b>${config.name} dashboard &amp; generator</b>
        </a>`
        }
      </nav>

      ${sourceList(
        gameId === "megamillions" ? ["nyMega", "mmDrawings", "mmHowTo"] : ["nyPower", "pbResults", "pbPrizes"],
        1,
      )}
`;
}

export function yearPageSpecs(ctx) {
  const pages = [];
  for (const game of [ctx.mm, ctx.pb]) {
    for (const year of game.years) {
      pages.push({ gameId: game.config.id, year: year.year, count: year.count });
    }
  }
  return pages;
}

