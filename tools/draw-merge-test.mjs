import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GAME_RULES,
  mergeDrawingHistory,
  shouldReplaceSnapshot,
  validateGameHistory,
  MAX_HISTORICAL_BACKFILL,
  RECENT_DRAW_WINDOW_DAYS,
} from "./draw-validate.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(readFileSync(resolve(ROOT, "data/draws.json"), "utf8"));
const mm = snapshot.games.megamillions;

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

function copyHistory(history) {
  return {
    ...history,
    draws: history.draws.map((draw) => ({ d: draw.d, n: draw.n.slice(), s: draw.s })),
  };
}

check("matrix start stays 2017-10-31", GAME_RULES.megamillions.from === "2017-10-31");
check("stored Mega Millions snapshot validates", validateGameHistory("megamillions", mm) === null);
check("historical backfill limit is 1", MAX_HISTORICAL_BACKFILL === 1);
check("recent window is explicit", RECENT_DRAW_WINDOW_DAYS === 365);

const oldest = mm.draws[mm.draws.length - 1];
check("oldest stored row is 2017-10-31", oldest.d === "2017-10-31");

const withoutOldest = mm.draws.filter((draw) => draw.d !== "2017-10-31");
const restored = mergeDrawingHistory("megamillions", withoutOldest, mm);
check("oldest omission is restored", restored.ok === true);
check("restored first draw is 2017-10-31", restored.firstDraw === "2017-10-31");
check("restored count does not shrink", restored.count === mm.count && restored.draws.length === mm.draws.length);
check("restored latest stays 2026-09-29", restored.latestDraw === "2026-09-29");
check(
  "restored warning names 2017-10-31",
  restored.backfilled.length === 1 && restored.backfilled[0].date === "2017-10-31",
);

const withoutLatest = mm.draws.slice(1);
const recentGap = mergeDrawingHistory("megamillions", withoutLatest, mm);
check("recent omission fails", recentGap.ok === false);
check("recent omission is not backfilled", recentGap.draws.length === 0);
check("recent omission names the newer drawing", /newer than fetched latest/.test(recentGap.reason));

const oldDates = new Set(mm.draws.slice(-3).map((draw) => draw.d));
const severalOldMissing = mm.draws.filter((draw) => !oldDates.has(draw.d));
const tooMany = mergeDrawingHistory("megamillions", severalOldMissing, mm);
check("more than one historical omission fails", tooMany.ok === false);
check("mass historical omission is not written", tooMany.draws.length === 0);
check("mass historical omission reports the limit", /backfill limit is 1/.test(tooMany.reason));

const stored = mm.draws.find((draw) => draw.d === "2024-06-04");
const revisedFeed = mm.draws.map((draw) =>
  draw.d === stored.d ? { d: draw.d, n: [1, 2, 3, 4, 5], s: draw.s } : { d: draw.d, n: draw.n.slice(), s: draw.s },
);
const revised = mergeDrawingHistory("megamillions", revisedFeed, mm);
const revisedRow = revised.ok ? revised.draws.find((draw) => draw.d === stored.d) : null;
check("complete revised feed succeeds", revised.ok === true && revised.backfilled.length === 0);
check(
  "fetched row replaces the stored row for that date",
  revisedRow && revisedRow.n.join(",") === "1,2,3,4,5" && stored.n.join(",") !== "1,2,3,4,5",
);

const invalidFeed = mm.draws.map((draw) => ({ d: draw.d, n: draw.n.slice(), s: draw.s }));
invalidFeed[20] = { ...invalidFeed[20], s: 99 };
const invalid = mergeDrawingHistory("megamillions", invalidFeed, mm);
check("invalid fetched row fails", invalid.ok === false);
check("invalid fetched row is not replaced", invalid.draws.length === 0);
check("invalid fetched row is not described as fallback", /refusing to replace it with a stored row/.test(invalid.reason));

const broken = copyHistory(mm);
broken.draws.reverse();
broken.count = broken.draws.length;
const brokenMissingOldest = mm.draws.filter((draw) => draw.d !== "2017-10-31");
const refused = mergeDrawingHistory("megamillions", brokenMissingOldest, broken);
check("invalid stored snapshot blocks fallback", refused.ok === false);
check("invalid stored snapshot mentions fallback refused", /historical fallback refused/.test(refused.reason));
check("invalid stored snapshot does not restore rows", refused.draws.length === 0);

const complete = mergeDrawingHistory("megamillions", mm.draws, mm);
check("complete feed succeeds", complete.ok === true);
check("complete feed does not backfill", complete.backfilled.length === 0);
check("complete feed keeps the stored length", complete.count === mm.count);

const added = { d: "2026-10-03", n: [2, 4, 6, 8, 10], s: 5 };
const withNew = mergeDrawingHistory("megamillions", [added, ...mm.draws], mm);
check("new latest drawing is accepted", withNew.ok === true && withNew.backfilled.length === 0);
check("new latest drawing is first", withNew.latestDraw === "2026-10-03" && withNew.draws[0].n.join(",") === "2,4,6,8,10");
check("new latest drawing increases the count", withNew.count === mm.count + 1);
check("new feed still starts at 2017-10-31", withNew.firstDraw === "2017-10-31");

const truncated = mm.draws.slice(0, 40);
const truncatedMerge = mergeDrawingHistory("megamillions", truncated, mm);
check("large truncation fails the merge", truncatedMerge.ok === false && truncatedMerge.draws.length === 0);
check(
  "large truncation is also refused as a shorter snapshot",
  shouldReplaceSnapshot(snapshot, {
    games: {
      megamillions: { count: truncated.length, latestDraw: truncated[0].d, draws: truncated },
      powerball: snapshot.games.powerball,
    },
  }).ok === false,
);

if (failed) {
  console.error(`\n${failed} draw-merge check(s) failed`);
  process.exit(1);
}
console.log("\nall draw-merge checks passed");
