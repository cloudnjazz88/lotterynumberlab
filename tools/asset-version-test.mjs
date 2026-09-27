import { readFileSync, writeFileSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  contentHash,
  fileContentHash,
  stylesheetHref,
  stylesHash,
  assetHash,
  assetVersionQuery,
  withAssetVersion,
  overlappingCacheControlRules,
  isMutableRuntimeDataAsset,
  isContentHashedAsset,
  resetAssetHashCache,
  CONTENT_HASHED_APP_SCRIPTS,
  MUTABLE_RUNTIME_DATA_SCRIPTS,
} from "./asset-version.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

const sample = Buffer.from("footer { display: grid; }\n");
const a = contentHash(sample);
const b = contentHash(sample);
const c = contentHash(Buffer.from("footer { display: flex; }\n"));
check("same bytes keep the same hash", a === b);
check("hash is 12 lowercase hex chars", /^[a-f0-9]{12}$/.test(a));
check("different bytes change the hash", a !== c);
check(
  "CRLF and LF of the same CSS hash the same",
  contentHash(Buffer.from("footer { display: grid; }\r\n")) === contentHash(Buffer.from("footer { display: grid; }\n")),
);

const dir = mkdtempSync(join(tmpdir(), "asset-version-"));
const file = join(dir, "styles.css");
writeFileSync(file, sample);
check("file hash matches buffer hash", fileContentHash(file) === a);
writeFileSync(file, sample);
check("rewriting the same bytes is stable", fileContentHash(file) === a);
writeFileSync(file, Buffer.concat([sample, Buffer.from(" ")]));
check("any byte change updates the file hash", fileContentHash(file) !== a);

const href = stylesheetHref();
check("stylesheet URL is root-relative with v=", href === `/styles.css?v=${stylesHash()}`);
check("live styles.css hash is 12 hex chars", /^[a-f0-9]{12}$/.test(stylesHash()));

// --- classification: static vs mutable ---
check("styles.css is content-hashed", isContentHashedAsset("styles.css"));
check("src/app.js is content-hashed", isContentHashedAsset("src/app.js"));
check("src/data.js is content-hashed (static glue)", isContentHashedAsset("src/data.js"));
check("src/tools/lottery-what-if-calculator.js is content-hashed", isContentHashedAsset("src/tools/lottery-what-if-calculator.js"));
check("data/draws.js is mutable runtime data", isMutableRuntimeDataAsset("data/draws.js"));
check("data/draws.js is NOT content-hashed", !isContentHashedAsset("data/draws.js"));
check("data/jackpots.json is mutable runtime data", isMutableRuntimeDataAsset("data/jackpots.json"));
check("data/jackpots.json is NOT content-hashed", !isContentHashedAsset("data/jackpots.json"));
check("ads/Analytics paths are not hashed by default", !isContentHashedAsset("https://www.googletagmanager.com/gtag/js"));

check(
  "hashed app scripts allowlist matches expected set",
  JSON.stringify([...CONTENT_HASHED_APP_SCRIPTS].sort()) ===
    JSON.stringify([
      "src/app.js",
      "src/charts.js",
      "src/data.js",
      "src/generator.js",
      "src/stats.js",
      "src/tools/lottery-what-if-calculator.js",
      "src/tools/odds-explorer.js",
      "src/tools/spending-calculator.js",
      "src/tools/ticket-match-checker.js",
    ]),
);
check(
  "mutable data scripts denylist is draws.js only (no jackpots.js)",
  JSON.stringify([...MUTABLE_RUNTIME_DATA_SCRIPTS]) === JSON.stringify(["data/draws.js"]),
);

for (const rel of CONTENT_HASHED_APP_SCRIPTS) {
  check(`allowlist entry exists on disk: ${rel}`, existsSync(join(ROOT, rel)));
  check(`allowlist entry is content-hashed: ${rel}`, isContentHashedAsset(rel));
}
for (const rel of MUTABLE_RUNTIME_DATA_SCRIPTS) {
  check(`denylist entry exists on disk: ${rel}`, existsSync(join(ROOT, rel)));
  check(`denylist entry is mutable: ${rel}`, isMutableRuntimeDataAsset(rel));
  check(`denylist entry is not hashed: ${rel}`, !isContentHashedAsset(rel));
}

const jsHash = assetHash("src/tools/lottery-what-if-calculator.js");
check("what-if JS hash is 12 hex chars", /^[a-f0-9]{12}$/.test(jsHash));
check("assetVersionQuery uses v= for static JS", assetVersionQuery("src/tools/lottery-what-if-calculator.js") === "?v=" + jsHash);
check("assetVersionQuery empty for draws.js", assetVersionQuery("data/draws.js") === "");
check(
  "withAssetVersion appends to relative script href",
  withAssetVersion("../src/tools/lottery-what-if-calculator.js", "src/tools/lottery-what-if-calculator.js") ===
    "../src/tools/lottery-what-if-calculator.js?v=" + jsHash,
);
check(
  "withAssetVersion keeps root-relative paths",
  withAssetVersion("/src/app.js", "src/app.js") === "/src/app.js?v=" + assetHash("src/app.js"),
);
check(
  "withAssetVersion leaves draws.js fixed (relative)",
  withAssetVersion("../data/draws.js", "data/draws.js") === "../data/draws.js",
);
check(
  "withAssetVersion leaves draws.js fixed (root-relative)",
  withAssetVersion("/data/draws.js", "data/draws.js") === "/data/draws.js",
);

const drawsA = assetHash("data/draws.js");
const drawsB = assetHash("data/draws.js");
check("draws.js hash is memoized and stable (hasher still works)", drawsA === drawsB && /^[a-f0-9]{12}$/.test(drawsA));

// Changing only app JS changes that script's hash; draws hash unchanged.
{
  const whatIfPath = join(ROOT, "src/tools/lottery-what-if-calculator.js");
  const original = readFileSync(whatIfPath);
  resetAssetHashCache();
  const beforeWhatIf = assetHash("src/tools/lottery-what-if-calculator.js");
  const beforeDraws = assetHash("data/draws.js");
  const beforeApp = assetHash("src/app.js");
  writeFileSync(whatIfPath, Buffer.concat([original, Buffer.from("\n/* cache-bust probe */\n")]));
  resetAssetHashCache();
  const afterWhatIf = assetHash("src/tools/lottery-what-if-calculator.js");
  const afterDraws = assetHash("data/draws.js");
  const afterApp = assetHash("src/app.js");
  writeFileSync(whatIfPath, original);
  resetAssetHashCache();
  check("changing only what-if JS changes that script hash", beforeWhatIf !== afterWhatIf);
  check("changing what-if JS does not change draws.js hash", beforeDraws === afterDraws);
  check("changing what-if JS does not change app.js hash", beforeApp === afterApp);
  check(
    "after restore, what-if hash returns to prior value",
    assetHash("src/tools/lottery-what-if-calculator.js") === beforeWhatIf,
  );
}

// Changing draws snapshot does NOT require regenerating tool HTML for freshness:
// fixed draws.js URL still loads updated content; versioning rules keep bare URL.
{
  const drawsPath = join(ROOT, "data/draws.js");
  const original = readFileSync(drawsPath);
  const fixedHref = withAssetVersion("../data/draws.js", "data/draws.js");
  check("rules: draws stays bare before mutation", fixedHref === "../data/draws.js");
  writeFileSync(drawsPath, Buffer.concat([original, Buffer.from("\n/* nightly refresh probe */\n")]));
  resetAssetHashCache();
  const stillFixed = withAssetVersion("../data/draws.js", "data/draws.js");
  const hashMoved = assetHash("data/draws.js") !== contentHash(original);
  writeFileSync(drawsPath, original);
  resetAssetHashCache();
  check("after draws mutation, HTML href rule still bare draws.js", stillFixed === "../data/draws.js");
  check("draws file bytes hash did change (content updated)", hashMoved);
  check(
    "what-if tool script stays content-hashed independently of draws",
    withAssetVersion(
      "../src/tools/lottery-what-if-calculator.js",
      "src/tools/lottery-what-if-calculator.js",
    ).includes("?v="),
  );
}

// Nightly refresh PATHS / runtime data freshness contract (do not edit the workflow).
{
  const wf = readFileSync(join(ROOT, ".github/workflows/refresh-draws.yml"), "utf8");
  const pathsLine = wf.split(/\r?\n/).find((l) => /^\s*PATHS=/.test(l));
  check("refresh-draws.yml declares PATHS=", Boolean(pathsLine));
  const pathsExpr = pathsLine ? pathsLine.replace(/^\s*PATHS=/, "").replace(/^"|"$/g, "") : "";
  const paths = pathsExpr.split(/\s+/).filter(Boolean);
  check("PATHS includes data/draws.js", paths.includes("data/draws.js"));
  check("PATHS includes data/draws.json", paths.includes("data/draws.json"));
  check("PATHS includes data/jackpots.json", paths.includes("data/jackpots.json"));
  check("PATHS includes index.html (embeds latest)", paths.includes("index.html"));
  check("PATHS includes mega-millions.html", paths.includes("mega-millions.html"));
  check("PATHS includes powerball.html", paths.includes("powerball.html"));
  const toolsOnPaths = paths.filter((p) => p.startsWith("tools/") || p.includes("/tools/"));
  check("PATHS does not include tools HTML (no tools republish)", toolsOnPaths.length === 0);
  check(
    "tools HTML can keep fixed draws.js URL while PATHS refreshes data",
    !isContentHashedAsset("data/draws.js") && paths.includes("data/draws.js"),
  );
}

// Built HTML expectations (when present from a prior/local build).
{
  const whatIfHtmlPath = join(ROOT, "tools/lottery-what-if-calculator.html");
  if (existsSync(whatIfHtmlPath)) {
    const html = readFileSync(whatIfHtmlPath, "utf8");
    const scriptSrcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
    const drawsSrc = scriptSrcs.find((s) => s.includes("draws.js"));
    const whatIfSrc = scriptSrcs.find((s) => s.includes("lottery-what-if-calculator.js"));
    const dataSrc = scriptSrcs.find((s) => /(?:^|\/)data\.js(?:\?|$)/.test(s));
    check("built What If HTML references draws.js", Boolean(drawsSrc));
    check(
      "built What If draws.js URL is unversioned (fixed)",
      drawsSrc === "../data/draws.js" || drawsSrc === "/data/draws.js" || drawsSrc === "data/draws.js",
    );
    check("built What If draws.js has no ?v=", drawsSrc ? !drawsSrc.includes("?v=") : false);
    check(
      "built What If tool JS is content-hashed",
      Boolean(whatIfSrc && /\?v=[a-f0-9]{12}$/.test(whatIfSrc)),
    );
    check(
      "built What If src/data.js is content-hashed",
      Boolean(dataSrc && /\?v=[a-f0-9]{12}$/.test(dataSrc)),
    );
  } else {
    check("built What If HTML present (skip HTML assertions if missing)", false);
  }

  for (const [label, htmlRel, toolRel] of [
    ["Ticket Match", "tools/ticket-match-checker.html", "ticket-match-checker.js"],
    ["Odds Explorer", "tools/odds-explorer.html", "odds-explorer.js"],
    ["Spending", "tools/lottery-spending-calculator.html", "spending-calculator.js"],
  ]) {
    const p = join(ROOT, htmlRel);
    if (!existsSync(p)) {
      check(`built ${label} HTML present`, false);
      continue;
    }
    const html = readFileSync(p, "utf8");
    const scriptSrcs = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
    const toolSrc = scriptSrcs.find((s) => s.includes(toolRel));
    check(
      `built ${label} tool JS is content-hashed`,
      Boolean(toolSrc && /\?v=[a-f0-9]{12}$/.test(toolSrc)),
    );
    const drawsSrc = scriptSrcs.find((s) => s.includes("draws.js"));
    if (drawsSrc) {
      check(`built ${label} draws.js unversioned`, !drawsSrc.includes("?v="));
    }
  }
}

const headers = readFileSync(new URL("../_headers", import.meta.url), "utf8");
const overlaps = overlappingCacheControlRules(headers);
check(
  "_headers has no overlapping Cache-Control rules",
  overlaps.length === 0,
);
if (overlaps.length) {
  for (const [left, right] of overlaps) {
    console.log(`  overlap ${left.path} + ${right.path}`);
  }
}
check("_headers has no catch-all Cache-Control", !/^\/\*\s*$/m.test(headers.split("Cache-Control")[0]) && !headers.includes("\n/*\n"));
check(
  "HTML revalidates",
  /\/\*\.html[\s\S]*?Cache-Control:\s*public, max-age=0, must-revalidate/.test(headers),
);
check(
  "versioned CSS is immutable",
  /\/styles\.css[\s\S]*?Cache-Control:\s*public, max-age=31536000, immutable/.test(headers),
);
check(
  "unversioned JS is not immutable",
  /\/src\/\*[\s\S]*?Cache-Control:\s*public, max-age=3600\s*$/m.test(headers) && !/\/src\/\*[\s\S]*immutable/.test(headers),
);
check(
  "draws.js short cache (not immutable)",
  /\/data\/draws\.js[\s\S]*?Cache-Control:\s*public, max-age=3600/.test(headers) &&
    !/\/data\/draws\.js[\s\S]*immutable/.test(headers),
);

const stacked = overlappingCacheControlRules(`/*
  Cache-Control: public, max-age=300

/styles.css
  Cache-Control: public, max-age=86400
`);
check("detects the previous /* + /styles.css stack", stacked.length === 1);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall asset-version checks passed");
