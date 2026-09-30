/**
 * Official NY Open Data drawing-feed parsers and completeness checks.
 * No network. fetch-draws.mjs is the only caller that downloads.
 */

import { GAME_RULES, MAX_HISTORICAL_BACKFILL, RECENT_DRAW_WINDOW_DAYS } from "./draw-validate.mjs";

const COLUMN_ALIASES = {
  draw_date: ["draw date", "draw_date"],
  winning_numbers: ["winning numbers", "winning_numbers"],
  mega_ball: ["mega ball", "mega_ball"],
  multiplier: ["multiplier"],
};

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const source = String(text).replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else quoted = false;
      } else field += char;
      continue;
    }
    if (char === '"') {
      quoted = true;
      continue;
    }
    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }
    if (char === "\n" || char === "\r") {
      if (char === "\r" && source[index + 1] === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      continue;
    }
    field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    if (row.some((value) => value !== "")) rows.push(row);
  }
  return rows;
}

export function normalizeDrawDate(value) {
  const text = String(value ?? "").trim();
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const us = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!us) return null;
  return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
}

function headerIndex(headers, aliases) {
  const normalized = headers.map((header) => String(header ?? "").trim().toLowerCase());
  return aliases.map((alias) => normalized.indexOf(alias)).find((index) => index >= 0) ?? -1;
}

export function mapHeaderIndexes(headers, key) {
  const drawDate = headerIndex(headers, COLUMN_ALIASES.draw_date);
  const winningNumbers = headerIndex(headers, COLUMN_ALIASES.winning_numbers);
  const megaBall = headerIndex(headers, COLUMN_ALIASES.mega_ball);
  const missing = [];
  if (drawDate < 0) missing.push("Draw Date");
  if (winningNumbers < 0) missing.push("Winning Numbers");
  if (key === "megamillions" && megaBall < 0) missing.push("Mega Ball");
  if (missing.length) {
    return { ok: false, reason: `missing required column ${missing.join(", ")}` };
  }
  return { ok: true, drawDate, winningNumbers, megaBall };
}

function recordsFromCsv(text, key) {
  const table = parseCsv(text);
  if (!table.length) return { ok: false, reason: "empty CSV" };
  const mapped = mapHeaderIndexes(table[0], key);
  if (!mapped.ok) return mapped;
  const records = table.slice(1).map((cells) => ({
    draw_date: cells[mapped.drawDate] ?? "",
    winning_numbers: cells[mapped.winningNumbers] ?? "",
    mega_ball: mapped.megaBall >= 0 ? cells[mapped.megaBall] ?? "" : "",
  }));
  return { ok: true, records, rawCount: records.length };
}

function recordsFromJson(payload, key) {
  const rows = Array.isArray(payload) ? payload : null;
  if (!rows) return { ok: false, reason: "JSON payload is not a row array" };
  if (!rows.length) return { ok: false, reason: "empty JSON" };
  const headers = Object.keys(rows[0]);
  const mapped = mapHeaderIndexes(headers, key);
  if (!mapped.ok) return mapped;
  const records = rows.map((row) => {
    const entries = Object.entries(row).map(([name, value]) => [name.trim().toLowerCase(), value]);
    const lookup = Object.fromEntries(entries);
    const drawDate = COLUMN_ALIASES.draw_date.map((name) => lookup[name]).find((value) => value != null);
    const winning = COLUMN_ALIASES.winning_numbers.map((name) => lookup[name]).find((value) => value != null);
    const mega = COLUMN_ALIASES.mega_ball.map((name) => lookup[name]).find((value) => value != null);
    return {
      draw_date: drawDate ?? "",
      winning_numbers: winning ?? "",
      mega_ball: mega ?? "",
    };
  });
  return { ok: true, records, rawCount: records.length };
}

function drawFromRecord(key, record) {
  const date = normalizeDrawDate(record.draw_date);
  if (!date) return { ok: false, reason: "unrecognized draw date" };
  const rules = GAME_RULES[key];
  if (date < rules.from) return { ok: true, ignored: true, date };
  const numbers = String(record.winning_numbers ?? "")
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter((value) => Number.isInteger(value) && value > 0);
  let main = numbers;
  const rawSpecial = String(record.mega_ball ?? "").trim();
  let special = rawSpecial === "" ? NaN : Number(rawSpecial);
  if (main.length === 6 && !Number.isInteger(special)) {
    special = main[5];
    main = main.slice(0, 5);
  } else if (main.length === 6) {
    main = main.slice(0, 5);
  }
  const draw = { d: date, n: main.slice().sort((a, b) => a - b), s: special };
  return { ok: true, ignored: false, draw };
}

/**
 * Turn official records into current-matrix draws. An in-matrix row that
 * cannot be validated is an error, not a row to skip.
 */
export function drawsFromOfficialPayload(key, payload, format) {
  const decoded = format === "csv" ? recordsFromCsv(payload, key) : recordsFromJson(payload, key);
  if (!decoded.ok) return { ...decoded, draws: [], parseFailures: 0, duplicateDates: 0, rawCount: 0 };
  const draws = [];
  const seen = new Map();
  let parseFailures = 0;
  let duplicateDates = 0;
  let ignoredBeforeMatrix = 0;
  const failureSamples = [];
  for (const record of decoded.records) {
    const parsed = drawFromRecord(key, record);
    if (!parsed.ok) {
      parseFailures += 1;
      if (failureSamples.length < 3) failureSamples.push(parsed.reason);
      continue;
    }
    if (parsed.ignored) {
      ignoredBeforeMatrix += 1;
      continue;
    }
    const error = validateImportedDraw(key, parsed.draw);
    if (error) {
      parseFailures += 1;
      if (failureSamples.length < 3) failureSamples.push(`${parsed.draw.d}: ${error}`);
      continue;
    }
    if (seen.has(parsed.draw.d)) {
      duplicateDates += 1;
      const prior = seen.get(parsed.draw.d);
      if (prior.n.join(",") !== parsed.draw.n.join(",") || prior.s !== parsed.draw.s) {
        parseFailures += 1;
        failureSamples.push(`${parsed.draw.d}: conflicting duplicate`);
      }
      continue;
    }
    seen.set(parsed.draw.d, parsed.draw);
    draws.push(parsed.draw);
  }
  draws.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  if (parseFailures > 0) {
    return {
      ok: false,
      reason: `${parseFailures} malformed current-matrix row(s): ${failureSamples.join("; ")}`,
      draws,
      parseFailures,
      duplicateDates,
      rawCount: decoded.rawCount,
      ignoredBeforeMatrix,
    };
  }
  return {
    ok: true,
    draws,
    parseFailures,
    duplicateDates,
    rawCount: decoded.rawCount,
    ignoredBeforeMatrix,
  };
}

function validateImportedDraw(key, draw) {
  const rules = GAME_RULES[key];
  if (!Array.isArray(draw.n) || draw.n.length !== rules.pick) return "wrong white-ball count";
  if (new Set(draw.n).size !== rules.pick) return "duplicate white balls";
  if (draw.n.some((n) => !Number.isInteger(n) || n < 1 || n > rules.mainMax)) return "white ball out of range";
  const specialMax = rules.specialMaxOn(draw.d);
  if (!Number.isInteger(draw.s) || draw.s < 1 || draw.s > specialMax) return "special ball out of range";
  return null;
}

function cutoffDate(latest) {
  const utc = Date.parse(`${latest}T12:00:00Z`);
  return new Date(utc - RECENT_DRAW_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
}

/**
 * Compare a parsed current-matrix feed with the stored snapshot.
 * status: complete | repairable | behind | incomplete
 */
export function classifyOfficialFeed(key, draws, existingHistory) {
  const rules = GAME_RULES[key];
  if (!Array.isArray(draws) || draws.length === 0) {
    return { status: "incomplete", reason: "no current-matrix rows" };
  }
  const latest = draws[0].d;
  const first = draws[draws.length - 1].d;
  const existing = existingHistory?.draws;
  if (!Array.isArray(existing) || existing.length === 0) {
    if (first !== rules.from) return { status: "incomplete", reason: `first draw ${first} is not ${rules.from}` };
    return { status: "complete", reason: "no stored snapshot" };
  }
  const fetchedDates = new Set(draws.map((draw) => draw.d));
  const missing = existing.filter((draw) => !fetchedDates.has(draw.d));
  const overlap = existing.length - missing.length;
  const missingBefore = missing.filter((draw) => draw.d <= latest);
  const missingAfter = missing.filter((draw) => draw.d > latest);
  if (missingBefore.length === 0 && latest >= existing[0].d && first === rules.from) {
    return { status: "complete", reason: "feed covers the stored history", overlap, missing: 0 };
  }
  if (missingBefore.length === 0 && latest < existing[0].d && first === rules.from && missingAfter.length === missing.length) {
    return {
      status: "behind",
      reason: `official source is behind existing validated snapshot (${latest} < ${existing[0].d})`,
      overlap,
      missing: missing.length,
    };
  }
  const historical = missing.filter((draw) => draw.d < cutoffDate(latest));
  if (
    first !== rules.from &&
    missing.length <= MAX_HISTORICAL_BACKFILL &&
    historical.length === missing.length &&
    latest >= existing[0].d
  ) {
    return {
      status: "repairable",
      reason: `feed omitted ${missing.map((draw) => draw.d).join(", ")}`,
      overlap,
      missing: missing.length,
    };
  }
  return {
    status: "incomplete",
    reason: `truncated feed omitted ${missing.length} stored dates (overlap ${overlap}/${existing.length}, first ${first}, latest ${latest})`,
    overlap,
    missing: missing.length,
  };
}

export function selectOfficialEndpoint(attempts) {
  for (const attempt of attempts) {
    if (attempt.status === "behind") return { ok: true, behind: true, chosen: attempt };
    if (attempt.status === "complete" || attempt.status === "repairable") {
      return { ok: true, behind: false, chosen: attempt };
    }
  }
  const reason = attempts.map((attempt) => `${attempt.name}: ${attempt.reason || attempt.status}`).join("; ");
  return { ok: false, reason: reason || "no official endpoint attempts" };
}
