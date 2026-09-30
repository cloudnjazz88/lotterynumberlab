/**
 * Downloads Mega Millions and Powerball drawing history from the New York
 * State open-data portal (Socrata) and writes data/draws.json plus
 * data/draws.js (a plain script, so the app also runs straight from file://).
 *
 * Only drawings from each game's current ball matrix are kept:
 *   Mega Millions  5/70 + Mega Ball  from 2017-10-31
 *   Powerball      5/69 + 1/26       from 2015-10-07
 *
 * The primary download is the official full CSV export. A short legacy
 * /resource response is incomplete and is not accepted. At most one omitted
 * historical row may be kept from the stored snapshot. A recent gap, a bad
 * fetched row, or a larger hole fails that endpoint.
 *
 * When the Mega Millions NY history is truncated, the validated snapshot is
 * kept and extended only from the official Mega Millions recent-drawings API.
 * Powerball continues from its NY dataset. The fetch fails only when Powerball
 * or that official recent source fails.
 *
 * Run: node tools/fetch-draws.mjs
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GAME_RULES,
  mergeDrawingHistory,
  shouldReplaceSnapshot,
  drawingRowsEqual,
  validateDraw,
  validateGameHistory,
} from "./draw-validate.mjs";
import {
  classifyOfficialFeed,
  drawsFromOfficialPayload,
  selectOfficialEndpoint,
} from "./ny-feed.mjs";
import {
  HYBRID_SOURCE,
  combineDrawingPages,
  drawsFromOfficialRecentRows,
  isoToUsDate,
  parseDrawingPagingResponse,
  recentQueryWindow,
  resolveMegaMillionsHistory,
  sharedDrawConflicts,
} from "./mm-recent.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_JSON = resolve(HERE, "..", "data", "draws.json");
const OUT_JS = resolve(HERE, "..", "data", "draws.js");

const SOURCES = {
  megamillions: {
    dataset: "5xaw-6ayf",
    title: "Lottery Mega Millions Winning Numbers: Beginning 2002",
    select: "draw_date,winning_numbers,mega_ball",
    specialField: "mega_ball",
  },
  powerball: {
    dataset: "d6yy-54nr",
    title: "Lottery Powerball Winning Numbers: Beginning 2010",
    select: "draw_date,winning_numbers",
    specialField: null,
  },
};

function officialEndpoints(dataset) {
  return [
    {
      name: "csv-export",
      format: "csv",
      url: `https://data.ny.gov/api/v3/views/${dataset}/export.csv?accessType=DOWNLOAD`,
    },
    {
      name: "csv-rows",
      format: "csv",
      url: `https://data.ny.gov/api/views/${dataset}/rows.csv?accessType=DOWNLOAD`,
    },
    {
      name: "api-v3",
      format: "json",
      url: `https://data.ny.gov/api/v3/views/${dataset}/query.json?accessType=DOWNLOAD`,
    },
    {
      name: "legacy-resource",
      format: "json",
      url: `https://data.ny.gov/resource/${dataset}.json?$limit=50000`,
    },
  ];
}

async function loadExisting() {
  try {
    return JSON.parse(await readFile(OUT_JSON, "utf8"));
  } catch {
    return null;
  }
}

async function readEndpoint(endpoint) {
  const res = await fetch(endpoint.url, {
    headers: { accept: endpoint.format === "csv" ? "text/csv" : "application/json" },
    redirect: "follow",
    signal: AbortSignal.timeout(60000),
  });
  const text = await res.text();
  return {
    ok: res.ok,
    status: res.status,
    finalUrl: res.url,
    contentType: res.headers.get("content-type") || "",
    bytes: Buffer.byteLength(text),
    text,
  };
}

async function fetchNyAttempts(key, source, existingHistory) {
  const attempts = [];
  for (const endpoint of officialEndpoints(source.dataset)) {
    let response;
    try {
      response = await readEndpoint(endpoint);
    } catch (error) {
      attempts.push({ name: endpoint.name, status: "incomplete", reason: error.message });
      console.warn(`${source.dataset} ${endpoint.name}: request failed (${error.message})`);
      continue;
    }
    if (!response.ok) {
      attempts.push({ name: endpoint.name, status: "incomplete", reason: `HTTP ${response.status}` });
      console.warn(`${source.dataset} ${endpoint.name}: HTTP ${response.status}`);
      continue;
    }
    let payload = response.text;
    if (endpoint.format === "json") {
      try {
        payload = JSON.parse(response.text);
      } catch (error) {
        attempts.push({ name: endpoint.name, status: "incomplete", reason: `invalid JSON (${error.message})` });
        console.warn(`${source.dataset} ${endpoint.name}: invalid JSON`);
        continue;
      }
    }
    const parsed = drawsFromOfficialPayload(key, payload, endpoint.format);
    const classified = parsed.ok
      ? classifyOfficialFeed(key, parsed.draws, existingHistory)
      : { status: "incomplete", reason: parsed.reason, overlap: 0, missing: null };
    attempts.push({
      name: endpoint.name,
      status: classified.status,
      reason: classified.reason,
      draws: parsed.draws,
    });
    console.log(
      `${source.dataset} ${endpoint.name}: HTTP ${response.status} ${response.bytes} bytes raw ${parsed.rawCount ?? 0} matrix ${parsed.draws?.length ?? 0} first ${parsed.draws?.at?.(-1)?.d || "-"} latest ${parsed.draws?.[0]?.d || "-"} dupes ${parsed.duplicateDates ?? 0} parseFailures ${parsed.parseFailures ?? 0} -> ${classified.status}`,
    );
    const selected = selectOfficialEndpoint(attempts);
    if (selected.ok && selected.chosen.name === endpoint.name) return { attempts, selected };
  }
  return { attempts, selected: selectOfficialEndpoint(attempts) };
}

async function fetchOfficialMegaRecent(latestDraw) {
  const window = recentQueryWindow(latestDraw);
  const url = "https://www.megamillions.com/cmspages/utilservice.asmx/GetDrawingPagingData";
  const pages = [];
  let total = null;
  try {
    for (let pageNumber = 1; pageNumber <= 10; pageNumber += 1) {
      const response = await fetch(url, {
        method: "POST",
        redirect: "follow",
        headers: {
          "content-type": "application/json; charset=utf-8",
          accept: "application/json",
          "user-agent": "LotteryNumberLab/1.0 (+https://lotterynumberlab.com)",
        },
        body: JSON.stringify({
          pageNumber,
          pageSize: 200,
          startDate: isoToUsDate(window.start),
          endDate: isoToUsDate(window.end),
        }),
        signal: AbortSignal.timeout(60000),
      });
      const host = new URL(response.url).hostname;
      if (host !== "www.megamillions.com" && host !== "megamillions.com") {
        return { ok: false, reason: `official recent final host ${host} is not megamillions.com` };
      }
      const text = await response.text();
      if (!response.ok) return { ok: false, reason: `HTTP ${response.status}`, status: response.status };
      const parsed = parseDrawingPagingResponse(text);
      if (!parsed.ok) return parsed;
      if (total == null) total = parsed.totalResults;
      if (parsed.totalResults !== total) {
        return { ok: false, reason: "official recent TotalResults changed between pages" };
      }
      pages.push({ totalResults: total, rows: parsed.rows });
      const received = pages.reduce((sum, page) => sum + page.rows.length, 0);
      console.log(
        `megamillions official recent page ${pageNumber}: HTTP ${response.status} rows ${parsed.rows.length} total ${total} received ${received} window ${window.start}..${window.end}`,
      );
      if (received >= total) break;
      if (parsed.rows.length < 200) {
        return { ok: false, reason: `official recent pagination truncation (${received}/${total})` };
      }
    }
  } catch (error) {
    return { ok: false, reason: error.message };
  }
  const combined = combineDrawingPages(pages);
  if (!combined.ok) return combined;
  const normalized = drawsFromOfficialRecentRows(combined.rows);
  if (!normalized.ok) return normalized;
  for (const draw of normalized.draws) {
    const error = validateDraw("megamillions", draw);
    if (error) return { ok: false, reason: `${draw.d}: ${error}` };
  }
  return { ok: true, draws: normalized.draws, rows: normalized.draws.length, window };
}

function describeLatestComparison(existingDraws, recentDraws) {
  const stored = new Map(existingDraws.map((draw) => [draw.d, draw]));
  for (const draw of recentDraws.slice(0, 10)) {
    const previous = stored.get(draw.d);
    const same = previous && previous.s === draw.s && previous.n.join(",") === draw.n.join(",");
    const state = !previous ? "new" : same ? "matches snapshot" : "DIFFERS";
    console.log(`recent ${draw.d} ${draw.n.join("-")} + ${draw.s} ${state}`);
  }
}

function sameRows(left, right) {
  return (
    left.length === right.length &&
    left.every((draw, index) => {
      const other = right[index];
      return other && draw.d === other.d && draw.s === other.s && draw.n.join(",") === other.n.join(",");
    })
  );
}

function historyFromDraws(existingHistory, draws, sourceKind, nyEndpoint) {
  if (sameRows(existingHistory.draws, draws)) return existingHistory;
  const history = {
    count: draws.length,
    latestDraw: draws[0]?.d,
    firstDraw: draws.at(-1)?.d,
    draws,
  };
  const error = validateGameHistory("megamillions", history);
  if (error) throw new Error(error);
  const hybrid = sourceKind === "hybrid";
  return {
    source: hybrid
      ? HYBRID_SOURCE
      : `data.ny.gov · ${SOURCES.megamillions.title} (${SOURCES.megamillions.dataset}) via ${nyEndpoint}`,
    sources: hybrid
      ? ["NY Open Data historical snapshot", "Mega Millions official recent drawings"]
      : ["NY Open Data"],
    ...history,
  };
}

async function fetchMegaMillions(existingHistory) {
  const invalid = validateGameHistory("megamillions", existingHistory);
  if (invalid) throw new Error(invalid);
  const { attempts, selected } = await fetchNyAttempts("megamillions", SOURCES.megamillions, existingHistory);
  const matrixRows = Math.max(0, ...attempts.map((attempt) => attempt.draws?.length || 0));
  if (selected.ok && !selected.behind) {
    const conflicts = sharedDrawConflicts(existingHistory.draws, selected.chosen.draws);
    if (conflicts.length) {
      throw new Error(
        `megamillions: NY feed conflicts with snapshot on ${conflicts.map((item) => `${item.date}: snapshot ${item.snapshot}; NY ${item.fetched}`).join("; ")}`,
      );
    }
    const merged = mergeDrawingHistory("megamillions", selected.chosen.draws, existingHistory);
    if (!merged.ok) throw new Error(merged.reason);
    for (const item of merged.backfilled) {
      console.warn(`historical fallback: kept validated Mega Millions row ${item.date} — ${item.reason}`);
    }
    const recent = await fetchOfficialMegaRecent(merged.latestDraw);
    if (!recent.ok) console.warn(`megamillions official recent check unavailable (${recent.reason}); using verified NY history`);
    else describeLatestComparison(merged.draws, recent.draws);
    const resolved = resolveMegaMillionsHistory({
      existingDraws: merged.draws,
      nyStatus: "complete",
      nyDraws: merged.draws,
      recent,
    });
    if (!resolved.ok) throw new Error(`megamillions: ${resolved.reason}`);
    if (resolved.status === "behind") {
      console.warn("official source is behind existing validated snapshot for Mega Millions");
    }
    const draws = resolved.status === "ny-primary-extended" ? resolved.draws : merged.draws;
    return historyFromDraws(existingHistory, draws, resolved.source, selected.chosen.name);
  }
  if (selected.ok && selected.behind) {
    console.warn(`official source is behind existing validated snapshot for Mega Millions: ${selected.chosen.reason}`);
  } else {
    console.warn(
      `WARNING megamillions: NY historical dataset incomplete (${matrixRows} current-matrix rows; existing ${existingHistory.count}). Using verified existing history plus official Mega Millions recent results.`,
    );
  }
  const recent = await fetchOfficialMegaRecent(existingHistory.latestDraw);
  if (recent.ok) describeLatestComparison(existingHistory.draws, recent.draws);
  const resolved = resolveMegaMillionsHistory({
    existingDraws: existingHistory.draws,
    nyStatus: "incomplete",
    recent,
  });
  if (!resolved.ok) throw new Error(`megamillions: ${resolved.reason}`);
  if (resolved.status === "behind") {
    console.warn("official source is behind existing validated snapshot");
  }
  console.log(`megamillions official recent rows ${recent.rows} overlap ${resolved.overlap}`);
  return historyFromDraws(existingHistory, resolved.draws, resolved.source, null);
}

async function fetchGame(key, source, existingHistory) {
  const { attempts, selected } = await fetchNyAttempts(key, source, existingHistory);
  if (!selected.ok) {
    throw new Error(`${key}: no complete official endpoint (${selected.reason || attempts.map((item) => `${item.name}: ${item.reason}`).join("; ")})`);
  }
  if (selected.behind) {
    console.warn(
      `official source is behind existing validated snapshot for ${GAME_RULES[key].label}: ${selected.chosen.reason}`,
    );
    return existingHistory;
  }
  const merged = mergeDrawingHistory(key, selected.chosen.draws, existingHistory);
  if (!merged.ok) throw new Error(merged.reason);
  for (const item of merged.backfilled) {
    console.warn(`historical fallback: kept validated ${GAME_RULES[key].label} row ${item.date} — ${item.reason}`);
  }
  return {
    source: `data.ny.gov · ${source.title} (${source.dataset}) via ${selected.chosen.name}`,
    count: merged.count,
    latestDraw: merged.latestDraw,
    firstDraw: merged.firstDraw,
    draws: merged.draws,
  };
}

const existing = await loadExisting();

let games;
try {
  games = {};
  games.megamillions = await fetchMegaMillions(existing?.games?.megamillions ?? null);
  games.powerball = await fetchGame("powerball", SOURCES.powerball, existing?.games?.powerball ?? null);
  for (const key of Object.keys(SOURCES)) {
    const g = games[key];
    console.log(
      `${GAME_RULES[key].label.padEnd(14)} ${g.count} draws  ${g.firstDraw} .. ${g.latestDraw}` +
        `  main max ${Math.max(...g.draws.flatMap((d) => d.n))}` +
        `  special ${Math.min(...g.draws.map((d) => d.s))}-${Math.max(...g.draws.map((d) => d.s))}`,
    );
  }
} catch (error) {
  console.error(`fetch failed; leaving existing snapshot in place.\n${error.message || error}`);
  process.exitCode = 1;
}

if (!process.exitCode) {
  const snapshot = { fetchedAt: new Date().toISOString(), games };
  const replace = shouldReplaceSnapshot(existing, snapshot);
  if (!replace.ok) {
    console.error(`refusing to overwrite snapshot: ${replace.reason}`);
    process.exitCode = 1;
  } else if (drawingRowsEqual(existing, snapshot)) {
    console.log("\nno new drawings; existing snapshot kept");
  } else {
    await mkdir(dirname(OUT_JSON), { recursive: true });
    await writeFile(OUT_JSON, JSON.stringify(snapshot), "utf8");
    await writeFile(
      OUT_JS,
      `/* Auto-generated by tools/fetch-draws.mjs - do not edit by hand. */\n` +
        `window.LOTTO_SNAPSHOT = ${JSON.stringify(snapshot)};\n`,
      "utf8",
    );
    console.log(`\nwrote ${OUT_JSON}`);
    console.log(`wrote ${OUT_JS}`);
  }
}
