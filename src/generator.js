/* Probability-weighted number generation with historical pattern matching. */
window.LOTTO = window.LOTTO || {};
(function (APP) {
  "use strict";

  const { lowMax } = APP.data;
  const { sampleDist, groupOf, quantile } = APP.stats;

  const PRESETS = {
    balanced: { freq: 0.6, gap: 0.5, momentum: 0.45, pair: 0.4 },
    pure: { freq: 0, gap: 0, momentum: 0, pair: 0 },
    hot: { freq: 1.0, gap: -0.6, momentum: 1.2, pair: 0.5 },
    cold: { freq: -0.9, gap: 1.2, momentum: -0.7, pair: 0.3 },
    max: { freq: 1.2, gap: 1.0, momentum: 0.9, pair: 0.9 },
  };

  const DEFAULTS = {
    games: 5,
    weights: { ...PRESETS.balanced },
    matchPatterns: true,
    avoidPastWinners: true,
    maxOverlap: 3,
  };

  function clamp(value, lo, hi) {
    return Math.min(hi, Math.max(lo, value));
  }

  /** Blend the statistical signals into one sampling weight per ball. */
  function buildWeights(ballStats, weights) {
    const w = new Float64Array(ballStats.max + 1);
    for (const info of ballStats.numbers) {
      const freq = clamp(info.ratio, 0.4, 2.5);
      const overdue = clamp(info.gap / info.expectedGap, 0.25, 4);
      const momentum = clamp(info.momentum, 0.3, 3);
      const logWeight =
        weights.freq * Math.log(freq) +
        weights.gap * Math.log(overdue) +
        weights.momentum * Math.log(momentum);
      w[info.n] = Math.exp(clamp(logWeight, -3, 3));
    }
    return w;
  }

  function weightedPick(weights, rng) {
    let total = 0;
    for (let i = 1; i < weights.length; i++) total += weights[i];
    if (total <= 0) return -1;
    let r = rng() * total;
    for (let i = 1; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0 && weights[i] > 0) return i;
    }
    for (let i = weights.length - 1; i >= 1; i--) if (weights[i] > 0) return i;
    return -1;
  }

  function shuffle(list, rng) {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  }

  /**
   * Draw the main numbers with pair-affinity nudging. When `composition` is
   * given, exactly that many balls come from each odd/even x low/high group,
   * so the odd:even and low:high splits land on the historical target exactly.
   */
  function drawMain(config, baseWeights, pairs, pairExponent, rng, composition) {
    const available = baseWeights.slice();
    const picked = [];
    const effective = new Float64Array(available.length);
    const plan = composition
      ? shuffle(
          composition.flatMap((count, group) => new Array(count).fill(group)),
          rng,
        )
      : new Array(config.pick).fill(-1);

    for (const group of plan) {
      for (let n = 1; n < available.length; n++) {
        let weight = group < 0 || groupOf(config, n) === group ? available[n] : 0;
        if (weight > 0 && pairExponent > 0 && picked.length) {
          let logSum = 0;
          for (const p of picked) logSum += Math.log(pairs.ratio(p, n));
          weight *= Math.exp(clamp((pairExponent * logSum) / picked.length, -1.5, 1.5));
        }
        effective[n] = weight;
      }
      const chosen = weightedPick(effective, rng);
      if (chosen < 0) break;
      picked.push(chosen);
      available[chosen] = 0;
    }

    return picked.sort((a, b) => a - b);
  }

  function measure(config, numbers) {
    const half = lowMax(config);
    let sum = 0;
    let odd = 0;
    let low = 0;
    let consecutive = 0;
    const buckets = new Set();
    for (let i = 0; i < numbers.length; i++) {
      sum += numbers[i];
      if (numbers[i] % 2 === 1) odd++;
      if (numbers[i] <= half) low++;
      buckets.add(Math.floor((numbers[i] - 1) / 10));
      if (i > 0 && numbers[i] - numbers[i - 1] === 1) consecutive++;
    }
    return {
      sum,
      odd,
      even: numbers.length - odd,
      low,
      high: numbers.length - low,
      buckets: buckets.size,
      consecutive,
      spread: numbers[numbers.length - 1] - numbers[0],
    };
  }

  function densityScore(dist, index) {
    let max = 0;
    for (const v of dist) max = Math.max(max, v);
    if (max <= 0) return 1;
    return clamp((dist[index] || 0) / max, 0.02, 1);
  }

  /** 0-100: how typical this combination looks next to real drawings. */
  function patternScore(stats, m) {
    const parts = [
      clamp(stats.structure.sums.density(m.sum), 0.02, 1),
      densityScore(stats.structure.oddDist, m.odd),
      densityScore(stats.structure.lowDist, m.low),
      densityScore(stats.structure.bucketDist, m.buckets),
      densityScore(stats.structure.consecDist, m.consecutive),
    ];
    const logMean = parts.reduce((a, b) => a + Math.log(b), 0) / parts.length;
    return Math.round(100 * Math.exp(logMean));
  }

  function overlapWith(numbers, others) {
    let worst = 0;
    for (const other of others) {
      let shared = 0;
      for (const n of numbers) if (other.includes(n)) shared++;
      worst = Math.max(worst, shared);
    }
    return worst;
  }

  function expand(dist) {
    const values = [];
    dist.forEach((count, value) => {
      for (let i = 0; i < count; i++) values.push(value);
    });
    return values.sort((a, b) => a - b);
  }

  function buildTargets(stats, rng) {
    const s = stats.structure;
    const pick = stats.config.pick;

    // Draw a real historical odd/even x low/high composition, e.g. "2 odd-low,
    // 1 even-low, 1 odd-high, 1 even-high".
    const index = sampleDist(s.compositions.weights, rng);
    const composition = s.compositions.keys[index] || [1, 1, 1, 2];
    const low = composition[0] + composition[1];
    const band =
      s.sumBandByLow[low] || { min: Math.round(s.sums.q(0.1)), max: Math.round(s.sums.q(0.9)) };

    return {
      composition,
      odd: composition[0] + composition[2],
      low,
      pick,
      sumMin: band.min,
      sumMax: band.max,
      minBuckets: Math.max(2, Math.round(quantile(expand(s.bucketDist), 0.08))),
      maxConsecutive: Math.max(1, Math.round(quantile(expand(s.consecDist), 0.97))),
    };
  }

  function passes(m, targets, tier) {
    if (tier >= 2) return true;
    if (m.sum < targets.sumMin || m.sum > targets.sumMax) return false;
    if (tier >= 1) return true;
    if (m.buckets < targets.minBuckets) return false;
    if (m.consecutive > targets.maxConsecutive) return false;
    return true;
  }

  function generate(stats, options = {}) {
    const opts = {
      ...DEFAULTS,
      ...options,
      weights: { ...DEFAULTS.weights, ...(options.weights || {}) },
    };
    const config = stats.config;
    const rng = opts.rng || Math.random;
    const mainWeights = buildWeights(stats.main, opts.weights);
    const specialWeights = buildWeights(stats.special, opts.weights);
    const historySets = opts.historySets || stats.structure.drawnSets;
    const usedKeys = new Set();
    const previous = [];
    const games = [];

    for (let g = 0; g < opts.games; g++) {
      const targets = opts.matchPatterns ? buildTargets(stats, rng) : null;
      let best = null;
      let tier = 0;
      let attempts = 0;
      const limits = [300, 150, 100, 40];

      outer: for (tier = 0; tier < limits.length; tier++) {
        for (let i = 0; i < limits[tier]; i++) {
          attempts++;
          const numbers = drawMain(
            config,
            mainWeights,
            stats.structure.pairs,
            opts.weights.pair,
            rng,
            targets && targets.composition,
          );
          if (numbers.length !== config.pick) continue;
          const key = numbers.join("-");
          if (usedKeys.has(key)) continue;
          if (opts.avoidPastWinners && historySets.has(key) && tier < 3) continue;
          if (overlapWith(numbers, previous) > opts.maxOverlap && tier < 3) continue;

          const m = measure(config, numbers);
          if (targets && !passes(m, targets, tier)) continue;

          best = { numbers, key, measures: m };
          break outer;
        }
      }

      if (!best) {
        const numbers = drawMain(config, mainWeights, stats.structure.pairs, 0, rng);
        best = { numbers, key: numbers.join("-"), measures: measure(config, numbers) };
      }

      const special = weightedPick(specialWeights, rng);
      usedKeys.add(best.key);
      previous.push(best.numbers);

      games.push({
        index: g + 1,
        numbers: best.numbers,
        special: special > 0 ? special : 1 + Math.floor(rng() * config.specialMax),
        measures: best.measures,
        score: patternScore(stats, best.measures),
        targets,
        relaxedTier: tier,
        attempts,
        details: best.numbers.map((n) => stats.main.byNumber(n)),
        specialDetail: special > 0 ? stats.special.byNumber(special) : null,
      });
    }

    return {
      games,
      weights: opts.weights,
      createdAt: new Date(),
      profile: { windowCount: stats.windowCount, structureCount: stats.structureCount },
    };
  }

  APP.generator = { generate, PRESETS, DEFAULTS, measure, patternScore, buildWeights };
})(window.LOTTO);
