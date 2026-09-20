/**
 * Ensures Methodology "Last updated" tracks the bundled draw snapshot
 * instead of a hand-typed date.
 */

import { readFileSync } from "node:fs";
import { buildContext } from "./compute-context.mjs";
import { methodologyPage } from "../content/reference.mjs";
import { dateLong } from "../content/site.mjs";

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed += 1;
};

const ctx = buildContext();
const latestDraw =
  ctx.mm.history.latestDraw > ctx.pb.history.latestDraw
    ? ctx.mm.history.latestDraw
    : ctx.pb.history.latestDraw;
const expected = `Last updated: ${dateLong(latestDraw)}.`;
const html = methodologyPage(ctx);

check("methodology last updated uses newer of MM/PB latestDraw", html.includes(expected));
check(
  "methodology last updated is not a hardcoded 2026-08-24 (unless that is the latest draw)",
  latestDraw === "2026-08-24" || !html.includes(`Last updated: ${dateLong("2026-08-24")}.`),
);

const buildSite = readFileSync(new URL("./build-site.mjs", import.meta.url), "utf8");
const methIdx = buildSite.indexOf('slug: "methodology.html"');
const methSlice = methIdx >= 0 ? buildSite.slice(methIdx, methIdx + 400) : "";
check(
  "build-site sets methodology modified to drawsLatest",
  methSlice.includes("modified: drawsLatest"),
);

try {
  const built = readFileSync(new URL("../methodology.html", import.meta.url), "utf8");
  check("built methodology.html last updated matches dataset", built.includes(expected));
} catch (err) {
  check(`built methodology.html readable (${err.message})`, false);
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall methodology-updated checks passed");
