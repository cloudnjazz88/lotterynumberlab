/**
 * Past winning numbers: a hub plus one page per game per calendar year. Each
 * year page carries its own computed analysis, not just a table dump.
 */

import { num, pct, table, dateLong, adSlot, link, sourceList, SOURCES } from "./site.mjs";
import {
  yearInterpretation,
  formatBallList,
  splitAtBoundary,
  MM_2025_BOUNDARY,
  PB_2021_BOUNDARY,
} from "../tools/year-analysis.mjs";

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

function accentClass(gameId) {
  return gameId === "megamillions" ? "year-glance--mm" : "year-glance--pb";
}

function listWeekdays(days) {
  if (!days?.length) return "—";
  if (days.length === 1) return days[0];
  if (days.length === 2) return `${days[0]} and ${days[1]}`;
  return `${days.slice(0, -1).join(", ")}, and ${days[days.length - 1]}`;
}

function periodDates(period) {
  if (!period?.first || !period?.last) return "—";
  return `${dateLong(period.first)} – ${dateLong(period.last)}`;
}

function glanceCard(label, value, hint = "") {
  return `<div class="year-glance__card">
    <dt>${label}</dt>
    <dd>${value}</dd>
    ${hint ? `<p class="year-glance__hint">${hint}</p>` : ""}
  </div>`;
}

/* --------------------------------- the hub -------------------------------- */

export function resultsHub(ctx) {
  const games = [ctx.mm, ctx.pb];

  const gameCard = (game) => {
    const id = game.config.id;
    return `<section class="panel prose results-hub__card results-hub__card--${id}" aria-labelledby="hub-${id}">
        <div class="results-hub__summary">
        <h2 id="hub-${id}">${game.config.name}</h2>
        <p class="results-hub__meta">
          ${num(game.history.count)} drawings under the current ${game.config.matrixLabel} matrix,
          from ${dateLong(game.history.firstDraw)} to ${dateLong(game.history.latestDraw)}. Drawn
          ${game.config.drawDaysLabel.toLowerCase()} at ${game.config.drawTimeLabel}.
        </p>
        </div>
        <h3>Most recent results</h3>
        ${table(
          ["Date", "Numbers"],
          game.history.draws
            .slice(0, 10)
            .map((draw) => [dateLong(draw.d), balls(game.config, draw, "sm")]),
          { className: "results-hub__recent" },
        )}
        <h3>By year</h3>
        ${table(
          ["Year", "Drawings", "Most drawn", "Full results"],
          game.years.map((year) => [
            `<b>${year.year}</b>`,
            String(year.count),
            `<span class="results-hub__hottest">${year.hottest
              .slice(0, 3)
              .map((x) => `${x.n} (${x.count}×)`)
              .join(", ")}</span>`,
            `<a class="results-hub__year-link" href="${yearHref(game.config.id, year.year)}">${year.year} results →</a>`,
          ]),
          { className: "results-hub__by-year" },
        )}
        <p class="results-hub__cta">
          <a class="text-link" href="${link(gameHref(game.config.id), 1)}"
            >Open the ${game.config.name} statistics dashboard and generator →</a
          >
        </p>
      </section>`;
  };

  return `      <section class="hero hero--slim">
        <p class="hero__eyebrow">Archive</p>
        <h1>Past Mega Millions and Powerball winning numbers</h1>
        <p class="hero__lead">
          Every Mega Millions drawing since ${dateLong(ctx.mm.history.firstDraw)} and every
          Powerball drawing since ${dateLong(ctx.pb.history.firstDraw)} —
          ${num(ctx.mm.history.count + ctx.pb.history.count)} results in total, broken down by
          year. All dates are the Eastern Time drawing dates.
        </p>
      </section>

      <nav class="results-hub__jumps" aria-label="Jump to game archive">
        <a class="results-hub__jump" href="#hub-megamillions">Mega Millions</a>
        <a class="results-hub__jump" href="#hub-powerball">Powerball</a>
      </nav>

      <div class="results-hub">
        ${games.map(gameCard).join("\n\n        ")}
      </div>

${adSlot("results-hub") ? `      ${adSlot("results-hub")}\n` : ""}

      <section class="panel prose">
        <h2>How to read these tables</h2>
        <p>
          Each row is one drawing: the five white balls in ascending order, then the
          ${ctx.mm.config.specialName} or ${ctx.pb.config.specialName} (the gold bonus ball)
          highlighted at the end. The order the balls came out of the machine does not matter
          for prizes, so results are always published sorted.
        </p>
        <p>
          <b>Most drawn</b> on each year row lists the hottest white balls for that calendar
          year under the current matrix — not across older rule sets.
          <b>Full results</b> opens that year's page. Do not mix drawings from older matrices
          with these counts; ball pools change and pooling them distorts every frequency.
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

function archiveRulesLabel(gameId, year, config) {
  const y = Number(year);
  if (gameId === "megamillions") {
    if (y <= 2024) return "5 of 70 + 1 of 25 · $2 per play";
    if (y === 2025) {
      return "before April 8, 2025: 5 of 70 + 1 of 25 and $2 per play; from April 8, 2025: 5 of 70 + 1 of 24 and $5 per play";
    }
  }
  return `${config.matrixLabel} ·\n            ${config.ticketPrice} per play`;
}
function observedArchiveHint(value, baseline, count) {
  const diff = value - baseline;
  const size = Math.abs(diff);
  const relation =
    size < 1.5
      ? "within 1.5 of"
      : diff > 0
        ? `${size.toFixed(1)} above`
        : `${size.toFixed(1)} below`;
  return `${relation} the observed archive average of ${baseline.toFixed(1)} (${num(count)} drawings)`;
}

function transitionSection(gameId, year, draws) {
  if (gameId === "megamillions" && Number(year) === 2025) {
    const split = splitAtBoundary(draws, MM_2025_BOUNDARY);
    return `<h2>April 8, 2025 rule change</h2>
        <p>
          White-ball pools stayed 5 of 70 on both sides of this date. The Mega Ball pool and the
          base ticket price changed. Counts and dates below are the bundled drawings in each period.
          Official announcement:
          <a href="${SOURCES.mm2025.url}" target="_blank" rel="noopener nofollow">${SOURCES.mm2025.label}</a>.
        </p>
        ${table(
          ["Period", "Bundled drawings", "Date coverage", "Mega Ball pool", "Base ticket price"],
          [
            ["Before April 8, 2025", String(split.before.count), periodDates(split.before), "1–25", "$2"],
            ["From April 8, 2025", String(split.after.count), periodDates(split.after), "1–24", "$5"],
          ],
          { caption: `Mega Millions periods in the ${year} bundled snapshot, split on ${dateLong(MM_2025_BOUNDARY)}.` },
        )}
        <p>
          White-ball frequencies on this page can be read as one pool. Mega Ball frequencies mix
          the 1–25 period and the 1–24 period, so they are not a single set of rules.
        </p>`;
  }
  if (gameId === "powerball" && Number(year) === 2021) {
    const split = splitAtBoundary(draws, PB_2021_BOUNDARY);
    return `<h2>August 23, 2021 schedule change</h2>
        <p>
          White and red pools stayed 5 of 69 and 1 of 26. Powerball added Monday drawings to the
          existing Wednesday and Saturday drawings beginning August 23, 2021.
          Official announcement:
          <a href="${SOURCES.pbMonday2021.url}" target="_blank" rel="noopener nofollow">${SOURCES.pbMonday2021.label}</a>.
          The schedule column is the set of weekdays present in the bundled rows for that period.
        </p>
        ${table(
          ["Period", "Bundled drawings", "Date coverage", "Weekly drawing schedule"],
          [
            [
              "Before August 23, 2021",
              String(split.before.count),
              periodDates(split.before),
              listWeekdays(split.before.weekdays),
            ],
            [
              "From August 23, 2021",
              String(split.after.count),
              periodDates(split.after),
              listWeekdays(split.after.weekdays),
            ],
          ],
          { caption: `Powerball periods in the ${year} bundled snapshot, split on ${dateLong(PB_2021_BOUNDARY)}.` },
        )}`;
  }
  return "";
}

export function yearPage(ctx, gameId, year) {
  const game = ctx.games[gameId];
  const config = game.config;
  const data = game.years.find((y) => y.year === year);
  const index = game.years.findIndex((y) => y.year === year);
  const newer = game.years[index - 1];
  const older = game.years[index + 1];
  const referenceDate = ctx.snapshotFetchedAt
    ? String(ctx.snapshotFetchedAt).slice(0, 10)
    : data.last;

  const expected = (data.count * config.pick) / config.mainMax;
  const mode = data.mostCommonOddEven;
  const interpret = yearInterpretation(config, data, game.shape, {
    referenceDate,
    archiveCount: game.shape.total,
    archiveFirst: game.history.firstDraw,
    archiveLast: game.history.latestDraw,
  });
  const specialTop =
    data.mostFrequentSpecial && data.mostFrequentSpecial.length
      ? data.mostFrequentSpecial
      : data.topSpecial
        ? [data.topSpecial]
        : [];
  const fetchedNote = dateLong(referenceDate);
  const archiveScope = `${num(game.shape.total)} drawings, ${dateLong(game.history.firstDraw)} – ${dateLong(game.history.latestDraw)}`;

  return `      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="${link("/", 1)}">Home</a>
        <span aria-hidden="true">/</span>
        <a href="index.html">Results</a>
        <span aria-hidden="true">/</span>
        <span>${config.name} ${year}</span>
      </nav>

      <article class="panel prose prose--article year-page" data-game="${gameId}" data-year="${year}">
        <header class="article-head">
          <p class="page-kicker">${config.name} archive</p>
          <h1>${config.name} winning numbers for ${year}</h1>
          <p class="article-dek">
            ${data.count} bundled ${config.name} drawings in ${year}, from
            ${dateLong(data.first)} to ${dateLong(data.last)}, with year-specific frequency,
            sum, odd/even and consecutive-pair analysis from the bundled draw record.
          </p>
          <p class="article-meta">
            Dates are Eastern Time drawing dates · ${archiveRulesLabel(gameId, year, config)}
          </p>
        </header>

        <h2>Year at a glance</h2>
        <p class="year-matrix-note">${data.matrixNote}</p>
        <dl class="year-glance ${accentClass(gameId)}">
          ${glanceCard("Drawings", num(data.count), `${dateLong(data.first)} → ${dateLong(data.last)}`)}
          ${glanceCard("Average white-ball sum", data.sumMean.toFixed(1), observedArchiveHint(data.sumMean, game.shape.sumMean, game.shape.total))}
          ${glanceCard(
            "Sum range",
            `${data.sumMin.value} – ${data.sumMax.value}`,
            `Low ${dateLong(data.sumMin.draw.d)} · High ${dateLong(data.sumMax.draw.d)}`,
          )}
          ${glanceCard(
            "Consecutive pairs",
            `${data.consecutiveCount} (${pct(data.consecutiveShare)})`,
            `Observed archive rate ${pct(game.shape.consecutiveRate)} (${num(game.shape.total)} drawings)`,
          )}
          ${glanceCard(
            "Top odd/even split",
            mode ? `${mode.odd}:${mode.even}` : "—",
            mode ? `${mode.count} drawings (${pct(mode.share)})` : "",
          )}
          ${glanceCard(
            `Top ${config.specialName}`,
            specialTop.length ? specialTop.map((x) => x.n).join(", ") : "—",
            specialTop.length ? `${specialTop.length > 1 ? "tied at " : ""}${specialTop[0].count}×` : "",
          )}
        </dl>
        <p><a href="#year-drawings">Every ${config.name} drawing in ${year}</a></p>
${transitionSection(gameId, year, data.draws)}
        <h2>How to interpret these ${year} figures</h2>
        ${interpret.map((p) => `<p>${p}</p>`).join("\n        ")}

        <h2>Frequency — white balls and ${config.specialName}</h2>
        <p>
          With ${data.count} drawings and five white balls each, the mathematical expectation for
          one specified white number is about <b>${expected.toFixed(1)} appearances</b>
          (${data.count} × ${config.pick} / ${config.mainMax}). That is an expectation for this
          year's drawing count, not the observed archive average. Rankings below break ties by
          ball number ascending so a rebuild always produces the same order.
        </p>
        ${table(
          ["Rank", "White ball", "Times drawn", `Share of ${year} drawings`],
          data.hottest.map((entry, i) => [
            `#${i + 1}`,
            `<b>${entry.n}</b>`,
            `${entry.count}×`,
            pct(entry.count / data.count),
          ]),
          { caption: `Five most-drawn white balls in ${year} (ties broken by lower number first).` },
        )}
        <p>
          Least-drawn white balls in ${year}
          ${
            data.missing.length
              ? `(including <b>${data.missing.length}</b> that never appeared): ${formatBallList(data.leastFrequent, 12)}.`
              : `all sat at <b>${data.leastFrequent[0]?.count ?? 0}×</b>: ${formatBallList(data.leastFrequent, 12)}.`
          }
        </p>
        ${
          data.specialRanked?.length
            ? table(
                ["Rank", config.specialName, "Times drawn", `Share of ${year}`],
                data.specialRanked.slice(0, 5).map((entry, i) => [
                  `#${i + 1}`,
                  `<b>${entry.n}</b>`,
                  `${entry.count}×`,
                  pct(entry.count / data.count),
                ]),
                { caption: `Most frequent ${config.specialName} values in ${year}.` },
              )
            : ""
        }
        <p class="note">
          Frequency is a rear-view mirror. A number that led ${year} has no better chance in the
          next drawing — see
          <a href="${link("guides/hot-and-cold-numbers-tested.html", 1)}">hot and cold numbers tested</a>
          and
          <a href="${link("guides/independent-trials.html", 1)}">independent trials</a>.
        </p>

        <h2>Sums and odd/even distribution</h2>
        <p>
          The lowest white-ball sum of ${year} was <b>${data.sumMin.value}</b> on
          ${dateLong(data.sumMin.draw.d)}:
        </p>
        <p class="draw-highlight">${balls(config, data.sumMin.draw)}</p>
        <p>
          The highest was <b>${data.sumMax.value}</b> on ${dateLong(data.sumMax.draw.d)}
          — a spread of ${data.sumMax.value - data.sumMin.value} points:
        </p>
        <p class="draw-highlight">${balls(config, data.sumMax.draw)}</p>
        ${table(
          ["Odd:even split", "Drawings", "Share of year"],
          data.oddEvenDist.map((row) => [
            `<b>${row.odd} odd / ${row.even} even</b>`,
            String(row.count),
            pct(row.share),
          ]),
          { caption: `Odd/even split of the five white balls across all ${data.count} drawings in ${year}.` },
        )}
        ${table(
          ["Measure", String(year), `Observed archive (${archiveScope})`],
          [
            ["Drawings", String(data.count), num(game.history.count)],
            ["Average sum", data.sumMean.toFixed(1), game.shape.sumMean.toFixed(1)],
            [
              "Drawings with consecutive numbers",
              `${data.consecutiveCount} (${pct(data.consecutiveShare)})`,
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

        <h2>Consecutive-number pairs</h2>
        <p>
          <b>${data.consecutiveCount}</b> of ${data.count} drawings (${pct(data.consecutiveShare)})
          included at least one consecutive white-ball pair (for example 14–15). The observed rate
          in the bundled archive (${archiveScope}) is ${pct(game.shape.consecutiveRate)}. That
          comparison is a count, not a test of the difference. Consecutive pairs are not a signal
          to seek or avoid on a ticket.
        </p>

${adSlot("results-year") ? `        ${adSlot("results-year")}\n` : ""}

        <h2 id="year-drawings">Every ${config.name} drawing in ${year}</h2>
        ${resultsTable(config, data.draws)}

        <h2>Source and methodology</h2>
        <p>
          Counts on this page are computed from the site's bundled ${config.name} draw file for
          calendar year ${year} only (Eastern Time drawing dates). Matrix context:
          ${data.matrixNote} Full method and correction policy:
          <a href="${link("methodology.html", 1)}">Methodology</a>.
          Draw snapshot last refreshed ${fetchedNote}. Always verify a ticket with your state
          lottery — this page is a convenience copy, not an official record.
        </p>

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

      <section class="panel prose year-related">
        <h2>Related years, guides and tools</h2>
        <ul class="year-related__list">
${[
  `<li><a href="${link(gameHref(gameId), 1)}">${config.name} statistics dashboard</a></li>`,
  `<li><a href="index.html">Results archive hub</a></li>`,
  older ? `<li><a href="${yearHref(gameId, older.year)}">${config.name} ${older.year} results</a></li>` : "",
  newer ? `<li><a href="${yearHref(gameId, newer.year)}">${config.name} ${newer.year} results</a></li>` : "",
  `<li><a href="${link("tools/odds-explorer.html", 1)}">Odds Explorer</a></li>`,
  `<li><a href="${link("tools/ticket-match-checker.html", 1)}">Ticket Match checker</a></li>`,
  `<li><a href="${link("guides/independent-trials.html", 1)}">Independent trials guide</a></li>`,
  `<li><a href="${link("guides/hot-and-cold-numbers-tested.html", 1)}">Hot and cold numbers tested</a></li>`,
  `<li><a href="${link("methodology.html", 1)}">Methodology and corrections</a></li>`,
  gameId === "megamillions" && Number(year) >= 2025
    ? `<li><a href="${link("guides/mega-millions-2025-rule-change.html", 1)}">Mega Millions 2025 rule change</a></li>`
    : "",
  gameId === "powerball" && Number(year) <= 2016
    ? `<li><a href="${link("guides/powerball-2015-rule-change.html", 1)}">Powerball 2015 rule change</a></li>`
    : "",
].filter(Boolean).map((li) => `          ${li}`).join("\n")}
        </ul>
      </section>

      ${sourceList(
        gameId === "megamillions"
          ? ["nyMega", "mmDrawings", "mmHowTo", ...(Number(year) === 2025 ? ["mm2025"] : [])]
          : ["nyPower", "pbResults", "pbPrizes", ...(Number(year) === 2021 ? ["pbMonday2021"] : [])],
        1,
      )}
`;
}

export function yearPageSpecs(ctx) {
  const pages = [];
  for (const game of [ctx.mm, ctx.pb]) {
    for (const year of game.years) {
      pages.push({
        gameId: game.config.id,
        year: year.year,
        count: year.count,
        last: year.last,
      });
    }
  }
  return pages;
}
