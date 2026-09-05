import {
  validateDraw,
  validateGameHistory,
  shouldReplaceSnapshot,
  snapshotUnchanged,
} from "./draw-validate.mjs";

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

const goodMm = { d: "2026-08-21", n: [1, 25, 34, 48, 57], s: 24 };
check("valid Mega Millions row", validateDraw("megamillions", goodMm) === null);
check("Mega Ball 25 rejected after 2025-04-08", validateDraw("megamillions", { ...goodMm, s: 25 }) !== null);
check("Mega Ball 25 allowed before the 2025 change", validateDraw("megamillions", { d: "2025-04-04", n: [1, 2, 3, 4, 5], s: 25 }) === null);
check("white ball 71 rejected", validateDraw("megamillions", { ...goodMm, n: [1, 2, 3, 4, 71] }) !== null);

const goodPb = { d: "2026-08-22", n: [3, 11, 20, 40, 55], s: 12 };
check("valid Powerball row", validateDraw("powerball", goodPb) === null);
check("Powerball 27 rejected", validateDraw("powerball", { ...goodPb, s: 27 }) !== null);
check("unsorted whites rejected", validateDraw("powerball", { ...goodPb, n: [11, 3, 20, 40, 55] }) !== null);

const history = {
  count: 2,
  latestDraw: "2026-08-22",
  draws: [
    { d: "2026-08-22", n: [3, 11, 20, 40, 55], s: 12 },
    { d: "2015-10-07", n: [1, 2, 3, 4, 5], s: 6 },
  ],
};
check("duplicate dates rejected", validateGameHistory("powerball", {
  ...history,
  draws: [history.draws[0], history.draws[0]],
}) !== null);
check("ascending dates rejected", validateGameHistory("powerball", {
  count: 2,
  latestDraw: "2015-10-07",
  draws: [history.draws[1], history.draws[0]],
}) !== null);

const current = {
  games: {
    megamillions: { count: 3, latestDraw: "2026-08-21", draws: [1, 2, 3] },
    powerball: { count: 3, latestDraw: "2026-08-22", draws: [1, 2, 3] },
  },
};
check(
  "shorter feed must not replace snapshot",
  shouldReplaceSnapshot(current, {
    games: {
      megamillions: { count: 2, latestDraw: "2026-08-21", draws: [1, 2] },
      powerball: { count: 3, latestDraw: "2026-08-22", draws: [1, 2, 3] },
    },
  }).ok === false,
);
check(
  "older latest date must not replace snapshot",
  shouldReplaceSnapshot(current, {
    games: {
      megamillions: { count: 3, latestDraw: "2026-08-18", draws: [1, 2, 3] },
      powerball: { count: 3, latestDraw: "2026-08-22", draws: [1, 2, 3] },
    },
  }).ok === false,
);
check(
  "unchanged counts skip a rewrite",
  snapshotUnchanged(current, {
    games: {
      megamillions: { count: 3, latestDraw: "2026-08-21" },
      powerball: { count: 3, latestDraw: "2026-08-22" },
    },
  }) === true,
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall draw-validation checks passed");
