import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeDrawingHistory } from "./draw-validate.mjs";
import {
  classifyOfficialFeed,
  drawsFromOfficialPayload,
  parseCsv,
  selectOfficialEndpoint,
} from "./ny-feed.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshot = JSON.parse(readFileSync(resolve(ROOT, "data/draws.json"), "utf8"));
const mm = snapshot.games.megamillions;

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

const quoted = 'Draw Date,Winning Numbers,Mega Ball,Multiplier\n"09/29/2026","10 15 16 27 64","23","2, not used"\n';
const parsedQuote = parseCsv(quoted);
check("quoted CSV keeps the comma inside multiplier", parsedQuote[1][3] === "2, not used");
check("quoted winning numbers stay one field", parsedQuote[1][1] === "10 15 16 27 64");

const crlf = 'Mega Ball,Multiplier,Draw Date,Winning Numbers\r\n23,2,09/29/2026,10 15 16 27 64\r\n';
const lf = "Mega Ball,Multiplier,Draw Date,Winning Numbers\n23,2,09/29/2026,10 15 16 27 64\n";
const fromCrlf = drawsFromOfficialPayload("megamillions", crlf, "csv");
const fromLf = drawsFromOfficialPayload("megamillions", lf, "csv");
check("CRLF CSV parses", fromCrlf.ok && fromCrlf.draws[0].d === "2026-09-29" && fromCrlf.draws[0].s === 23);
check("LF CSV parses the same row", fromLf.ok && fromLf.draws[0].n.join(",") === fromCrlf.draws[0].n.join(","));
check("header order uses column names", fromCrlf.draws[0].n.join(",") === "10,15,16,27,64");

const missingColumn = "Draw Date,Winning Numbers,Multiplier\n09/29/2026,10 15 16 27 64,2\n";
const missing = drawsFromOfficialPayload("megamillions", missingColumn, "csv");
check("missing Mega Ball column fails", missing.ok === false && /Mega Ball/.test(missing.reason));

const malformed = "Draw Date,Winning Numbers,Mega Ball\n09/29/2026,10 15 16 27 64,99\n";
const badRow = drawsFromOfficialPayload("megamillions", malformed, "csv");
check("malformed in-matrix row fails", badRow.ok === false && badRow.parseFailures === 1);

const monthly = mm.draws.filter((draw) => Number(draw.d.slice(8, 10)) <= 4);
const legacy = classifyOfficialFeed("megamillions", monthly, mm);
check("monthly legacy shape is incomplete", legacy.status === "incomplete");
check("monthly legacy is not treated as behind", legacy.status !== "behind");

const same = classifyOfficialFeed("megamillions", mm.draws, mm);
check("full stored history is a complete feed", same.status === "complete");

const attempts = [
  { name: "csv-export", status: "incomplete", reason: "truncated" },
  { name: "csv-rows", status: "complete", reason: "full export", draws: mm.draws },
];
const chosen = selectOfficialEndpoint(attempts);
check("complete official fallback is selected", chosen.ok && chosen.behind === false && chosen.chosen.name === "csv-rows");

const none = selectOfficialEndpoint([
  { name: "csv-export", status: "incomplete", reason: "truncated" },
  { name: "legacy-resource", status: "incomplete", reason: "truncated" },
]);
check("all incomplete endpoints fail", none.ok === false && /legacy-resource/.test(none.reason));

const primary = selectOfficialEndpoint([
  { name: "csv-export", status: "complete", reason: "full", draws: mm.draws },
  { name: "legacy-resource", status: "incomplete", reason: "ignored" },
]);
check("primary complete export is used", primary.chosen.name === "csv-export");

const withoutLatest = mm.draws.slice(1);
const behind = classifyOfficialFeed("megamillions", withoutLatest, mm);
check("source older than the snapshot is behind", behind.status === "behind" && /official source is behind/.test(behind.reason));
const behindChoice = selectOfficialEndpoint([{ name: "csv-export", ...behind }]);
check("behind source stops endpoint fallback", behindChoice.ok && behindChoice.behind === true);

const withNew = [{ d: "2026-10-03", n: [2, 4, 6, 8, 10], s: 5 }, ...mm.draws];
const added = classifyOfficialFeed("megamillions", withNew, mm);
const merged = mergeDrawingHistory("megamillions", withNew, mm);
check("newer complete feed stays complete", added.status === "complete");
check("newer complete feed adds the drawing without backfill", merged.ok && merged.count === mm.count + 1 && merged.backfilled.length === 0);

if (failed) {
  console.error(`\n${failed} ny-feed check(s) failed`);
  process.exit(1);
}
console.log("\nall ny-feed checks passed");
