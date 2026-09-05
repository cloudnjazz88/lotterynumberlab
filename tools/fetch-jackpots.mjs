/**
 * Fetches the next-drawing jackpot estimates from official game sites only.
 * A failed game keeps its previous verified row. A failed fetch never wipes
 * the file. Run: node tools/fetch-jackpots.mjs
 */

import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMegaMillionsPayload, parsePowerballHtml, looksLikeChallenge, gameContentEqual } from "./jackpot-parse.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "..", "data", "jackpots.json");
const UA = "LotteryNumberLab/1.0 (+https://lotterynumberlab.com/about.html)";

async function loadExisting() {
  try {
    return JSON.parse(await readFile(OUT, "utf8"));
  } catch {
    return { updatedAt: null, games: {} };
  }
}

async function fetchMegaMillions() {
  const res = await fetch("https://www.megamillions.com/cmspages/utilservice.asmx/GetLatestDrawData", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json; charset=UTF-8",
      origin: "https://www.megamillions.com",
      referer: "https://www.megamillions.com/",
      "x-requested-with": "XMLHttpRequest",
      "user-agent": UA,
    },
    body: "{}",
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const wrap = await res.json();
  const payload = typeof wrap?.d === "string" ? JSON.parse(wrap.d) : wrap;
  return parseMegaMillionsPayload(payload);
}

async function fetchPowerball() {
  const res = await fetch("https://www.powerball.com/", {
    headers: { accept: "text/html", "user-agent": UA },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (looksLikeChallenge(html)) throw new Error("challenge page");
  return parsePowerballHtml(html);
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(tmp, text, "utf8");
  try {
    await rename(tmp, path);
  } catch {
    await writeFile(path, text, "utf8");
    await unlink(tmp).catch(() => {});
  }
}

const existing = await loadExisting();
const now = new Date().toISOString();
const games = { ...existing.games };
let fetched = 0;
let changed = false;

for (const [key, loader] of [
  ["megamillions", fetchMegaMillions],
  ["powerball", fetchPowerball],
]) {
  try {
    const parsed = await loader();
    const row = { ...parsed, verifiedAt: now };
    if (!gameContentEqual(existing.games[key], row)) changed = true;
    games[key] = row;
    fetched += 1;
    const cash = row.cashOption || row.cashValue;
    console.log(
      `${key.padEnd(14)} ${row.estimatedJackpot.display} / ${cash.display}  next ${row.nextDrawing}`,
    );
  } catch (error) {
    console.warn(`${key}: keep previous row (${error.message})`);
  }
}

if (!fetched) {
  console.warn("no verified jackpot rows; leaving file unchanged");
  process.exit(0);
}

const snapshot = { updatedAt: now, games };
await atomicWriteJson(OUT, snapshot);
console.log(changed ? `wrote ${OUT}` : `reverified ${OUT}`);
