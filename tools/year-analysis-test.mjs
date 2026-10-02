/**
 * Year-page analysis: counts, ties, sums, odd/even, consecutive, bonus freq,
 * empty/single-draw guards, deterministic rebuild, 22 unique pages, table sync.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  analyzeYearDraws,
  yearlyBreakdown,
  hasConsecutivePair,
  whiteSum,
  oddCount,
  rankByFrequency,
  tiedAtMax,
  tiedAtMin,
  yearInterpretation,
  describeYearCoverage,
  splitAtBoundary,
  MM_2025_BOUNDARY,
  PB_2021_BOUNDARY,
} from "./year-analysis.mjs";
import { buildContext } from "./compute-context.mjs";
import { yearHref } from "../content/results.mjs";
import { dateLong } from "../content/site.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

/* ---------------- unit: helpers ---------------- */

assert(hasConsecutivePair([1, 2, 9, 15, 40]) === true, "consecutive pair detected");
assert(hasConsecutivePair([1, 3, 9, 15, 40]) === false, "no consecutive pair");
assert(whiteSum({ n: [1, 2, 3, 4, 5] }) === 15, "white sum");
assert(oddCount({ n: [1, 2, 3, 4, 5] }) === 3, "odd count");

const counts = new Array(11).fill(0);
counts[3] = 5;
counts[7] = 5;
counts[1] = 2;
const { hottest, coldest } = rankByFrequency(counts, { from: 1, to: 10 });
assert(hottest[0].n === 3 && hottest[1].n === 7, "tie-break hottest prefers lower n");
assert(tiedAtMax(hottest).map((x) => x.n).join(",") === "3,7", "tiedAtMax");
assert(tiedAtMin(hottest).every((x) => x.count === 0), "tiedAtMin zeros");

/* ---------------- empty / single-draw guards ---------------- */

const cfg = {
  id: "megamillions",
  name: "Mega Millions",
  mainMax: 70,
  pick: 5,
  specialMax: 24,
  specialName: "Mega Ball",
};

const empty = analyzeYearDraws(cfg, [], 2099);
assert(empty.count === 0 && empty.isEmpty, "empty year guard");
assert(Array.isArray(yearInterpretation(cfg, empty, { sumMean: 175, consecutiveRate: 0.25 })), "empty interpret");

const single = analyzeYearDraws(
  cfg,
  [{ d: "2020-01-01", n: [1, 2, 3, 4, 5], s: 6 }],
  2020,
);
assert(single.count === 1, "single draw count");
assert(single.sumMin.value === 15 && single.sumMax.value === 15, "single sum extremes");
assert(single.consecutiveCount === 1, "single consecutive");
assert(single.mostCommonOddEven.odd === 3, "single odd/even");

/* ---------------- synthetic multi-draw ---------------- */

const synth = [
  { d: "2024-01-02", n: [10, 11, 20, 30, 40], s: 1 },
  { d: "2024-01-05", n: [1, 3, 5, 7, 9], s: 2 },
  { d: "2024-01-09", n: [10, 22, 33, 44, 55], s: 1 },
];
const a1 = analyzeYearDraws(cfg, synth, 2024);
const a2 = analyzeYearDraws(cfg, synth.slice().reverse(), 2024);
assert(a1.count === 3, "synth count");
assert(a1.consecutiveCount === 1, "synth consecutive count");
assert(Math.abs(a1.consecutiveShare - 1 / 3) < 1e-9, "synth consecutive rate");
assert(a1.mostFrequent.some((x) => x.n === 10 && x.count === 2), "most freq white 10");
assert(a1.mostFrequentSpecial[0].n === 1 && a1.mostFrequentSpecial[0].count === 2, "bonus freq");
assert(a1.sumMean === (whiteSum(synth[0]) + whiteSum(synth[1]) + whiteSum(synth[2])) / 3, "avg sum");
assert(a1.first === "2024-01-02" && a1.last === "2024-01-09", "first/last dates");
assert(JSON.stringify(a1.hottest) === JSON.stringify(a2.hottest), "deterministic hottest");
assert(JSON.stringify(a1.oddEvenDist) === JSON.stringify(a2.oddEvenDist), "deterministic odd/even");
assert(a1.sumMin.value === a2.sumMin.value && a1.sumMax.value === a2.sumMax.value, "deterministic extremes");

const grouped = yearlyBreakdown(cfg, [
  ...synth,
  { d: "2023-06-01", n: [2, 4, 6, 8, 10], s: 3 },
]);
assert(grouped.length === 2 && grouped[0].year === "2024", "yearlyBreakdown newest first");

const tiedBonus = analyzeYearDraws(cfg, [
  { d: "2019-02-01", n: [1, 2, 3, 4, 5], s: 8 },
  { d: "2019-02-05", n: [6, 7, 8, 9, 10], s: 3 },
  { d: "2019-02-08", n: [11, 12, 13, 14, 16], s: 8 },
  { d: "2019-02-12", n: [17, 18, 19, 20, 21], s: 3 },
], 2019);
assert(tiedBonus.mostFrequentSpecial.map((entry) => entry.n).join(",") === "3,8", "bonus leaders sorted by number");
const tiedProse = yearInterpretation(cfg, tiedBonus, { sumMean: 100, consecutiveRate: 0.2, total: 100 }, {
  referenceDate: "2026-10-01",
  archiveCount: 100,
  archiveFirst: "2017-10-31",
  archiveLast: "2026-09-29",
}).join(" ");
assert(tiedProse.includes("tied for the lead") && tiedProse.includes("3") && tiedProse.includes("8"), "tied bonus leaders named together");
assert(!/reshuffle every year/i.test(tiedProse), "no uncalculated reshuffle claim");
assert(!/ordinary sampling noise|matrix-wide|long-run matrix/i.test(tiedProse), "no untested noise or matrix-wide claim");

const many = Array.from({ length: 100 }, (_, index) => ({
  d: `2026-${String(Math.floor(index / 28) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`,
  n: [1, 2, 3, 4, 5],
  s: 1,
})).filter((draw) => draw.d <= "2026-09-30");
assert(many.length > 90, "fixture current year has more than 90 drawings");
const currentYear = analyzeYearDraws(cfg, many, 2026);
const currentCoverage = describeYearCoverage(currentYear, { referenceDate: "2026-10-01", archiveFirst: "2017-10-31" });
assert(currentCoverage.calendar === "year-to-date" && !currentCoverage.smallSample, "count above 90 is still year-to-date");
const currentProse = yearInterpretation(cfg, currentYear, { sumMean: 15, consecutiveRate: 1, total: 931 }, {
  referenceDate: "2026-10-01",
  archiveCount: 931,
  archiveFirst: "2017-10-31",
  archiveLast: "2026-09-29",
}).join(" ");
assert(/year-to-date/i.test(currentProse), "current year says year-to-date");
assert(!/completed \d+ drawings|still in progress|year is complete/i.test(currentProse), "current year is not called complete from its count");

const shortArchive = analyzeYearDraws(cfg, [
  { d: "2017-10-31", n: [1, 2, 3, 4, 5], s: 6 },
  { d: "2017-11-03", n: [6, 7, 8, 9, 10], s: 7 },
], 2017);
const shortCoverage = describeYearCoverage(shortArchive, { referenceDate: "2026-10-01", archiveFirst: "2017-10-31" });
assert(shortCoverage.calendar === "past-calendar" && shortCoverage.beginsPartway && shortCoverage.smallSample, "short archive coverage is separate from sample size");
const shortProse = yearInterpretation(cfg, shortArchive, { sumMean: 40, consecutiveRate: 0.3, total: 931 }, {
  referenceDate: "2026-10-01",
  archiveCount: 931,
  archiveFirst: "2017-10-31",
  archiveLast: "2026-09-29",
}).join(" ");
assert(/partway through 2017/i.test(shortProse) && /small sample/i.test(shortProse) && /past calendar year/i.test(shortProse), "short archive states all three coverage ideas");
assert(!/still in progress|count < 90|year is complete/i.test(shortProse), "short archive is not inferred from a draw-count cutoff");

/* ---------------- live context + HTML ---------------- */

const ctx = buildContext();
const mmYears = ctx.mm.years;
const pbYears = ctx.pb.years;
assert(mmYears.length === 10, `MM years expected 10 got ${mmYears.length}`);
assert(pbYears.length === 12, `PB years expected 12 got ${pbYears.length}`);

function countsByYear(draws) {
  const by = {};
  for (const d of draws) {
    const y = d.d.slice(0, 4);
    by[y] = (by[y] || 0) + 1;
  }
  return by;
}
const snapshot = JSON.parse(readFileSync(resolve(ROOT, "data/draws.json"), "utf8"));
const expectedMm = countsByYear(snapshot.games.megamillions.draws);
const expectedPb = countsByYear(snapshot.games.powerball.draws);

for (const y of mmYears) {
  assert(y.count === expectedMm[y.year], `MM ${y.year} count ${y.count} != ${expectedMm[y.year]}`);
  assert(y.oddEvenDist?.length === 6, `MM ${y.year} oddEven dist`);
  assert(y.mostCommonOddEven, `MM ${y.year} most common odd/even`);
  assert(typeof y.consecutiveCount === "number", `MM ${y.year} consecutiveCount`);
  assert(y.matrixNote && y.matrixNote.length > 20, `MM ${y.year} matrix note`);
  assert(y.mostFrequent?.length >= 1, `MM ${y.year} mostFrequent`);
}
for (const y of pbYears) {
  assert(y.count === expectedPb[y.year], `PB ${y.year} count ${y.count} != ${expectedPb[y.year]}`);
}

// Double-build determinism
const ctx2 = buildContext();
for (let i = 0; i < mmYears.length; i++) {
  const a = mmYears[i];
  const b = ctx2.mm.years[i];
  assert(a.year === b.year && a.count === b.count, "double-build year identity");
  assert(JSON.stringify(a.hottest) === JSON.stringify(b.hottest), `double-build hottest ${a.year}`);
  assert(a.sumMean === b.sumMean, `double-build sumMean ${a.year}`);
  assert(a.consecutiveCount === b.consecutiveCount, `double-build consec ${a.year}`);
}

const pages = [];
for (const game of [ctx.mm, ctx.pb]) {
  for (const year of game.years) {
    const slug = `results/${yearHref(game.config.id, year.year)}`;
    const file = resolve(ROOT, slug);
    assert(existsSync(file), `missing built page ${slug}`);
    const html = readFileSync(file, "utf8");
    pages.push({ slug, html, year: year.year, gameId: game.config.id, data: year });
  }
}
assert(pages.length === 22, `expected 22 year pages, got ${pages.length}`);

const canonicals = new Set();
const titles = new Set();
const h1s = new Set();
for (const page of pages) {
  const canon = page.html.match(/<link rel="canonical" href="([^"]+)"/);
  const title = page.html.match(/<title>([^<]+)<\/title>/);
  const h1 = page.html.match(/<h1>([^<]+)<\/h1>/);
  assert(canon, `${page.slug} missing canonical`);
  assert(title, `${page.slug} missing title`);
  assert(h1, `${page.slug} missing h1`);
  assert(!canonicals.has(canon[1]), `duplicate canonical ${canon[1]}`);
  assert(!titles.has(title[1]), `duplicate title ${title[1]}`);
  assert(!h1s.has(h1[1]), `duplicate h1 ${h1[1]}`);
  canonicals.add(canon[1]);
  titles.add(title[1]);
  h1s.add(h1[1]);

  assert(page.html.includes("Year at a glance"), `${page.slug} missing glance`);
  assert(!page.html.includes("Key findings"), `${page.slug} still has a separate key-findings block`);
  assert(page.html.includes("How to interpret"), `${page.slug} missing interpret`);
  assert(page.html.includes('href="#year-drawings"'), `${page.slug} missing drawings link`);
  const interpretAt = page.html.indexOf("How to interpret");
  const tableAt = page.html.indexOf('id="year-drawings"');
  assert(interpretAt > 0 && tableAt > interpretAt, `${page.slug} interpretation is not before the drawing table`);
  assert(page.html.includes("year-glance"), `${page.slug} missing glance class`);
  assert(!/ordinary sampling noise|matrix-wide|reshuffle every year|long-run matrix/i.test(page.html), `${page.slug} unsupported statistical claim`);
  for (const draw of page.data.draws) {
    assert(page.html.includes(dateLong(draw.d)), `${page.slug} missing drawing ${draw.d}`);
  }
  assert(!/improve(?:s|d)? your odds|better chance to win|predict the next/i.test(page.html), `${page.slug} prediction language`);

  // Table data matches stats source: draw count in glance
  assert(
    page.html.includes(`>${page.data.count}<`) || page.html.includes(`>${Number(page.data.count).toLocaleString("en-US")}<`),
    `${page.slug} draw count not shown`,
  );
  assert(page.html.includes(page.data.sumMean.toFixed(1)), `${page.slug} sumMean mismatch`);
  assert(
    page.html.includes(`>${page.data.consecutiveCount}<`) ||
      page.html.includes(`${page.data.consecutiveCount} of ${page.data.count}`) ||
      page.html.includes(`${page.data.consecutiveCount} (`),
    `${page.slug} consecutive count missing`,
  );
  if (page.data.hottest[0]) {
    assert(page.html.includes(`>${page.data.hottest[0].n}<`) || page.html.includes(`<b>${page.data.hottest[0].n}</b>`), `${page.slug} hottest missing`);
  }
}

function sameRow(left, right) {
  return left.d === right.d && left.s === right.s && left.n.join(",") === right.n.join(",");
}
function assertRowsUnchanged(label, original, analyzed) {
  assert(original.length === analyzed.length, `${label} row count changed`);
  const byDate = new Map(analyzed.map((draw) => [draw.d, draw]));
  for (const draw of original) {
    const found = byDate.get(draw.d);
    assert(found && sameRow(draw, found), `${label} row ${draw.d} changed`);
  }
}

const referenceDate = String(ctx.snapshotFetchedAt).slice(0, 10);
const pb2026 = pbYears.find((year) => year.year === "2026");
const mm2017 = mmYears.find((year) => year.year === "2017");
const mm2025 = mmYears.find((year) => year.year === "2025");
const pb2021 = pbYears.find((year) => year.year === "2021");
assert(pb2026.count > 90, `PB 2026 should be the current year with more than 90 drawings, got ${pb2026.count}`);
const liveCurrent = describeYearCoverage(pb2026, { referenceDate, archiveFirst: ctx.pb.history.firstDraw });
assert(liveCurrent.calendar === "year-to-date", "PB 2026 coverage is year-to-date");
const liveShort = describeYearCoverage(mm2017, { referenceDate, archiveFirst: ctx.mm.history.firstDraw });
assert(liveShort.calendar === "past-calendar" && liveShort.beginsPartway && liveShort.smallSample, "MM 2017 coverage");

const mm2025rows = snapshot.games.megamillions.draws.filter((draw) => draw.d.startsWith("2025"));
const mmSplit = splitAtBoundary(mm2025rows, MM_2025_BOUNDARY);
assert(mmSplit.before.count + mmSplit.after.count === mm2025.count, "MM 2025 split keeps every row");
assert(mmSplit.before.draws.every((draw) => draw.d < MM_2025_BOUNDARY), "MM 2025 before boundary");
assert(mmSplit.after.draws.every((draw) => draw.d >= MM_2025_BOUNDARY), "MM 2025 from boundary");
assertRowsUnchanged("MM 2025", mm2025rows, mm2025.draws);

const pb2021rows = snapshot.games.powerball.draws.filter((draw) => draw.d.startsWith("2021"));
const pbSplit = splitAtBoundary(pb2021rows, PB_2021_BOUNDARY);
assert(pbSplit.before.count + pbSplit.after.count === pb2021.count, "PB 2021 split keeps every row");
assert(pbSplit.before.weekdays.includes("Wednesday") && pbSplit.before.weekdays.includes("Saturday"), "PB 2021 before schedule");
assert(pbSplit.after.weekdays.includes("Monday") && !pbSplit.before.weekdays.includes("Monday"), "PB 2021 Monday starts at the boundary");
assertRowsUnchanged("PB 2021", pb2021rows, pb2021.draws);

for (const year of mmYears) {
  const original = snapshot.games.megamillions.draws.filter((draw) => draw.d.startsWith(year.year));
  assertRowsUnchanged(`MM ${year.year}`, original, year.draws);
}
for (const year of pbYears) {
  const original = snapshot.games.powerball.draws.filter((draw) => draw.d.startsWith(year.year));
  assertRowsUnchanged(`PB ${year.year}`, original, year.draws);
}

const mm2025page = pages.find((page) => page.slug === "results/mega-millions-2025.html");
const pb2021page = pages.find((page) => page.slug === "results/powerball-2021.html");
assert(mm2025page.html.includes(String(mmSplit.before.count)) && mm2025page.html.includes(String(mmSplit.after.count)), "MM 2025 page shows period counts");
assert(mm2025page.html.includes("1–25") && mm2025page.html.includes("1–24") && mm2025page.html.includes("$2") && mm2025page.html.includes("$5"), "MM 2025 page shows pools and prices");
assert(mm2025page.html.includes("White-ball frequencies") && mm2025page.html.includes("not a single set of rules"), "MM 2025 explains mixed bonus rules");
assert(pb2021page.html.includes(String(pbSplit.before.count)) && pb2021page.html.includes(String(pbSplit.after.count)), "PB 2021 page shows period counts");
assert(pb2021page.html.includes(pbSplit.before.weekdays[0]) && pb2021page.html.includes("Monday"), "PB 2021 page shows schedules");
assert(!pb2021page.html.includes("added a third weekly drawing"), "PB 2021 Monday explanation is not duplicated");
assert((pb2021page.html.match(/August 23, 2021/g) || []).length >= 1, "PB 2021 cites the boundary");

console.log(`PASS  year-analysis: ${pages.length} pages, helpers, ties, sums, odd/even, consecutive, bonus, empty/single, double-build`);
console.log(`  MM 2025 periods: before ${mmSplit.before.count} (${mmSplit.before.first}–${mmSplit.before.last}), from ${mmSplit.after.count} (${mmSplit.after.first}–${mmSplit.after.last})`);
console.log(`  PB 2021 periods: before ${pbSplit.before.count} ${pbSplit.before.weekdays.join("/")} (${pbSplit.before.first}–${pbSplit.before.last}), from ${pbSplit.after.count} ${pbSplit.after.weekdays.join("/")} (${pbSplit.after.first}–${pbSplit.after.last})`);
