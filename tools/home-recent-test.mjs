/**
 * Assert homepage Recent drawings panel is server-rendered with exactly 5
 * Mega Millions and 5 Powerball draws, including each game's latest.
 * Runs against built index.html with no browser / JS execution.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const html = readFileSync(resolve(ROOT, "index.html"), "utf8");
assert(html.includes('class="home-recent"'), "index.html missing .home-recent panel");
assert(!html.includes("recent-col"), "legacy .recent-col should stay off the homepage");

const sandbox = { window: {}, console, Intl, Date, Math, JSON };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync(resolve(ROOT, "data/draws.js"), "utf8"), sandbox, {
  filename: "data/draws.js",
});
const games = sandbox.window.LOTTO_SNAPSHOT.games;
const mmLatest = games.megamillions.draws[0].d;
const pbLatest = games.powerball.draws[0].d;
const mmExpected = games.megamillions.draws.slice(0, 5).map((d) => d.d);
const pbExpected = games.powerball.draws.slice(0, 5).map((d) => d.d);

function extractDates(gameId) {
  const re = new RegExp(
    String.raw`home-recent__col" data-game="` + gameId + String.raw`"[\s\S]*?<ol class="home-recent__list">([\s\S]*?)</ol>`,
  );
  const m = html.match(re);
  assert(m, `missing home-recent list for ${gameId}`);
  return [...m[1].matchAll(/datetime="(\d{4}-\d{2}-\d{2})"/g)].map((x) => x[1]);
}

const mmDates = extractDates("megamillions");
const pbDates = extractDates("powerball");

assert(mmDates.length === 5, `MM recent rows: expected 5, got ${mmDates.length}`);
assert(pbDates.length === 5, `PB recent rows: expected 5, got ${pbDates.length}`);
assert(mmDates[0] === mmLatest, `MM latest in panel ${mmDates[0]} !== draws ${mmLatest}`);
assert(pbDates[0] === pbLatest, `PB latest in panel ${pbDates[0]} !== draws ${pbLatest}`);
assert(
  mmDates.join(",") === mmExpected.join(","),
  `MM recent dates mismatch: ${mmDates.join(",")} vs ${mmExpected.join(",")}`,
);
assert(
  pbDates.join(",") === pbExpected.join(","),
  `PB recent dates mismatch: ${pbDates.join(",")} vs ${pbExpected.join(",")}`,
);

assert(
  html.includes("Open the Mega Millions generator"),
  "MM generator CTA missing from raw HTML",
);
assert(
  html.includes("Open the Powerball generator"),
  "PB generator CTA missing from raw HTML",
);

console.log(
  `PASS  home-recent: MM ${mmDates.join(" · ")} | PB ${pbDates.join(" · ")} (server-rendered)`,
);
