/**
 * Fixture tests for official Mega Millions recent results.
 * No network.
 */

import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { drawingRowsEqual } from "./draw-validate.mjs";
import {
  combineDrawingPages,
  extendWithOfficialRecent,
  parseDrawingPagingResponse,
  drawsFromOfficialRecentRows,
  refreshCanContinue,
  resolveMegaMillionsHistory,
  shiftIsoDate,
} from "./mm-recent.mjs";

const failures = [];

function check(name, condition) {
  if (!condition) failures.push(name);
  console.log(`${condition ? "ok" : "FAIL"}  ${name}`);
}

function scheduleEnding(through, count) {
  const dates = [];
  let cursor = through;
  while (dates.length < count) {
    const day = new Date(`${cursor}T12:00:00Z`).getUTCDay();
    if (day === 2 || day === 5) dates.push(cursor);
    cursor = shiftIsoDate(cursor, -1);
  }
  return dates;
}

function draw(date, special = 10) {
  return { d: date, n: [1, 2, 3, 4, 5], s: special };
}

function paging(draws) {
  return {
    d: JSON.stringify({
      TotalResults: draws.length,
      DrawingData: draws.map((item) => ({
        PlayDate: `${item.d}T00:00:00`,
        N1: item.n[0],
        N2: item.n[1],
        N3: item.n[2],
        N4: item.n[3],
        N5: item.n[4],
        MBall: item.s,
      })),
    }),
  };
}

const afterSep29 = new Date("2026-09-30T20:00:00Z");
const beforeSep29 = new Date("2026-09-29T18:00:00Z");
const afterOct2 = new Date("2026-10-03T16:00:00Z");
const history = scheduleEnding("2026-09-29", 16).map((date, index) => draw(date, 10 + (index % 5)));
const recentDraws = history.map((item) => ({ ...item, n: item.n.slice() }));

const unchanged = extendWithOfficialRecent({
  existingDraws: history,
  recentDraws,
  now: afterSep29,
});
check(
  "NY incomplete + matching recent + no new draw keeps the snapshot",
  unchanged.ok && unchanged.status === "unchanged" && unchanged.draws === history && unchanged.overlap >= 10,
);

const withNew = history.map((item) => ({ ...item, n: item.n.slice() }));
withNew.unshift(draw("2026-10-02", 7));
const extended = extendWithOfficialRecent({
  existingDraws: history,
  recentDraws: withNew,
  now: afterOct2,
});
check(
  "one new official draw increases the count by 1",
  extended.ok && extended.status === "extended" && extended.draws.length === history.length + 1 && extended.draws[0].d === "2026-10-02",
);

const conflictRows = recentDraws.map((item, index) => (index === 3 ? { ...item, s: 24 } : { ...item, n: item.n.slice() }));
const conflict = extendWithOfficialRecent({
  existingDraws: history,
  recentDraws: conflictRows,
  now: afterSep29,
});
check(
  "overlap number conflict fails without applying the official row",
  !conflict.ok && conflict.date === history[3].d && conflict.snapshot.includes(`+ ${history[3].s}`) && conflict.official.endsWith("+ 24"),
);

const shortOverlap = extendWithOfficialRecent({
  existingDraws: history,
  recentDraws: recentDraws.slice(0, 9),
  now: afterSep29,
});
check("fewer than 10 overlapping draws fails", !shortOverlap.ok && /overlap 9/.test(shortOverlap.reason));

const holed = recentDraws.filter((item) => item.d !== "2026-09-18");
const missingFriday = extendWithOfficialRecent({
  existingDraws: history.filter((item) => item.d !== "2026-09-18"),
  recentDraws: holed,
  now: afterSep29,
});
check(
  "a published Tuesday or Friday missing inside the recent window fails",
  !missingFriday.ok && missingFriday.reason.includes("2026-09-18"),
);

const awaitingHistory = scheduleEnding("2026-09-25", 12).map((date, index) => draw(date, 11 + (index % 4)));
const awaiting = extendWithOfficialRecent({
  existingDraws: awaitingHistory,
  recentDraws: awaitingHistory.map((item) => ({ ...item, n: item.n.slice() })),
  now: beforeSep29,
});
check(
  "a drawing that is not published yet stays an awaiting match",
  awaiting.ok && awaiting.status === "unchanged" && awaiting.awaiting && !awaiting.reason.includes("2026-09-29"),
);

const truncated = combineDrawingPages([{ totalResults: 40, rows: Array.from({ length: 15 }, () => ({ PlayDate: "2026-09-29T00:00:00" })) }]);
check("pagination that returns fewer rows than TotalResults fails", !truncated.ok && /truncation/.test(truncated.reason));

const emptyJson = parseDrawingPagingResponse(JSON.stringify({ d: JSON.stringify({ DrawingData: [], TotalResults: 0 }) }));
const layoutChanged = parseDrawingPagingResponse("<div class='previousDrawingList'><!-- dnamic drawing data --></div>");
check(
  "a changed page with zero DrawingData rows fails",
  !emptyJson.ok && /result rows 0/.test(emptyJson.reason) && !layoutChanged.ok && /no DrawingData|not the DrawingData/.test(layoutChanged.reason),
);

const behindRecent = history.slice(4).map((item) => ({ ...item, n: item.n.slice() }));
const behind = extendWithOfficialRecent({
  existingDraws: history,
  recentDraws: behindRecent,
  now: afterSep29,
});
check(
  "official recent behind the snapshot keeps it",
  behind.ok && behind.status === "behind" && behind.draws === history && behind.reason.includes("official source is behind"),
);

const parsed = parseDrawingPagingResponse(paging(recentDraws));
const combined = combineDrawingPages([{ totalResults: parsed.totalResults, rows: parsed.rows }]);
const normalized = drawsFromOfficialRecentRows(combined.rows);
check(
  "DrawingData rows become sorted date, five whites, and one Mega Ball",
  parsed.ok && combined.ok && normalized.ok && normalized.draws[0].d === "2026-09-29" && normalized.draws[0].n.join("-") === "1-2-3-4-5",
);

const restored = resolveMegaMillionsHistory({
  existingDraws: history,
  nyStatus: "complete",
  nyDraws: history.map((item) => ({ ...item, n: item.n.slice() })),
  recent: { ok: true, draws: recentDraws },
  now: afterSep29,
});
check(
  "a restored NY feed that matches the snapshot stays the primary history",
  restored.ok && restored.status === "ny-primary" && restored.draws[0].d === history[0].d && restored.draws.length === history.length,
);

const brokenNy = history.map((item, index) => (index === history.length - 1 ? { ...item, n: [6, 7, 8, 9, 10] } : { ...item, n: item.n.slice() }));
const nyConflict = resolveMegaMillionsHistory({
  existingDraws: history,
  nyStatus: "complete",
  nyDraws: brokenNy,
  recent: { ok: true, draws: recentDraws },
  now: afterSep29,
});
check(
  "a restored NY feed that changes an older drawing fails",
  !nyConflict.ok && nyConflict.preserve && nyConflict.date === history.at(-1).d,
);

const recentDown = resolveMegaMillionsHistory({
  existingDraws: history,
  nyStatus: "incomplete",
  nyDraws: history.slice(0, 4),
  recent: { ok: false, reason: "HTTP 503" },
  now: afterSep29,
});
check(
  "incomplete NY plus a failed official recent source preserves the snapshot and fails",
  !recentDown.ok && recentDown.preserve && recentDown.draws === history,
);

const snapshot = JSON.parse(await readFile(resolve(dirname(fileURLToPath(import.meta.url)), "..", "data", "draws.json"), "utf8"));
const powerball = snapshot.games.powerball;
const powerballFeed = {
  games: {
    megamillions: snapshot.games.megamillions,
    powerball: { ...powerball, draws: powerball.draws.map((item) => ({ ...item, n: item.n.slice() })) },
  },
};
check(
  "a healthy Powerball feed matches the stored 1,414 rows and the September 30 drawing",
  powerball.count === 1414 &&
    powerball.draws.length === 1414 &&
    powerball.latestDraw === "2026-09-30" &&
    powerball.draws[0].n.join("-") === "4-6-23-33-44" &&
    powerball.draws[0].s === 13 &&
    drawingRowsEqual(snapshot, powerballFeed),
);

const degraded = resolveMegaMillionsHistory({
  existingDraws: history,
  nyStatus: "incomplete",
  recent: { ok: true, draws: recentDraws },
  now: afterSep29,
});
const proceeded = refreshCanContinue(degraded, { ok: true });
check(
  "validated Mega Millions and Powerball leave the jackpot step unblocked",
  degraded.ok && proceeded.exitCode === 0 && proceeded.continueToJackpot,
);

if (failures.length) {
  console.error(`\n${failures.length} failed`);
  process.exitCode = 1;
} else {
  console.log(`\n${failures.length ? failures.length + " failed" : "checks passed"}`);
}
