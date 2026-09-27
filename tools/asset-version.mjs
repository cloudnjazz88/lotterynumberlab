/**
 * Stable content hashes for cache-busted static URLs.
 * The hash changes only when file bytes change.
 *
 * Classification (cache busting):
 * - Content-hash `?v=<hash>`: static app code + CSS that only change when a full
 *   site build republishes HTML (styles.css, everything under src/).
 * - Fixed URL, short cache: mutable runtime data refreshed by nightly PATHS
 *   without republishing tools/analyze HTML (everything under data/, especially
 *   data/draws.js). Never append ?v=<hash> or imply immutable for these.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HASH_LENGTH = 12;
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const STYLES = resolve(ROOT, "styles.css");

/** @type {Map<string, string>} */
const hashCache = new Map();

/** First-party static app scripts that receive ?v=<content-hash> in built HTML. */
export const CONTENT_HASHED_APP_SCRIPTS = Object.freeze([
  "src/data.js",
  "src/stats.js",
  "src/generator.js",
  "src/charts.js",
  "src/app.js",
  "src/tools/spending-calculator.js",
  "src/tools/ticket-match-checker.js",
  "src/tools/lottery-what-if-calculator.js",
  "src/tools/odds-explorer.js",
]);

/** Mutable runtime data scripts kept as fixed URLs (short cache, no content hash). */
export const MUTABLE_RUNTIME_DATA_SCRIPTS = Object.freeze([
  "data/draws.js",
]);

export function normalizeRelPath(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");
}

/**
 * Mutable runtime data under data/ — refreshed by scheduled refresh without
 * tools HTML redeploy. Must stay on a fixed URL with short cache.
 */
export function isMutableRuntimeDataAsset(relPath) {
  const key = normalizeRelPath(relPath);
  return key === "data" || key.startsWith("data/");
}

/**
 * Static first-party code/CSS that ships with full builds and should bust
 * caches via content hash when bytes change.
 */
export function isContentHashedAsset(relPath) {
  const key = normalizeRelPath(relPath);
  if (!key || isMutableRuntimeDataAsset(key)) return false;
  if (key === "styles.css") return true;
  if (key === "src" || key.startsWith("src/")) return true;
  return false;
}

export function normalizeNewlines(bytes) {
  return Buffer.from(Buffer.from(bytes).toString("utf8").replace(/\r\n/g, "\n"));
}

export function contentHash(bytes, length = HASH_LENGTH) {
  return createHash("sha256").update(normalizeNewlines(bytes)).digest("hex").slice(0, length);
}

export function fileContentHash(path, length = HASH_LENGTH) {
  return contentHash(readFileSync(path), length);
}

/** Clear memoized asset hashes (tests that mutate files mid-run). */
export function resetAssetHashCache() {
  hashCache.clear();
}

let styles = null;

export function stylesHash() {
  styles ??= fileContentHash(STYLES);
  return styles;
}

export function stylesheetHref() {
  return `/styles.css?v=${stylesHash()}`;
}

/**
 * Content hash for a repo-relative first-party asset.
 * Stable across builds when file bytes are unchanged. Computable for any
 * readable path; callers must use isContentHashedAsset / withAssetVersion
 * before putting ?v= into HTML.
 */
export function assetHash(relPath) {
  const key = normalizeRelPath(relPath);
  let hash = hashCache.get(key);
  if (!hash) {
    hash = fileContentHash(resolve(ROOT, key));
    hashCache.set(key, hash);
  }
  return hash;
}

/** Query suffix `?v=<hash>` for a content-hashed asset, else empty string. */
export function assetVersionQuery(relPath) {
  if (!isContentHashedAsset(relPath)) return "";
  return `?v=${assetHash(relPath)}`;
}

/**
 * Append a content-hash query to an already-resolved href for static assets.
 * Mutable runtime data (data/*) is returned unchanged — fixed URL, short cache.
 * Preserves any existing hash fragment.
 */
export function withAssetVersion(href, relPath) {
  if (!isContentHashedAsset(relPath)) return href;
  const q = assetVersionQuery(relPath);
  if (!q) return href;
  const hashIdx = href.indexOf("#");
  const before = hashIdx === -1 ? href : href.slice(0, hashIdx);
  const after = hashIdx === -1 ? "" : href.slice(hashIdx);
  if (before.includes("?")) {
    return `${before}&v=${assetHash(relPath)}${after}`;
  }
  return `${before}${q}${after}`;
}

/** Parse _headers and find Cache-Control rules that can stack on one path. */
export function overlappingCacheControlRules(text) {
  const rules = [];
  let path = null;
  let cache = null;
  const flush = () => {
    if (path && cache) rules.push({ path, cache });
    path = null;
    cache = null;
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (!raw.startsWith(" ") && !raw.startsWith("\t") && !line.includes(":")) {
      flush();
      path = line;
      continue;
    }
    const match = line.match(/^Cache-Control:\s*(.+)$/i);
    if (match) cache = match[1].trim();
  }
  flush();

  const overlaps = [];
  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      if (pathsOverlap(rules[i].path, rules[j].path)) {
        overlaps.push([rules[i], rules[j]]);
      }
    }
  }
  return overlaps;
}

function pathsOverlap(a, b) {
  if (a === b) return true;
  if (a === "/*" || b === "/*") return true;
  const file = a.includes("*") ? b : a;
  const pattern = a.includes("*") ? a : b;
  if (!pattern.includes("*")) return false;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`).test(file);
}
