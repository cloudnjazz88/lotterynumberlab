/* Statistical analysis of a game's drawing history. */
window.LOTTO = window.LOTTO || {};
(function (APP) {
  "use strict";

  const { specialMaxOn, lowMax } = APP.data;

  // Strength of the "every ball is equally likely" prior, expressed in drawings.
  // It keeps short windows from producing wild frequency ratios.
  const PRIOR_DRAWS = 25;
  const PRIOR_PAIRS = 10;
  const MOMENTUM_WINDOW = 60;
  const SUM_BIN = 15;
  const STRUCTURE_MIN_SAMPLE = 250;

  function quantile(sorted, q) {
    if (!sorted.length) return 0;
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function ballStats(config, draws, kind) {
    const isMain = kind === "main";
    const max = isMain ? config.mainMax : config.specialMax;
    const perDraw = isMain ? config.pick : 1;

    const count = new Float64Array(max + 1);
    const eligible = new Float64Array(max + 1);
    const expSum = new Float64Array(max + 1);
    const recentCount = new Float64Array(max + 1);
    const recentEligible = new Float64Array(max + 1);
    const recentExpSum = new Float64Array(max + 1);
    const gap = new Float64Array(max + 1).fill(Infinity);
    const lastDate = new Array(max + 1).fill(null);

    draws.forEach((draw, index) => {
      const poolSize = isMain ? config.mainMax : specialMaxOn(config, draw.d);
      const rate = perDraw / poolSize;
      const isRecent = index < MOMENTUM_WINDOW;
      const top = Math.min(max, poolSize);

      for (let n = 1; n <= top; n++) {
        eligible[n] += 1;
        expSum[n] += rate;
        if (isRecent) {
          recentEligible[n] += 1;
          recentExpSum[n] += rate;
        }
      }

      const balls = isMain ? draw.n : [draw.s];
      for (const ball of balls) {
        if (ball < 1 || ball > max) continue;
        count[ball] += 1;
        if (isRecent) recentCount[ball] += 1;
        if (gap[ball] === Infinity) {
          gap[ball] = index + 1;
          lastDate[ball] = draw.d;
        }
      }
    });

    const numbers = [];
    for (let n = 1; n <= max; n++) {
      const elig = eligible[n];
      const expRate = elig > 0 ? expSum[n] / elig : perDraw / max;
      const smoothed = (count[n] + PRIOR_DRAWS * expRate) / (elig + PRIOR_DRAWS);
      const recentExpRate =
        recentEligible[n] > 0 ? recentExpSum[n] / recentEligible[n] : perDraw / max;
      const recentSmoothed = (recentCount[n] + 8 * recentExpRate) / (recentEligible[n] + 8);

      numbers.push({
        n,
        count: count[n],
        eligible: elig,
        expected: expRate * elig,
        ratio: expRate > 0 ? smoothed / expRate : 1,
        rawRatio: elig > 0 && expRate > 0 ? count[n] / elig / expRate : 1,
        recentCount: recentCount[n],
        momentum: recentExpRate > 0 ? recentSmoothed / recentExpRate : 1,
        gap: Number.isFinite(gap[n]) ? gap[n] : draws.length + 1,
        lastDate: lastDate[n],
        expectedGap: max / perDraw,
      });
    }

    return { max, perDraw, numbers, byNumber: (n) => numbers[n - 1] };
  }

  /**
   * Which of the four odd/even x low/high groups a ball belongs to.
   * 0: odd-low, 1: even-low, 2: odd-high, 3: even-high
   */
  function groupOf(config, n) {
    return (n % 2 === 1 ? 0 : 1) + (n <= lowMax(config) ? 0 : 2);
  }

  function structureStats(config, draws) {
    const pick = config.pick;
    const sums = [];
    const oddDist = new Float64Array(pick + 1);
    const lowDist = new Float64Array(pick + 1);
    const bucketDist = new Float64Array(pick + 1);
    const consecDist = new Float64Array(pick);
    const pairCount = new Float64Array((config.mainMax + 1) * (config.mainMax + 1));
    const drawnSets = new Set();
    const compositions = new Map();
    const sumsByLow = Array.from({ length: pick + 1 }, () => []);
    const half = lowMax(config);
    let repeatFromPrevious = 0;

    draws.forEach((draw, index) => {
      const n = draw.n;
      let sum = 0;
      let odd = 0;
      let low = 0;
      let consec = 0;
      const buckets = new Set();
      const groups = [0, 0, 0, 0];

      for (let i = 0; i < n.length; i++) {
        sum += n[i];
        groups[groupOf(config, n[i])] += 1;
        if (n[i] % 2 === 1) odd++;
        if (n[i] <= half) low++;
        buckets.add(Math.floor((n[i] - 1) / 10));
        if (i > 0 && n[i] - n[i - 1] === 1) consec++;
        for (let j = i + 1; j < n.length; j++) {
          pairCount[n[i] * (config.mainMax + 1) + n[j]] += 1;
          pairCount[n[j] * (config.mainMax + 1) + n[i]] += 1;
        }
      }

      sums.push(sum);
      oddDist[odd] += 1;
      lowDist[low] += 1;
      bucketDist[buckets.size] += 1;
      consecDist[Math.min(consec, pick - 1)] += 1;
      drawnSets.add(n.join("-"));
      sumsByLow[low].push(sum);
      const compKey = groups.join(",");
      compositions.set(compKey, (compositions.get(compKey) || 0) + 1);

      const prev = draws[index + 1];
      if (prev && n.some((x) => prev.n.includes(x))) repeatFromPrevious += 1;
    });

    const total = Math.max(1, draws.length);
    const sortedSums = sums.slice().sort((a, b) => a - b);
    const mean = sums.reduce((a, b) => a + b, 0) / total;
    const variance = sums.reduce((a, b) => a + (b - mean) ** 2, 0) / total;

    const binCount = Math.ceil((config.mainMax * pick) / SUM_BIN) + 1;
    const sumHist = new Float64Array(binCount);
    for (const s of sums) sumHist[Math.min(binCount - 1, Math.floor(s / SUM_BIN))] += 1;
    const sumHistMax = Math.max(1, ...sumHist);

    const compKeys = [...compositions.keys()].map((key) => key.split(",").map(Number));
    const compWeights = Float64Array.from(compositions.values());

    // Sum band per low/high split: an all-low draw legitimately sums below the
    // overall 10th percentile, so the band has to be conditional.
    const globalLo = quantile(sortedSums, 0.1);
    const globalHi = quantile(sortedSums, 0.9);
    const sumBandByLow = sumsByLow.map((values) => {
      if (values.length < 25) {
        return { min: Math.round(globalLo - 25), max: Math.round(globalHi + 25) };
      }
      const sorted = values.slice().sort((a, b) => a - b);
      return { min: Math.round(quantile(sorted, 0.1)), max: Math.round(quantile(sorted, 0.9)) };
    });

    const pairExpected = (total * (pick * (pick - 1))) / (config.mainMax * (config.mainMax - 1));

    return {
      total,
      compositions: { keys: compKeys, weights: compWeights },
      sumBandByLow,
      sums: {
        sorted: sortedSums,
        mean,
        sd: Math.sqrt(variance),
        min: sortedSums[0] ?? 0,
        max: sortedSums[sortedSums.length - 1] ?? 0,
        q: (p) => quantile(sortedSums, p),
        hist: sumHist,
        histMax: sumHistMax,
        bin: SUM_BIN,
        density: (s) => sumHist[Math.min(binCount - 1, Math.floor(s / SUM_BIN))] / sumHistMax,
      },
      oddDist,
      lowDist,
      bucketDist,
      consecDist,
      repeatRate: repeatFromPrevious / total,
      pairs: {
        count: pairCount,
        expected: pairExpected,
        ratio(a, b) {
          const c = pairCount[a * (config.mainMax + 1) + b];
          return (c + PRIOR_PAIRS) / (pairExpected + PRIOR_PAIRS);
        },
      },
      drawnSets,
    };
  }

  /** Sample an index from a raw count distribution. */
  function sampleDist(dist, rng = Math.random) {
    let total = 0;
    for (const v of dist) total += v;
    if (total <= 0) return 0;
    let r = rng() * total;
    for (let i = 0; i < dist.length; i++) {
      r -= dist[i];
      if (r <= 0) return i;
    }
    return dist.length - 1;
  }

  function modeOf(dist) {
    let best = 0;
    for (let i = 1; i < dist.length; i++) if (dist[i] > dist[best]) best = i;
    return best;
  }

  /**
   * @param config     game definition
   * @param windowDraws drawings inside the selected window (newest first)
   * @param allDraws    the game's full history, a fallback for pattern stats
   */
  function analyze(config, windowDraws, allDraws) {
    let structureSource = windowDraws;
    let structureFallback = false;
    if (windowDraws.length < STRUCTURE_MIN_SAMPLE && allDraws.length > windowDraws.length) {
      structureSource = allDraws;
      structureFallback = true;
    }

    const main = ballStats(config, windowDraws, "main");
    const special = ballStats(config, windowDraws, "special");
    const structure = structureStats(config, structureSource);
    const ranked = main.numbers.slice();

    return {
      config,
      windowCount: windowDraws.length,
      from: windowDraws.length ? windowDraws[windowDraws.length - 1].d : null,
      to: windowDraws.length ? windowDraws[0].d : null,
      structureCount: structureSource.length,
      structureFallback,
      main,
      special,
      structure,
      latest: windowDraws[0] || null,
      hottest: ranked.slice().sort((a, b) => b.rawRatio - a.rawRatio).slice(0, 6),
      coldest: ranked.slice().sort((a, b) => a.rawRatio - b.rawRatio).slice(0, 6),
      overdue: ranked.slice().sort((a, b) => b.gap - a.gap).slice(0, 6),
      trending: ranked.slice().sort((a, b) => b.momentum - a.momentum).slice(0, 6),
    };
  }

  APP.stats = { analyze, quantile, sampleDist, modeOf, groupOf, MOMENTUM_WINDOW };
})(window.LOTTO);
