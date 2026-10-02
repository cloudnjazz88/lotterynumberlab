import { dateLong } from "../content/site.mjs";

/**
 * Per-calendar-year statistics for results archive pages.
 * All figures are derived from that year's bundled draws only.
 * Deterministic: same draws → same rankings (count desc, n asc ties).
 */

/** Sum of the five white balls. */
export function whiteSum(draw) {
  return draw.n.reduce((a, b) => a + b, 0);
}

/** True when the sorted white balls contain at least one consecutive pair. */
export function hasConsecutivePair(numbers) {
  const sorted = numbers.slice().sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) return true;
  }
  return false;
}

/** Odd count among white balls (0–5). */
export function oddCount(draw) {
  return draw.n.filter((n) => n % 2 === 1).length;
}

/**
 * Rank frequency entries. Hottest: count desc, n asc.
 * Coldest: count asc, n asc.
 */
export function rankByFrequency(counts, { from = 1, to } = {}) {
  const end = to ?? counts.length - 1;
  const ranked = [];
  for (let n = from; n <= end; n++) {
    ranked.push({ n, count: counts[n] || 0 });
  }
  const hottest = ranked.slice().sort((a, b) => b.count - a.count || a.n - b.n);
  const coldest = ranked.slice().sort((a, b) => a.count - b.count || a.n - b.n);
  return { ranked: hottest, hottest, coldest };
}

/** All entries tied at the maximum count. */
export function tiedAtMax(ranked) {
  if (!ranked.length) return [];
  const max = ranked[0].count;
  return ranked.filter((x) => x.count === max);
}

/** All entries tied at the minimum count. */
export function tiedAtMin(ranked) {
  if (!ranked.length) return [];
  const min = ranked[ranked.length - 1].count;
  return ranked.filter((x) => x.count === min);
}

/**
 * Matrix / rule note for a calendar year. Describes the ball pools and
 * schedule quirks that applied during that year — not a prediction.
 */
/**
 * Calendar coverage is decided from an explicit snapshot reference date.
 * A draw-count cutoff is not used to call a year current, complete, or partial.
 * `smallSample` is only a description of sample size.
 */
export const SMALL_SAMPLE_DRAWINGS = 40;
export const MM_2025_BOUNDARY = "2025-04-08";
export const PB_2021_BOUNDARY = "2021-08-23";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayOf(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

export function periodFromDraws(draws) {
  const list = (Array.isArray(draws) ? draws : []).slice().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const days = [];
  for (const draw of list) {
    const day = weekdayOf(draw.d);
    if (!days.includes(day)) days.push(day);
  }
  days.sort((a, b) => WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b));
  return {
    count: list.length,
    first: list[0]?.d ?? null,
    last: list[list.length - 1]?.d ?? null,
    weekdays: days,
    draws: list,
  };
}

/** Drawings on `boundary` belong with the later period. */
export function splitAtBoundary(draws, boundary) {
  const before = [];
  const after = [];
  for (const draw of Array.isArray(draws) ? draws : []) {
    if (draw.d < boundary) before.push(draw);
    else after.push(draw);
  }
  return { boundary, before: periodFromDraws(before), after: periodFromDraws(after) };
}

export function describeYearCoverage(data, { referenceDate, archiveFirst } = {}) {
  const ref = referenceDate ? String(referenceDate).slice(0, 10) : null;
  const year = Number(data?.year);
  const refYear = ref ? Number(ref.slice(0, 4)) : null;
  let calendar = "unspecified";
  if (ref && Number.isFinite(year) && Number.isFinite(refYear)) {
    if (year === refYear) calendar = "year-to-date";
    else if (year < refYear) calendar = "past-calendar";
    else calendar = "after-reference";
  }
  const archiveStart = archiveFirst ? String(archiveFirst).slice(0, 10) : null;
  const beginsPartway = Boolean(
    archiveStart &&
      data?.first &&
      data.first === archiveStart &&
      archiveStart.slice(0, 4) === String(data.year) &&
      !archiveStart.endsWith("-01-01"),
  );
  return {
    calendar,
    beginsPartway,
    smallSample: Boolean(data?.count > 0 && data.count < SMALL_SAMPLE_DRAWINGS),
    referenceDate: ref,
  };
}

export function matrixNoteForYear(gameId, year, opts = {}) {
  const y = Number(year);
  if (gameId === "megamillions") {
    if (y < 2017) {
      return "Mega Millions used earlier matrices before the October 31, 2017 revamp; this archive only covers the 5-of-70 era.";
    }
    if (y === 2017) {
      return "Archive coverage begins October 31, 2017 — the first drawing under the 5-of-70 white / 1-of-25 Mega Ball matrix. Earlier 2017 drawings used a different pool and are excluded.";
    }
    if (y >= 2018 && y <= 2024) {
      return "Throughout this year Mega Millions used five white balls from 1–70 and a Mega Ball from 1–25, drawn Tuesday and Friday evenings (ET).";
    }
    if (y === 2025) {
      return "White balls stayed 1–70 all year. April 8, 2025 is the boundary between two Mega Ball pools and ticket prices; the period table separates them.";
    }
    // 2026+
    return "Under the April 2025 rules: five white balls from 1–70 and a Mega Ball from 1–24, drawn Tuesday and Friday (ET). This page covers calendar drawings in this year only.";
  }

  // powerball
  if (y < 2015) {
    return "Powerball used earlier matrices before October 7, 2015; this archive only covers the current 5-of-69 + 1-of-26 era.";
  }
  if (y === 2015) {
    return "Archive coverage begins October 7, 2015 — the first drawing under the current 5-of-69 white / 1-of-26 Powerball matrix. Earlier 2015 drawings are excluded.";
  }
  if (y >= 2016 && y <= 2020) {
    return "Powerball used five white balls from 1–69 and a red Powerball from 1–26, drawn Wednesday and Saturday evenings (ET).";
  }
  if (y === 2021) {
    return "White balls stayed 1–69 and the Powerball stayed 1–26 all year. The period table separates the weekly schedule before and from August 23, 2021.";
  }
  // 2022+
  const partial = opts.isPartial ? " This page covers the calendar year to date." : "";
  return `Powerball used five white balls from 1–69 and a red Powerball from 1–26, drawn Monday, Wednesday and Saturday evenings (ET).${partial}`;
}

/**
 * Compute every year-page statistic from one year's draws.
 * `draws` may be newest-first or oldest-first; dates are sorted internally.
 * Returns null-safe defaults for empty input.
 */
export function analyzeYearDraws(config, draws, year) {
  const list = Array.isArray(draws) ? draws.slice() : [];
  const mainMax = config.mainMax;
  const pick = config.pick || 5;

  if (list.length === 0) {
    return {
      year: String(year),
      draws: [],
      count: 0,
      first: null,
      last: null,
      sumMean: 0,
      sumMin: null,
      sumMax: null,
      hottest: [],
      coldest: [],
      mostFrequent: [],
      leastFrequent: [],
      missing: [],
      topSpecial: null,
      mostFrequentSpecial: [],
      specialRanked: [],
      consecutiveCount: 0,
      consecutiveShare: 0,
      oddEvenDist: [],
      mostCommonOddEven: null,
      allLowCount: 0,
      repeatShare: 0,
      matrixNote: matrixNoteForYear(config.id, year, { isPartial: true }),
      specialPoolMax: config.specialMax,
      isPartial: true,
      isEmpty: true,
    };
  }

  // Chronological for first/last; keep newest-first copy for the results table.
  const byDateAsc = list.slice().sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  const byDateDesc = list.slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));

  const mainCounts = new Array(mainMax + 1).fill(0);
  let specialPoolMax = 0;
  const specialCountsMap = new Map();
  const sums = [];
  let consecutiveCount = 0;
  let allLow = 0;
  const oddDist = new Array(pick + 1).fill(0);
  const lowCut = Math.floor(mainMax / 2);

  for (const draw of byDateDesc) {
    for (const n of draw.n) mainCounts[n] += 1;
    specialCountsMap.set(draw.s, (specialCountsMap.get(draw.s) || 0) + 1);
    if (draw.s > specialPoolMax) specialPoolMax = draw.s;
    const sum = whiteSum(draw);
    sums.push(sum);
    if (hasConsecutivePair(draw.n)) consecutiveCount += 1;
    if (draw.n.every((n) => n <= lowCut)) allLow += 1;
    oddDist[oddCount(draw)] += 1;
  }

  // Repeat-ball share vs the chronologically previous drawing.
  let repeats = 0;
  for (let i = 0; i < byDateAsc.length - 1; i++) {
    const cur = byDateAsc[i];
    const next = byDateAsc[i + 1];
    if (cur.n.some((n) => next.n.includes(n))) repeats += 1;
  }

  const { ranked, hottest, coldest } = rankByFrequency(mainCounts, { from: 1, to: mainMax });
  const mostFrequent = tiedAtMax(hottest);
  const leastFrequent = tiedAtMin(hottest);
  const missing = ranked.filter((x) => x.count === 0).map((x) => x.n);

  const specialRanked = [...specialCountsMap.entries()]
    .map(([n, count]) => ({ n: Number(n), count }))
    .sort((a, b) => b.count - a.count || a.n - b.n);
  const mostFrequentSpecial = tiedAtMax(specialRanked);
  const topSpecial = specialRanked[0] || null;

  let minIdx = 0;
  let maxIdx = 0;
  for (let i = 1; i < sums.length; i++) {
    if (sums[i] < sums[minIdx] || (sums[i] === sums[minIdx] && byDateDesc[i].d < byDateDesc[minIdx].d)) {
      minIdx = i;
    }
    if (sums[i] > sums[maxIdx] || (sums[i] === sums[maxIdx] && byDateDesc[i].d < byDateDesc[maxIdx].d)) {
      maxIdx = i;
    }
  }

  const oddEvenDist = [];
  for (let odd = 0; odd <= pick; odd++) {
    oddEvenDist.push({
      odd,
      even: pick - odd,
      label: `${odd}:${pick - odd}`,
      count: oddDist[odd],
      share: oddDist[odd] / list.length,
    });
  }
  oddEvenDist.sort((a, b) => b.count - a.count || a.odd - b.odd);
  const mostCommonOddEven = oddEvenDist[0];

  const sumMean = sums.reduce((a, b) => a + b, 0) / sums.length;
  // Coverage is not inferred from how many drawings a year has.
  const isPartial = false;

  return {
    year: String(year),
    draws: byDateDesc,
    count: list.length,
    first: byDateAsc[0].d,
    last: byDateAsc[byDateAsc.length - 1].d,
    sumMean,
    sumMin: { value: sums[minIdx], draw: byDateDesc[minIdx] },
    sumMax: { value: sums[maxIdx], draw: byDateDesc[maxIdx] },
    hottest: hottest.slice(0, 5),
    coldest: coldest.filter((x) => x.count === coldest[0].count).slice(0, 12),
    mostFrequent,
    leastFrequent,
    missing,
    topSpecial,
    mostFrequentSpecial,
    specialRanked: specialRanked.slice(0, 8),
    consecutiveCount,
    consecutiveShare: consecutiveCount / list.length,
    oddEvenDist,
    mostCommonOddEven,
    allLowCount: allLow,
    repeatShare: repeats / Math.max(1, list.length - 1),
    matrixNote: matrixNoteForYear(config.id, year, { isPartial }),
    specialPoolMax: Math.max(specialPoolMax, config.specialMax),
    isPartial,
    isEmpty: false,
    mainCounts,
  };
}

/**
 * Group matrix-window draws by calendar year (newest year first).
 */
export function yearlyBreakdown(config, draws) {
  const byYear = new Map();
  for (const draw of draws) {
    const year = draw.d.slice(0, 4);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(draw);
  }
  const years = [];
  for (const [year, list] of [...byYear.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))) {
    years.push(analyzeYearDraws(config, list, year));
  }
  return years;
}

/**
 * Build 3–5 short interpretation paragraphs that change with the year's values.
 * No prediction language; explicitly notes independence and that hot/cold
 * do not improve odds.
 */
function bonusLeaderSentence(config, data) {
  const leaders = data.mostFrequentSpecial?.length
    ? data.mostFrequentSpecial
    : data.topSpecial
      ? [data.topSpecial]
      : [];
  if (!leaders.length) return "";
  if (leaders.length === 1) {
    return `The most frequent ${config.specialName} in ${data.year} was ${leaders[0].n}, drawn ${leaders[0].count} times.`;
  }
  const names = leaders.map((entry) => entry.n).join(", ");
  return `${leaders.length} ${config.specialName}s tied for the lead in ${data.year}: ${names}, each drawn ${leaders[0].count} times.`;
}

export function yearInterpretation(config, data, shape, options = {}) {
  if (!data || data.count === 0) {
    return [
      `No ${config.name} drawings from this calendar year are in the bundled archive yet.`,
      `Each drawing is an independent trial. A frequency tally does not change the odds of a later drawing.`,
    ];
  }

  const paras = [];
  const name = config.name;
  const year = data.year;
  const coverage = describeYearCoverage(data, options);
  const show = (iso) => (iso ? dateLong(String(iso).slice(0, 10)) : "");
  const refLabel = coverage.referenceDate ? show(coverage.referenceDate) : "the snapshot reference date";
  const archiveCount = options.archiveCount ?? shape?.total;
  const archiveSpan =
    options.archiveFirst && options.archiveLast
      ? ` from ${show(options.archiveFirst)} through ${show(options.archiveLast)}`
      : "";

  if (data.count === 1) {
    paras.push(
      `${name} has one bundled drawing in ${year} (${show(data.first)}). One row cannot support a frequency ranking. It is a record of that drawing, not a forecast.`,
    );
  } else if (coverage.calendar === "year-to-date") {
    paras.push(
      `${year} is year-to-date coverage in this snapshot. The reference date is ${refLabel}. These ${data.count} ${name} drawings run from ${show(data.first)} through ${show(data.last)}. Drawings later in ${year} are outside this snapshot.`,
    );
  } else if (coverage.calendar === "past-calendar") {
    paras.push(
      `${year} is a past calendar year relative to the snapshot reference date ${refLabel}. This page describes the ${data.count} bundled ${name} drawings from ${show(data.first)} through ${show(data.last)}. That span is what the archive holds. It is not a claim that every official drawing of the year was captured.`,
    );
  } else if (coverage.calendar === "after-reference") {
    paras.push(
      `${year} is after the snapshot reference date ${refLabel}. These ${data.count} bundled drawings run from ${show(data.first)} through ${show(data.last)}.`,
    );
  } else {
    paras.push(
      `This page describes ${data.count} bundled ${name} drawings in ${year}, from ${show(data.first)} through ${show(data.last)}.`,
    );
  }

  if (coverage.beginsPartway) {
    paras.push(
      `The bundled archive begins on ${show(data.first)}, partway through ${year}. Earlier ${year} drawings used a different ball pool and are not in this count.`,
    );
  }
  if (coverage.smallSample && data.count > 1) {
    paras.push(
      `Separately from that calendar coverage, ${data.count} drawings is a small sample. A leading ball in a sample this size can sit far from its count in a longer record. Sample size is not a measure of how much of the calendar the archive covers.`,
    );
  }

  if (shape && Number.isFinite(shape.sumMean) && archiveCount && data.count > 1) {
    const sumDiff = data.sumMean - shape.sumMean;
    const direction =
      Math.abs(sumDiff) < 1.5
        ? "within 1.5 points of"
        : sumDiff > 0
          ? `${Math.abs(sumDiff).toFixed(1)} points above`
          : `${Math.abs(sumDiff).toFixed(1)} points below`;
    paras.push(
      `The five white balls in these ${year} drawings averaged ${data.sumMean.toFixed(1)}. The observed average across the bundled archive of ${archiveCount} drawings${archiveSpan} is ${shape.sumMean.toFixed(1)}. The ${year} average is ${direction} that observed archive average. The archive average is the mean of those recorded drawings, not a theoretical mean of the ball matrix.`,
    );
  } else if (data.count > 1 && data.sumMin && data.sumMax) {
    paras.push(
      `The five white balls in these ${year} drawings averaged ${data.sumMean.toFixed(1)}, with individual sums from ${data.sumMin.value} to ${data.sumMax.value}.`,
    );
  }

  const hot = data.mostFrequent;
  const hotLead = hot?.[0];
  const expected = (data.count * (config.pick || 5)) / config.mainMax;
  if (data.count >= 2 && hotLead) {
    const tieNote =
      hot.length > 1
        ? `${hot.length} white balls tied at ${hotLead.count} appearances (${hot.map((entry) => entry.n).join(", ")}).`
        : `White ball ${hotLead.n} led with ${hotLead.count} appearances (${((hotLead.count / data.count) * 100).toFixed(1)}% of these drawings).`;
    const coldBit =
      data.missing.length > 0
        ? ` ${data.missing.length} numbers from 1–${config.mainMax} did not appear in these drawings.`
        : data.leastFrequent?.length
          ? ` The lowest count was ${data.leastFrequent[0].count}, shared by ${data.leastFrequent.length === 1 ? `number ${data.leastFrequent[0].n}` : `${data.leastFrequent.length} numbers`}.`
          : "";
    paras.push(
      `A uniform mathematical expectation for one specified white ball in this year's record is about ${expected.toFixed(1)} appearances (${data.count} × ${config.pick || 5} / ${config.mainMax}). That expectation is not the observed archive average. ${tieNote}${coldBit} The tally describes these drawings only and does not change the odds of a later drawing.`,
    );
  }

  const mode = data.mostCommonOddEven;
  if (mode && data.count >= 2 && shape && Number.isFinite(shape.consecutiveRate) && archiveCount) {
    const consecPct = (data.consecutiveShare * 100).toFixed(1);
    const archiveConsec = (shape.consecutiveRate * 100).toFixed(1);
    paras.push(
      `The most common odd/even split in ${year} was ${mode.odd} odd / ${mode.even} even, in ${mode.count} drawings (${(mode.share * 100).toFixed(1)}%). Consecutive white-ball pairs appeared in ${data.consecutiveCount} of ${data.count} drawings (${consecPct}%). The observed rate in the bundled archive of ${archiveCount} drawings is ${archiveConsec}%. These are counts, not a test of whether the difference is ordinary.`,
    );
  }

  const bonus = bonusLeaderSentence(config, data);
  paras.push(
    `${bonus ? `${bonus} ` : ""}Each ${name} drawing is an independent trial. Hot, cold, and overdue labels summarize records; they do not change the odds on the next ticket. Verify any real ticket with your state lottery.`,
  );

  return paras;
}

/** Format a list of ball numbers for prose. */
export function formatBallList(entries, limit = 8) {
  const slice = entries.slice(0, limit);
  const body = slice.map((x) => (typeof x === "number" ? String(x) : String(x.n))).join(", ");
  if (entries.length > limit) return `${body}, and ${entries.length - limit} more`;
  return body;
}
