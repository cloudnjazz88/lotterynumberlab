/**
 * Stable content hashes for cache-busted static URLs.
 * The hash changes only when file bytes change.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const HASH_LENGTH = 12;
const STYLES = fileURLToPath(new URL("../styles.css", import.meta.url));

export function contentHash(bytes, length = HASH_LENGTH) {
  return createHash("sha256").update(bytes).digest("hex").slice(0, length);
}

export function fileContentHash(path, length = HASH_LENGTH) {
  return contentHash(readFileSync(path), length);
}

let styles = null;

export function stylesHash() {
  styles ??= fileContentHash(STYLES);
  return styles;
}

export function stylesheetHref() {
  return `/styles.css?v=${stylesHash()}`;
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
