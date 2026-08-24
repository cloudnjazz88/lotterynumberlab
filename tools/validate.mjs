/**
 * Sanity + distribution checks for the statistics and generator modules,
 * run over every game and every analysis window.
 *
 * Run: node tools/validate.mjs
 */

import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const read = (p) => readFileSync(new URL(p, root), "utf8");

const sandbox = { window: {}, console, Intl, Date, Math, JSON, fetch };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const file of ["data/draws.js", "src/data.js", "src/stats.js", "src/generator.js"]) {
  vm.runInContext(read(file), sandbox, { filename: file });
}
const APP = sandbox.window.LOTTO;

const failures = [];
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
  if (!ok) failures.push(label);
};

const snapshot = APP.data.loadBundled();
const ROUNDS = 300;

for (const config of APP.data.GAMES) {
  const history = snapshot.games[config.id];
  const historySets = new Set(history.draws.map((d) => d.n.join("-")));

  console.log(`\n${"=".repeat(72)}`);
  console.log(
    `${config.name}: ${history.count} drawings, ${history.firstDraw} .. ${history.latestDraw}` +
      `  (${config.matrixLabel})`,
  );
  console.log(
    "next drawing:",
    APP.data.nextDrawing(config, new Date("2026-08-24T18:00:00Z")).toISOString(),
  );

  check(
    `${config.id}: history starts at the matrix change`,
    history.firstDraw === config.matrixSince,
    history.firstDraw,
  );
  check(
    `${config.id}: white balls stay inside 1-${config.mainMax}`,
    Math.max(...history.draws.flatMap((d) => d.n)) <= config.mainMax,
  );

  // The declared schedule drives the "next drawing" clock, so the feed's own
  // weekdays have to agree with it.
  const weekdays = new Set(
    history.draws
      .slice(0, 90)
      .map((d) => new Date(`${d.d}T12:00:00Z`).getUTCDay()),
  );
  check(
    `${config.id}: recent drawings fall on the declared days`,
    [...weekdays].every((day) => config.drawDays.includes(day)),
    `feed=${[...weekdays].sort().join(",")} config=${config.drawDays.join(",")}`,
  );

  const latestSpecial = Math.max(
    ...history.draws
      .filter((d) => d.d >= config.specialEras[config.specialEras.length - 1].from)
      .map((d) => d.s),
  );
  check(
    `${config.id}: bonus balls above ${config.specialMax} never appear under current rules`,
    latestSpecial <= config.specialMax,
    `max=${latestSpecial}`,
  );

  for (const win of config.windows) {
    const { draws } = APP.data.selectWindow(config, history.draws, win.id);
    const stats = APP.stats.analyze(config, draws, history.draws);
    console.log(
      `\n[${win.id}] window=${draws.length} shape-sample=${stats.structureCount}` +
        (stats.structureFallback ? " (fallback)" : "") +
        ` sumMean=${stats.structure.sums.mean.toFixed(1)}` +
        ` q10=${stats.structure.sums.q(0.1).toFixed(0)}` +
        ` q90=${stats.structure.sums.q(0.9).toFixed(0)}` +
        ` compositions=${stats.structure.compositions.keys.length}`,
    );
    const meanRatio =
      stats.main.numbers.reduce((a, b) => a + b.ratio, 0) / stats.main.numbers.length;
    check(`${config.id}/${win.id}: ratios centred on 1`, Math.abs(meanRatio - 1) < 0.05,
      `mean=${meanRatio.toFixed(3)}`);
    check(
      `${config.id}/${win.id}: bonus pool is 1-${config.specialMax}`,
      stats.special.numbers.length === config.specialMax,
    );
  }

  const { draws } = APP.data.selectWindow(config, history.draws, config.windows[0].id);
  const stats = APP.stats.analyze(config, draws, history.draws);
  const st = stats.structure;

  console.log("\nodd/even split:", Array.from(st.oddDist, (v) => (v / st.total).toFixed(3)).join(" "));
  console.log("low/high split:", Array.from(st.lowDist, (v) => (v / st.total).toFixed(3)).join(" "));
  console.log("decade spread :", Array.from(st.bucketDist, (v) => (v / st.total).toFixed(3)).join(" "));
  console.log("consecutive   :", Array.from(st.consecDist, (v) => (v / st.total).toFixed(3)).join(" "));
  console.log("repeat rate   :", st.repeatRate.toFixed(3));
  console.log("hottest:", stats.hottest.map((x) => `${x.n}(${x.count})`).join(" "));
  console.log("coldest:", stats.coldest.map((x) => `${x.n}(${x.count})`).join(" "));
  console.log("overdue:", stats.overdue.map((x) => `${x.n}(${x.gap})`).join(" "));

  const sample = APP.generator.generate(stats, { historySets });
  console.log("\nsample batch:");
  for (const g of sample.games) {
    console.log(
      `  #${g.index} ${g.numbers.map((n) => String(n).padStart(2, "0")).join(" ")}` +
        ` + ${config.specialAbbr} ${String(g.special).padStart(2, "0")}` +
        ` | sum=${g.measures.sum} odd=${g.measures.odd}:${g.measures.even}` +
        ` low=${g.measures.low}:${g.measures.high} decades=${g.measures.buckets}` +
        ` consec=${g.measures.consecutive} score=${g.score} tier=${g.relaxedTier}`,
    );
  }

  function simulate(options, rounds) {
    const mainHits = new Array(config.mainMax + 1).fill(0);
    const specialHits = new Array(config.specialMax + 1).fill(0);
    const sums = [];
    const odd = new Array(config.pick + 1).fill(0);
    const low = new Array(config.pick + 1).fill(0);
    const tiers = [0, 0, 0, 0, 0];
    let bad = 0;
    let pastWinners = 0;
    let games = 0;
    let attempts = 0;

    for (let r = 0; r < rounds; r++) {
      const out = APP.generator.generate(stats, { ...options, historySets });
      const seen = new Set();
      for (const g of out.games) {
        games++;
        attempts += g.attempts;
        tiers[Math.min(4, g.relaxedTier)]++;
        const key = g.numbers.join("-");
        if (new Set(g.numbers).size !== config.pick) bad++;
        if (g.numbers.some((n) => n < 1 || n > config.mainMax)) bad++;
        if (g.numbers.some((n, i) => i > 0 && n <= g.numbers[i - 1])) bad++;
        if (g.special < 1 || g.special > config.specialMax) bad++;
        if (seen.has(key)) bad++;
        seen.add(key);
        if (historySets.has(key)) pastWinners++;
        for (const n of g.numbers) mainHits[n]++;
        specialHits[g.special]++;
        sums.push(g.measures.sum);
        odd[g.measures.odd]++;
        low[g.measures.low]++;
      }
    }
    return { mainHits, specialHits, sums, odd, low, tiers, bad, pastWinners, games, attempts };
  }

  console.log(`\n--- simulation: ${ROUNDS} batches per profile ---`);
  for (const [name, weights] of Object.entries(APP.generator.PRESETS)) {
    const sim = simulate({ weights }, ROUNDS);
    const mean = sim.sums.reduce((a, b) => a + b, 0) / sim.sums.length;
    const ranked = sim.mainHits
      .map((c, n) => ({ n, c }))
      .slice(1)
      .sort((a, b) => b.c - a.c);
    console.log(
      `${name.padEnd(9)} games=${sim.games} bad=${sim.bad} pastWinners=${sim.pastWinners}` +
        ` sumMean=${mean.toFixed(1)} tries/game=${(sim.attempts / sim.games).toFixed(1)}` +
        ` tiers=${sim.tiers.join("/")}` +
        ` top5=${ranked.slice(0, 5).map((x) => x.n).join(",")}` +
        ` bottom5=${ranked.slice(-5).map((x) => x.n).join(",")}`,
    );
    check(`${config.id}/${name}: no malformed lines`, sim.bad === 0);
    check(`${config.id}/${name}: no past jackpot combinations`, sim.pastWinners === 0);
    check(
      `${config.id}/${name}: shape filter passes without relaxing`,
      sim.tiers[0] / sim.games > 0.99,
      `tier0=${((sim.tiers[0] / sim.games) * 100).toFixed(2)}%`,
    );
  }

  const pure = simulate({ weights: APP.generator.PRESETS.pure, matchPatterns: false }, ROUNDS);
  const expected = (pure.games * config.pick) / config.mainMax;
  const chi = pure.mainHits
    .slice(1)
    .reduce((a, c) => a + (c - expected) ** 2 / expected, 0);
  const df = config.mainMax - 1;
  check(
    `${config.id}: pure random mode is uniform (chi-square, ${df} df)`,
    chi < df * 1.45,
    `chi2=${chi.toFixed(1)} limit=${(df * 1.45).toFixed(1)}`,
  );

  const patterned = simulate({ weights: APP.generator.PRESETS.balanced }, ROUNDS);
  const genMean = patterned.sums.reduce((a, b) => a + b, 0) / patterned.sums.length;
  check(
    `${config.id}: generated sum mean tracks history`,
    Math.abs(genMean - st.sums.mean) < 8,
    `gen=${genMean.toFixed(1)} hist=${st.sums.mean.toFixed(1)}`,
  );

  for (const [label, histDist, genCounts] of [
    ["odd/even", st.oddDist, patterned.odd],
    ["low/high", st.lowDist, patterned.low],
  ]) {
    const hist = Array.from(histDist, (v) => v / st.total);
    const gen = genCounts.map((c) => c / patterned.games);
    console.log(`${label} history  :`, hist.map((v) => v.toFixed(3)).join(" "));
    console.log(`${label} generated:`, gen.map((v) => v.toFixed(3)).join(" "));
    const diff = Math.max(...hist.map((v, i) => Math.abs(v - gen[i])));
    check(`${config.id}: ${label} mix mirrors history`, diff < 0.05, `maxDiff=${diff.toFixed(3)}`);
  }
}

console.log(`\n${failures.length ? "FAILURES:\n - " + failures.join("\n - ") : "all checks passed"}`);
process.exit(failures.length ? 1 : 0);
