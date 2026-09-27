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
      return "White balls stayed 1–70 all year. On April 8, 2025 the Mega Ball pool shrank from 25 to 24 and the ticket price rose to $5 with a built-in multiplier — so Mega Ball 25 only appears in drawings before that date.";
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
    return "White and red pools stayed 1–69 / 1–26. Powerball added Monday drawings on August 23, 2021, so the year's count sits between the old two-a-week and the later three-a-week pace.";
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
  const yNum = Number(year);
  const isPartial =
    list.length < 90 ||
    (config.id === "megamillions" && yNum === 2017) ||
    (config.id === "powerball" && yNum === 2015);

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
export function yearInterpretation(config, data, shape) {
  if (!data || data.count === 0) {
    return [
      `No ${config.name} drawings from this calendar year are in the bundled archive yet.`,
      `Lottery drawings are independent random events. Past frequency — hot, cold, or overdue — does not change the odds of the next drawing.`,
    ];
  }

  const paras = [];
  const name = config.name;
  const year = data.year;
  const baseline = shape.sumMean;
  const sumDiff = data.sumMean - baseline;
  const absDiff = Math.abs(sumDiff);
  const consecPct = (data.consecutiveShare * 100).toFixed(1);
  const baselineConsec = (shape.consecutiveRate * 100).toFixed(1);
  const mode = data.mostCommonOddEven;
  const hot = data.mostFrequent;
  const hotLead = hot[0];
  const expected = (data.count * (config.pick || 5)) / config.mainMax;

  // 1) Opening frame — draw count / partial / schedule
  if (data.count === 1) {
    paras.push(
      `${name} has a single archived drawing in ${year} (${data.first}). One draw cannot support a frequency ranking; the table below is still a convenience copy of that result. It is historical description, not a forecast.`,
    );
  } else if (data.isPartial && Number(year) === Number(String(data.first).slice(0, 4)) && data.count < 40) {
    paras.push(
      `${year} is a short archive year for ${name}: ${data.count} drawings from ${data.first} through ${data.last}. Small samples swing hard — a number can lead the board after a handful of appearances and then vanish from the next year's ranking. Treat every figure on this page as a description of what already happened.`,
    );
  } else if (data.isPartial) {
    paras.push(
      `${year} is still in progress in this archive: ${data.count} ${name} drawings so far, from ${data.first} to ${data.last}. Mid-year totals move as new results land; nothing here is a projection of how the year will finish.`,
    );
  } else if (absDiff >= 6) {
    paras.push(
      `${name} ran ${data.count} drawings in ${year}. The five white balls averaged ${data.sumMean.toFixed(1)} — ${sumDiff > 0 ? "well above" : "well below"} this matrix's long-run mean of ${baseline.toFixed(1)}. A year-long tilt that large still sits inside ordinary sampling noise for a fair drum; it is not evidence the machine "favored" high or low totals.`,
    );
  } else if (absDiff >= 1.5) {
    paras.push(
      `${name} held ${data.count} drawings in ${year}, and the white-ball sum averaged ${data.sumMean.toFixed(1)}, ${sumDiff > 0 ? "a little above" : "a little below"} the long-run matrix average of ${baseline.toFixed(1)}. Year-to-year wiggles of a few points are the normal footprint of independent draws, not a signal to chase.`,
    );
  } else {
    paras.push(
      `${name} completed ${data.count} drawings in ${year} with a white-ball average of ${data.sumMean.toFixed(1)} — almost exactly the long-run matrix mean of ${baseline.toFixed(1)}. Even when a year lands on the average, individual drawings still swing from the low ${data.sumMin.value}s to the high ${data.sumMax.value}s.`,
    );
  }

  // 2) Frequency / hot-cold
  if (data.count >= 2 && hotLead) {
    const tieNote =
      hot.length > 1
        ? ` ${hot.length} white balls tied at ${hotLead.count} appearances (${hot.map((x) => x.n).join(", ")}).`
        : ` White ball ${hotLead.n} led with ${hotLead.count} appearances (${((hotLead.count / data.count) * 100).toFixed(1)}% of drawings).`;
    const coldBit =
      data.missing.length > 0
        ? ` ${data.missing.length} numbers from 1–${config.mainMax} never appeared at all in ${year}.`
        : data.leastFrequent.length
          ? ` The quietest count was ${data.leastFrequent[0].count}, shared by ${data.leastFrequent.length === 1 ? `number ${data.leastFrequent[0].n}` : `${data.leastFrequent.length} numbers`}.`
          : "";
    if (hotLead.count >= expected * 1.6 && data.count >= 50) {
      paras.push(
        `Against a fair-share baseline of about ${expected.toFixed(1)} hits per number, ${year}'s leader board looks busy.${tieNote}${coldBit} Leaders reshuffle every year when you re-rank the same matrix — which is what you expect when each drawing is an independent event, not a memory of the last one.`,
      );
    } else if (data.missing.length > 8) {
      paras.push(
        `With only ${data.count} drawings, many of the ${config.mainMax} white balls never showed up.${tieNote}${coldBit} Gaps that large are normal in a short window; they are not "due" numbers for the next drawing.`,
      );
    } else {
      paras.push(
        `Frequency for ${year} is just a tally of past hits.${tieNote}${coldBit} A hot or cold label describes the finished year only — it does not improve or worsen that number's odds going forward.`,
      );
    }
  }

  // 3) Odd/even + consecutive
  if (mode && data.count >= 2) {
    const consecVs = data.consecutiveShare - shape.consecutiveRate;
    let consecClause;
    if (Math.abs(consecVs) < 0.03) {
      consecClause = `Drawings with at least one consecutive white-ball pair landed ${consecPct}% of the time, in line with the matrix-wide ${baselineConsec}%.`;
    } else if (consecVs > 0) {
      consecClause = `Consecutive pairs showed up in ${data.consecutiveCount} drawings (${consecPct}%), a bit above the matrix-wide ${baselineConsec}%.`;
    } else {
      consecClause = `Consecutive pairs showed up in ${data.consecutiveCount} drawings (${consecPct}%), a bit under the matrix-wide ${baselineConsec}%.`;
    }
    paras.push(
      `The most common odd/even split was ${mode.odd} odd / ${mode.even} even — ${mode.count} drawings (${(mode.share * 100).toFixed(1)}%). ${consecClause} Neither pattern is a playbook; both are side effects of how combinations are counted, and each new draw resets the slate.`,
    );
  }

  // 4) Independence / anti-prediction (always, wording varies)
  if (data.topSpecial && data.count >= 10) {
    paras.push(
      `The most frequent ${config.specialName} in ${year} was ${data.topSpecial.n} (${data.topSpecial.count}×). Bonus-ball streaks look meaningful on a year page and still carry no edge: the next drawing does not owe anyone a repeat or a make-up hit. This archive is for looking back — verify any ticket with your state lottery, and never treat hot, cold, or overdue lists as a way to beat the odds.`,
    );
  } else {
    paras.push(
      `Every ${name} drawing is an independent random event. Hot, cold, and overdue labels summarize history; they do not grant better odds on the next ticket. Use this page to inspect what ${year} actually produced, then confirm any claim with the official state lottery record.`,
    );
  }

  // Cap at 5
  return paras.slice(0, 5);
}

/** Format a list of ball numbers for prose. */
export function formatBallList(entries, limit = 8) {
  const slice = entries.slice(0, limit);
  const body = slice.map((x) => (typeof x === "number" ? String(x) : String(x.n))).join(", ");
  if (entries.length > limit) return `${body}, and ${entries.length - limit} more`;
  return body;
}
