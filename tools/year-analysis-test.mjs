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
} from "./year-analysis.mjs";
import { buildContext } from "./compute-context.mjs";
import { yearHref } from "../content/results.mjs";

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
  assert(page.html.includes("Key findings"), `${page.slug} missing key findings`);
  assert(page.html.includes("How to interpret"), `${page.slug} missing interpret`);
  assert(page.html.includes("year-glance"), `${page.slug} missing glance class`);
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

console.log(`PASS  year-analysis: ${pages.length} pages, helpers, ties, sums, odd/even, consecutive, bonus, empty/single, double-build`);
