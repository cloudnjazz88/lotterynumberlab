/**
 * Smoke tests for draw-awaiting helpers (no fabricated results).
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

const root = new URL("..", import.meta.url);
const sandbox = { window: {}, console, Intl, Date, Math, JSON, fetch };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const file of ["data/draws.js", "src/data.js"]) {
  vm.runInContext(readFileSync(new URL(file, root), "utf8"), sandbox, { filename: file });
}
const data = sandbox.window.LOTTO.data;
const mm = data.game("megamillions");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Sep 25 2026 11pm ET draw instant is 2026-09-26T03:00:00.000Z (EDT).
// With latestDraw already Sep 25, after grace we should NOT be awaiting.
assert(
  data.isAwaitingOfficialResult(mm, "2026-09-25", new Date("2026-09-26T15:00:00.000Z")) === false,
  "current Sep 25 snapshot should not await on Sat afternoon",
);

// Same wall-clock with an older bundled draw must await (Fri draw already posted).
assert(
  data.isAwaitingOfficialResult(mm, "2026-09-22", new Date("2026-09-26T15:00:00.000Z")) === true,
  "Sep 22 snapshot must await after Fri draw + grace",
);

// Immediately after Fri 11pm ET, still inside 4h grace — do not await yet.
assert(
  data.isAwaitingOfficialResult(mm, "2026-09-22", new Date("2026-09-26T04:00:00.000Z")) === false,
  "inside posting grace should not await",
);

// After grace, awaiting kicks in.
assert(
  data.isAwaitingOfficialResult(mm, "2026-09-22", new Date("2026-09-26T07:30:00.000Z")) === true,
  "after posting grace should await",
);

console.log("awaiting-update-test: ok");
