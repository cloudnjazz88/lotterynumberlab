/**
 * Everything the written pages quote is computed here from combinatorics and
 * from the bundled drawing history, so no figure in the articles is hand-typed.
 */

import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("..", import.meta.url);

function loadApp() {
  const sandbox = { window: {}, console, Intl, Date, Math, JSON, fetch };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  for (const file of ["data/draws.js", "src/data.js", "src/stats.js", "src/generator.js"]) {
    vm.runInContext(readFileSync(new URL(file, root), "utf8"), sandbox, { filename: file });
  }
  return sandbox.window.LOTTO;
}

/* ------------------------------ combinatorics ----------------------------- */

export function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return Math.round(result);
}

/** Probability of matching exactly `main` white balls, with or without the bonus. */
export function tierProbability(mainMax, pick, specialMax, main, withSpecial) {
  const ways = choose(pick, main) * choose(mainMax - pick, pick - main);
  const whiteP = ways / choose(mainMax, pick);
  return whiteP * (withSpecial ? 1 / specialMax : (specialMax - 1) / specialMax);
}

const MM_PRIZES = {
  "5+1": { label: "Jackpot", value: null },
  "5+0": { label: "$1,000,000", value: 1_000_000 },
  "4+1": { label: "$10,000", value: 10_000 },
  "4+0": { label: "$500", value: 500 },
  "3+1": { label: "$200", value: 200 },
  "3+0": { label: "$10", value: 10 },
  "2+1": { label: "$10", value: 10 },
  "1+1": { label: "$7", value: 7 },
  "0+1": { label: "$5", value: 5 },
};

const PB_PRIZES = {
  "5+1": { label: "Jackpot", value: null },
  "5+0": { label: "$1,000,000", value: 1_000_000 },
  "4+1": { label: "$50,000", value: 50_000 },
  "4+0": { label: "$100", value: 100 },
  "3+1": { label: "$100", value: 100 },
  "3+0": { label: "$7", value: 7 },
  "2+1": { label: "$7", value: 7 },
  "1+1": { label: "$4", value: 4 },
  "0+1": { label: "$4", value: 4 },
};

/** Every winning tier of a game, with exact odds and the base prize. */
export function prizeTable(config) {
  const prizes = config.id === "megamillions" ? MM_PRIZES : PB_PRIZES;
  const rows = [];
  for (const key of Object.keys(prizes)) {
    const [main, special] = key.split("+").map(Number);
    const p = tierProbability(config.mainMax, config.pick, config.specialMax, main, special === 1);
    rows.push({
      key,
      main,
      special: special === 1,
      match: `${main} white${special === 1 ? ` + ${config.specialAbbr}` : ""}`,
      prize: prizes[key].label,
      value: prizes[key].value,
      probability: p,
      oneIn: 1 / p,
    });
  }
  const anyPrize = rows.reduce((a, r) => a + r.probability, 0);
  const fixedEv = rows.reduce((a, r) => a + (r.value ? r.value * r.probability : 0), 0);
  return { rows, anyPrize, anyPrizeOneIn: 1 / anyPrize, fixedEv };
}

/* --------------------------------- stats ---------------------------------- */

/** Regularized upper incomplete gamma Q(s, x) — the chi-square tail. */
function gammaQ(s, x) {
  if (x <= 0) return 1;
  const logGamma = (z) => {
    const c = [
      76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
      0.1208650973866179e-2, -0.5395239384953e-5,
    ];
    let y = z;
    let tmp = z + 5.5;
    tmp -= (z + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log((2.5066282746310005 * ser) / z);
  };

  if (x < s + 1) {
    // Series expansion for P(s, x), then Q = 1 - P.
    let ap = s;
    let sum = 1 / s;
    let del = sum;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return 1 - sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }

  // Continued fraction for Q(s, x).
  let b = x + 1 - s;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 500; i++) {
    const an = -i * (i - s);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return Math.exp(-x + s * Math.log(x) - logGamma(s)) * h;
}

export function chiSquareTest(counts, expected) {
  const chi = counts.reduce((a, c) => a + (c - expected) ** 2 / expected, 0);
  const df = counts.length - 1;
  return { chi, df, expected, p: gammaQ(df / 2, chi / 2) };
}

/**
 * How extreme the most- and least-drawn ball look in *simulated* fair histories
 * of the same length — the honest yardstick for "hot" and "cold" numbers.
 */
function simulateExtremes(mainMax, pick, drawCount, rounds = 4000) {
  const maxima = [];
  const minima = [];
  const spreads = [];
  const pool = new Int32Array(mainMax);
  for (let r = 0; r < rounds; r++) {
    pool.fill(0);
    for (let d = 0; d < drawCount; d++) {
      const seen = new Set();
      while (seen.size < pick) seen.add(Math.floor(Math.random() * mainMax));
      for (const i of seen) pool[i] += 1;
    }
    let hi = 0;
    let lo = Infinity;
    for (let i = 0; i < mainMax; i++) {
      if (pool[i] > hi) hi = pool[i];
      if (pool[i] < lo) lo = pool[i];
    }
    maxima.push(hi);
    minima.push(lo);
    spreads.push(hi - lo);
  }
  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const pct = (xs, q) => {
    const s = xs.slice().sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor(q * s.length))];
  };
  return {
    rounds,
    maxMean: mean(maxima),
    minMean: mean(minima),
    spreadMean: mean(spreads),
    spread95: pct(spreads, 0.95),
    maxP95: pct(maxima, 0.95),
  };
}

/** Upper tail P(X >= k) for a Poisson count with mean lambda. */
export function poissonTail(k, lambda) {
  let term = Math.exp(-lambda);
  let cdf = term;
  for (let i = 1; i < k; i++) {
    term *= lambda / i;
    cdf += term;
  }
  return Math.max(0, Math.min(1, 1 - cdf));
}

/**
 * What the jackpot has to be advertised at before a ticket's expected value
 * reaches its price. Staged so each assumption is visible.
 */
function breakEven(config, table, multiplier) {
  const price = Number(config.ticketPrice.replace(/[^0-9.]/g, ""));
  const p = table.rows[0].probability;
  const fixed = table.fixedEv * (multiplier || 1);
  const naive = (price - fixed) / p;
  // Advertised annuity -> cash value (~50%) -> after the 37% federal bracket.
  const realised = 0.5 * 0.63;
  return {
    price,
    fixedEv: fixed,
    fixedReturn: fixed / price,
    naive,
    afterCashAndTax: naive / realised,
    realisedShare: realised,
  };
}

/** Chance a drawing produces no jackpot winner at a given ticket volume. */
function rolloverOdds(probability, volumes) {
  return volumes.map((tickets) => ({
    tickets,
    noWinner: Math.pow(1 - probability, tickets),
  }));
}

/* ------------------------------- game facts ------------------------------- */

const MATRIX_HISTORY = {
  megamillions: [
    { from: "1996-09-06", label: "The Big Game launch", main: 50, pick: 5, special: 25 },
    { from: "1999-01-13", label: "Big Game expansion", main: 50, pick: 5, special: 36 },
    { from: "2002-05-15", label: "Renamed Mega Millions", main: 52, pick: 5, special: 52 },
    { from: "2005-06-24", label: "Mega Ball pool cut", main: 56, pick: 5, special: 46 },
    { from: "2013-10-22", label: "$1 game revamp", main: 75, pick: 5, special: 15 },
    { from: "2017-10-31", label: "$2 game revamp", main: 70, pick: 5, special: 25 },
    { from: "2025-04-08", label: "$5 game, built-in multiplier", main: 70, pick: 5, special: 24 },
  ],
  powerball: [
    { from: "1992-04-22", label: "Powerball launch", main: 45, pick: 5, special: 45 },
    { from: "1997-11-05", label: "First expansion", main: 49, pick: 5, special: 42 },
    { from: "2002-10-09", label: "White balls to 53", main: 53, pick: 5, special: 42 },
    { from: "2009-01-07", label: "$2 game", main: 59, pick: 5, special: 39 },
    { from: "2012-01-15", label: "Red ball pool cut", main: 59, pick: 5, special: 35 },
    { from: "2015-10-07", label: "Current matrix", main: 69, pick: 5, special: 26 },
  ],
};

function matrixHistory(gameId) {
  return MATRIX_HISTORY[gameId].map((era) => ({
    ...era,
    matrix: `${era.pick}/${era.main} + 1/${era.special}`,
    odds: choose(era.main, era.pick) * era.special,
  }));
}

/** Advertised annuity records, cross-checked against public jackpot records. */
export const JACKPOT_RECORDS = [
  { rank: 1, game: "Powerball", annuity: 2.04, cash: 997.6, date: "November 7, 2022", where: "California", tickets: 1 },
  { rank: 2, game: "Powerball", annuity: 1.817, cash: 834.9, date: "December 24, 2025", where: "Arkansas", tickets: 1 },
  { rank: 3, game: "Powerball", annuity: 1.787, cash: 820.6, date: "September 6, 2025", where: "Missouri, Texas", tickets: 2 },
  { rank: 4, game: "Powerball", annuity: 1.765, cash: 774.1, date: "October 11, 2023", where: "California", tickets: 1 },
  { rank: 5, game: "Mega Millions", annuity: 1.602, cash: 794.2, date: "August 8, 2023", where: "Florida", tickets: 1 },
  { rank: 6, game: "Powerball", annuity: 1.586, cash: 983.5, date: "January 13, 2016", where: "California, Florida, Tennessee", tickets: 3, note: "first jackpot over $1 billion" },
  { rank: 7, game: "Mega Millions", annuity: 1.537, cash: 877.8, date: "October 23, 2018", where: "South Carolina", tickets: 1 },
  { rank: 8, game: "Mega Millions", annuity: 1.35, cash: 724.6, date: "January 13, 2023", where: "Maine", tickets: 1 },
  { rank: 9, game: "Mega Millions", annuity: 1.337, cash: 780.5, date: "July 29, 2022", where: "Illinois", tickets: 1 },
  { rank: 10, game: "Powerball", annuity: 1.326, cash: 621, date: "April 7, 2024", where: "Oregon", tickets: 1 },
  { rank: 11, game: "Mega Millions", annuity: 1.269, cash: 571.9, date: "December 27, 2024", where: "California", tickets: 1 },
  { rank: 12, game: "Mega Millions", annuity: 1.13, cash: 537.5, date: "March 26, 2024", where: "New Jersey", tickets: 1 },
  { rank: 13, game: "Powerball", annuity: 1.08, cash: 558.1, date: "July 19, 2023", where: "California", tickets: 1 },
  { rank: 14, game: "Mega Millions", annuity: 1.05, cash: 776.6, date: "January 22, 2021", where: "Michigan", tickets: 1 },
];

/* -------------------------------- assembly -------------------------------- */

export function buildContext() {
  const APP = loadApp();
  const snapshot = APP.data.loadBundled();
  const games = {};

  for (const config of APP.data.GAMES) {
    const history = snapshot.games[config.id];
    const { draws } = APP.data.selectWindow(config, history.draws, "matrix");
    const stats = APP.stats.analyze(config, draws, history.draws);
    const st = stats.structure;

    const counts = stats.main.numbers.map((x) => x.count);
    const expected = (history.count * config.pick) / config.mainMax;
    const chi = chiSquareTest(counts, expected);
    const specialCounts = stats.special.numbers.map((x) => x.count);

    const hottest = stats.main.numbers.slice().sort((a, b) => b.count - a.count);
    const table = prizeTable(config);

    games[config.id] = {
      config,
      history,
      stats,
      matrix: matrixHistory(config.id),
      years: yearlyBreakdown(config, draws),
      table,
      chi,
      breakEven: breakEven(config, table, config.id === "megamillions" ? 3 : 1),
      breakEvenBase: breakEven(config, table, 1),
      simulated: simulateExtremes(config.mainMax, config.pick, history.count),
      expectedPerBall: expected,
      mostDrawn: hottest.slice(0, 5),
      leastDrawn: hottest.slice(-5).reverse(),
      longestDry: stats.overdue[0],
      specialMost: specialCounts.indexOf(Math.max(...specialCounts)) + 1,
      specialLeast: specialCounts.indexOf(Math.min(...specialCounts)) + 1,
      shape: {
        sumMean: st.sums.mean,
        sumSd: st.sums.sd,
        sumMin: st.sums.min,
        sumMax: st.sums.max,
        sumQ10: st.sums.q(0.1),
        sumQ90: st.sums.q(0.9),
        oddDist: Array.from(st.oddDist, (v) => v / st.total),
        lowDist: Array.from(st.lowDist, (v) => v / st.total),
        bucketDist: Array.from(st.bucketDist, (v) => v / st.total),
        consecutiveRate: 1 - st.consecDist[0] / st.total,
        repeatRate: st.repeatRate,
        total: st.total,
        allLowShare: st.lowDist[config.pick] / st.total,
        allHighShare: st.lowDist[0] / st.total,
        under31Share: countUnder31(draws, config),
      },
    };
  }

  for (const game of Object.values(games)) {
    const b = game.shape.under31Share;
    b.observedCount = Math.round(b.observed * game.history.count);
    b.expectedCount = b.expected * game.history.count;
    b.tail = poissonTail(b.observedCount, b.expectedCount);
  }

  return {
    generatedAt: new Date(),
    snapshotFetchedAt: snapshot.fetchedAt,
    games,
    mm: games.megamillions,
    pb: games.powerball,
    records: JACKPOT_RECORDS,
    powerballChange: powerballChange(),
    megaMillions2025: {
      before: matrixOdds(70, 5, 25),
      after: matrixOdds(70, 5, 24),
    },
  };
}

/** The nine winning tiers are the same shape in both games and both eras. */
const WINNING_TIERS = [
  [5, true],
  [5, false],
  [4, true],
  [4, false],
  [3, true],
  [3, false],
  [2, true],
  [1, true],
  [0, true],
];

export function matrixOdds(mainMax, pick, specialMax) {
  const jackpot = choose(mainMax, pick) * specialMax;
  const any = WINNING_TIERS.reduce(
    (a, [main, special]) => a + tierProbability(mainMax, pick, specialMax, main, special),
    0,
  );
  return {
    matrix: `${pick}/${mainMax} + 1/${specialMax}`,
    jackpot,
    anyPrizeOneIn: 1 / any,
    matchFive: 1 / tierProbability(mainMax, pick, specialMax, 5, false),
    fourPlusOne: 1 / tierProbability(mainMax, pick, specialMax, 4, true),
    probability: 1 / jackpot,
  };
}

/** Before/after picture of the October 2015 Powerball matrix change. */
function powerballChange() {
  const before = matrixOdds(59, 5, 35);
  const after = matrixOdds(69, 5, 26);
  const volumes = [20e6, 40e6, 80e6, 160e6, 320e6];
  return {
    before,
    after,
    jackpotHarder: after.jackpot / before.jackpot - 1,
    anyPrizeBetter: 1 - after.anyPrizeOneIn / before.anyPrizeOneIn,
    matchFiveRarer: after.matchFive / before.matchFive,
    rollover: volumes.map((tickets, i) => ({
      tickets,
      before: rolloverOdds(before.probability, [tickets])[0].noWinner,
      after: rolloverOdds(after.probability, [tickets])[0].noWinner,
    })),
  };
}

/**
 * Per-calendar-year breakdown for the results archive: the drawings themselves
 * plus the handful of facts that make each year's page say something specific.
 */
function yearlyBreakdown(config, draws) {
  const byYear = new Map();
  for (const draw of draws) {
    const year = draw.d.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(draw);
  }

  const years = [];
  for (const [year, list] of [...byYear.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
    const sums = list.map((d) => d.n.reduce((a, b) => a + b, 0));
    const counts = new Array(config.mainMax + 1).fill(0);
    const specialCounts = new Array(config.specialMax + 2).fill(0);
    let consecutive = 0;
    let allLow = 0;
    let repeats = 0;

    list.forEach((draw, index) => {
      for (const n of draw.n) counts[n] += 1;
      specialCounts[draw.s] += 1;
      if (draw.n.some((n, i) => i > 0 && n === draw.n[i - 1] + 1)) consecutive += 1;
      if (draw.n.every((n) => n <= Math.floor(config.mainMax / 2))) allLow += 1;
      const next = list[index + 1];
      if (next && draw.n.some((n) => next.n.includes(n))) repeats += 1;
    });

    const ranked = counts
      .map((count, n) => ({ n, count }))
      .slice(1)
      .sort((a, b) => b.count - a.count || a.n - b.n);
    const topSpecial = specialCounts
      .map((count, n) => ({ n, count }))
      .slice(1)
      .sort((a, b) => b.count - a.count || a.n - b.n)[0];

    const lowest = sums.indexOf(Math.min(...sums));
    const highest = sums.indexOf(Math.max(...sums));

    years.push({
      year,
      draws: list,
      count: list.length,
      first: list[list.length - 1].d,
      last: list[0].d,
      sumMean: sums.reduce((a, b) => a + b, 0) / sums.length,
      sumMin: { value: sums[lowest], draw: list[lowest] },
      sumMax: { value: sums[highest], draw: list[highest] },
      hottest: ranked.slice(0, 5),
      coldest: ranked.filter((x) => x.count === ranked[ranked.length - 1].count).slice(0, 8),
      missing: ranked.filter((x) => x.count === 0).map((x) => x.n),
      topSpecial,
      consecutiveShare: consecutive / list.length,
      allLowCount: allLow,
      repeatShare: repeats / Math.max(1, list.length - 1),
    });
  }
  return years;
}

/** Share of drawings whose five white balls all fall in the 1-31 "birthday" range. */
function countUnder31(draws, config) {
  const hits = draws.filter((d) => d.n.every((n) => n <= 31)).length;
  const combos = choose(31, config.pick) / choose(config.mainMax, config.pick);
  return { observed: hits / draws.length, expected: combos };
}
