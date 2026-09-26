import { computeSpending } from "./spending-math.mjs";

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

const pb = computeSpending({
  costPerPlay: 2,
  playsPerDrawing: 1,
  drawingsPerWeek: 3,
  horizonYears: 5,
  jackpotOdds: 292201338,
});
check("powerball example ok", pb.ok === true);
check("weekly $6", pb.weekly === 6);
check("annual $312", pb.annual === 312);
check("monthly 26", Math.abs(pb.monthly - 26) < 1e-9);
check("period $1560", pb.periodTotal === 1560);
check("plays 780", pb.playsPurchased === 780);
check("jackpot context present", pb.jackpotContext && pb.jackpotContext.plays === 780);
check(
  "at-least-one probability tiny",
  pb.jackpotContext.atLeastOneProbability > 0 &&
    pb.jackpotContext.atLeastOneProbability < 0.001,
);

const mm = computeSpending({
  costPerPlay: 5,
  playsPerDrawing: 2,
  drawingsPerWeek: 2,
  horizonYears: 1,
  jackpotOdds: 290472336,
});
check("mm weekly $20", mm.weekly === 20);
check("mm annual $1040", mm.annual === 1040);
check("mm plays 208", mm.playsPurchased === 208);

const bad = computeSpending({
  costPerPlay: 0,
  playsPerDrawing: 1,
  drawingsPerWeek: 3,
  horizonYears: 1,
});
check("rejects non-positive", bad.ok === false);

const none = computeSpending({
  costPerPlay: 2,
  playsPerDrawing: 1,
  drawingsPerWeek: 3,
  horizonYears: 1,
  jackpotOdds: null,
});
check("allows null odds", none.ok && none.jackpotContext === null);

if (failed) {
  console.error(`\n${failed} spending-calculator test(s) failed`);
  process.exit(1);
}
console.log("\nAll spending-calculator tests passed");
