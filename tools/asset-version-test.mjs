import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  contentHash,
  fileContentHash,
  stylesheetHref,
  stylesHash,
  overlappingCacheControlRules,
} from "./asset-version.mjs";

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
