/**
 * Official Mega Millions recent drawings.
 * Parses the site's GetDrawingPagingData JSON and merges it onto a
 * validated snapshot. No network.
 */

const TZ = "America/New_York";

export const MEGA_MILLIONS_SCHEDULE = {
  days: [2, 5],
  hour: 23,
  minute: 0,
  graceMs: 4 * 3600 * 1000,
};

export const MIN_OFFICIAL_OVERLAP = 10;
export const RECENT_LOOKBACK_DAYS = 120;

export const HYBRID_SOURCE =
  "NY Open Data historical snapshot + Mega Millions official recent drawings";

function tzOffsetMs(instant) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = {};
  for (const part of fmt.formatToParts(instant)) parts[part.type] = part.value;
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour % 24,
    +parts.minute,
    +parts.second,
  );
  return asUTC - instant.getTime();
}

export function easternTimeToInstant(year, month, day, hour, minute) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  for (let i = 0; i < 3; i += 1) {
    guess = new Date(Date.UTC(year, month - 1, day, hour, minute) - tzOffsetMs(guess));
  }
  return guess;
}

export function easternDateISO(instant) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function shiftIsoDate(iso, days) {
  const utc = Date.parse(`${iso}T12:00:00Z`);
  return new Date(utc + days * 86400000).toISOString().slice(0, 10);
}

export function isoWeekday(iso) {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

export function isoToUsDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

export function recentQueryWindow(latestDraw, now = new Date(), lookbackDays = RECENT_LOOKBACK_DAYS) {
  const end = easternDateISO(now);
  const start = shiftIsoDate(latestDraw, -lookbackDays);
  return { start, end: end < start ? start : end };
}

function copyDraw(draw) {
  return { d: draw.d, n: draw.n.slice(), s: draw.s };
}

export function formatDraw(draw) {
  return `${draw.d} ${(draw.n || []).join("-")} + ${draw.s}`;
}

function sameDraw(left, right) {
  return left.s === right.s && left.n.join(",") === right.n.join(",");
}

/**
 * Most recent Tuesday/Friday whose 11:00 p.m. ET drawing plus the 4-hour
 * publication grace is already in the past. Matches isAwaitingOfficialResult.
 */
export function latestDueDrawDate(now = new Date(), schedule = MEGA_MILLIONS_SCHEDULE) {
  const easternNow = new Date(now.getTime() + tzOffsetMs(now));
  for (let back = 0; back < 14; back += 1) {
    const probe = new Date(easternNow.getTime() - back * 86400000);
    if (!schedule.days.includes(probe.getUTCDay())) continue;
    const instant = easternTimeToInstant(
      probe.getUTCFullYear(),
      probe.getUTCMonth() + 1,
      probe.getUTCDate(),
      schedule.hour,
      schedule.minute,
    );
    if (instant.getTime() + schedule.graceMs > now.getTime()) continue;
    return easternDateISO(instant);
  }
  return null;
}

export function scheduledDatesBetween(start, end, schedule = MEGA_MILLIONS_SCHEDULE) {
  if (!start || !end || start > end) return [];
  const dates = [];
  let cursor = start;
  while (cursor <= end) {
    if (schedule.days.includes(isoWeekday(cursor))) dates.push(cursor);
    cursor = shiftIsoDate(cursor, 1);
  }
  return dates;
}

export function parseDrawingPagingResponse(body) {
  let outer = body;
  if (typeof body === "string") {
    try {
      outer = JSON.parse(body);
    } catch {
      return { ok: false, reason: "official recent response is not the DrawingData JSON", rows: [] };
    }
  }
  let inner = outer;
  if (outer && typeof outer.d === "string") {
    try {
      inner = JSON.parse(outer.d);
    } catch {
      return { ok: false, reason: "official recent payload d is not JSON", rows: [] };
    }
  }
  if (!inner || !Array.isArray(inner.DrawingData)) {
    return { ok: false, reason: "official recent response has no DrawingData rows", rows: [] };
  }
  if (inner.DrawingData.length === 0) {
    return { ok: false, reason: "official recent result rows 0", rows: [], totalResults: 0 };
  }
  const totalResults = Number(inner.TotalResults);
  if (!Number.isFinite(totalResults)) {
    return { ok: false, reason: "official recent response has no TotalResults", rows: inner.DrawingData };
  }
  return { ok: true, totalResults, rows: inner.DrawingData };
}

export function combineDrawingPages(pages) {
  if (!Array.isArray(pages) || pages.length === 0) {
    return { ok: false, reason: "official recent pagination returned no pages", rows: [] };
  }
  const total = Number(pages[0].totalResults);
  const rows = [];
  for (const page of pages) {
    if (!Array.isArray(page.rows) || page.rows.length === 0) {
      return { ok: false, reason: "official recent pagination truncation", rows: [] };
    }
    rows.push(...page.rows);
  }
  if (!Number.isFinite(total) || rows.length !== total) {
    return {
      ok: false,
      reason: `official recent pagination truncation (${rows.length}/${Number.isFinite(total) ? total : "?"})`,
      rows: [],
    };
  }
  return { ok: true, rows, totalResults: total };
}

export function drawsFromOfficialRecentRows(rows) {
  const draws = [];
  const seen = new Set();
  for (const row of rows) {
    const date = String(row?.PlayDate || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { ok: false, reason: "official recent row has no PlayDate", draws: [] };
    }
    const whites = [row.N1, row.N2, row.N3, row.N4, row.N5].map(Number);
    if (whites.some((ball) => !Number.isInteger(ball))) {
      return { ok: false, reason: `${date}: official recent row is missing a white ball`, draws: [] };
    }
    const mega = Number(row.MBall);
    if (!Number.isInteger(mega)) {
      return { ok: false, reason: `${date}: official recent row is missing the Mega Ball`, draws: [] };
    }
    if (seen.has(date)) return { ok: false, reason: `official recent duplicate date ${date}`, draws: [] };
    seen.add(date);
    draws.push({ d: date, n: whites.slice().sort((a, b) => a - b), s: mega });
  }
  draws.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  return { ok: true, draws };
}

export function sharedDrawConflicts(existingDraws, fetchedDraws) {
  const stored = new Map((existingDraws || []).map((draw) => [draw.d, draw]));
  const conflicts = [];
  for (const draw of fetchedDraws || []) {
    const previous = stored.get(draw.d);
    if (previous && !sameDraw(previous, draw)) {
      conflicts.push({ date: draw.d, snapshot: formatDraw(previous), fetched: formatDraw(draw) });
    }
  }
  return conflicts;
}

/**
 * Keep the validated snapshot and append only newer official recent drawings.
 * Overlap under MIN_OFFICIAL_OVERLAP, a number conflict, an internal missing
 * Tuesday/Friday, or a published drawing missing from both sources fails.
 */
export function extendWithOfficialRecent({
  existingDraws,
  recentDraws,
  now = new Date(),
  minOverlap = MIN_OFFICIAL_OVERLAP,
  schedule = MEGA_MILLIONS_SCHEDULE,
}) {
  if (!Array.isArray(recentDraws) || recentDraws.length === 0) {
    return { ok: false, reason: "official recent result rows 0", draws: existingDraws || [], added: [] };
  }
  recentDraws = recentDraws.slice().sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  const existing = Array.isArray(existingDraws) ? existingDraws : [];
  const existingByDate = new Map(existing.map((draw) => [draw.d, draw]));
  const recentSet = new Set();
  const overlaps = [];
  for (const draw of recentDraws) {
    if (recentSet.has(draw.d)) {
      return { ok: false, reason: `official recent duplicate date ${draw.d}`, draws: [], added: [] };
    }
    recentSet.add(draw.d);
    if (!schedule.days.includes(isoWeekday(draw.d))) {
      return {
        ok: false,
        reason: `official recent date ${draw.d} is not a Tuesday or Friday drawing`,
        draws: [],
        added: [],
      };
    }
    const stored = existingByDate.get(draw.d);
    if (!stored) continue;
    if (!sameDraw(stored, draw)) {
      return {
        ok: false,
        reason: `overlap conflict ${draw.d}: snapshot ${formatDraw(stored)}; official ${formatDraw(draw)}`,
        draws: [],
        added: [],
        date: draw.d,
        snapshot: formatDraw(stored),
        official: formatDraw(draw),
      };
    }
    overlaps.push(draw.d);
  }
  if (overlaps.length < minOverlap) {
    return {
      ok: false,
      reason: `official recent overlap ${overlaps.length} is below ${minOverlap}`,
      draws: [],
      added: [],
      overlap: overlaps.length,
    };
  }

  const oldest = recentDraws[recentDraws.length - 1].d;
  const newest = recentDraws[0].d;
  const holes = scheduledDatesBetween(oldest, newest, schedule).filter((date) => !recentSet.has(date));
  if (holes.length) {
    return {
      ok: false,
      reason: `official recent omitted published drawings: ${holes.join(", ")}`,
      draws: [],
      added: [],
    };
  }

  const due = latestDueDrawDate(now, schedule);
  const dueAfter = due && due > newest ? scheduledDatesBetween(shiftIsoDate(newest, 1), due, schedule) : [];
  if (dueAfter.length) {
    const missingPublished = dueAfter.filter((date) => !existingByDate.has(date));
    if (missingPublished.length) {
      return {
        ok: false,
        reason: `official recent omitted published drawings: ${missingPublished.join(", ")}`,
        draws: [],
        added: [],
      };
    }
    return {
      ok: true,
      status: "behind",
      reason: "official source is behind existing validated snapshot",
      draws: existing,
      added: [],
      overlap: overlaps.length,
      awaiting: false,
    };
  }

  const added = recentDraws
    .filter((draw) => !existingByDate.has(draw.d) && (!due || draw.d <= due))
    .map(copyDraw);
  const nextDraw = newest ? shiftIsoDate(newest, 1) : null;
  const awaiting =
    Boolean(nextDraw) &&
    scheduledDatesBetween(nextDraw, shiftIsoDate(nextDraw, 6), schedule).some((date) => !due || date > due);
  if (added.length === 0) {
    return {
      ok: true,
      status: "unchanged",
      reason: "no new drawings",
      draws: existing,
      added: [],
      overlap: overlaps.length,
      awaiting,
    };
  }
  const draws = [...added, ...existing].sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  return {
    ok: true,
    status: "extended",
    reason: `added ${added.map((draw) => draw.d).join(", ")}`,
    draws,
    added,
    overlap: overlaps.length,
    awaiting,
  };
}

/**
 * Decide Mega Millions history after the NY completeness check.
 * A healthy NY feed stays primary. A number conflict fails.
 * An incomplete NY feed continues only through official recent results.
 */
export function resolveMegaMillionsHistory({
  existingDraws,
  nyStatus,
  nyDraws,
  recent,
  now = new Date(),
  minOverlap = MIN_OFFICIAL_OVERLAP,
}) {
  if (nyStatus === "complete" || nyStatus === "repairable") {
    const conflicts = sharedDrawConflicts(existingDraws, nyDraws);
    if (conflicts.length) {
      const first = conflicts[0];
      return {
        ok: false,
        reason: `NY feed conflicts with snapshot on ${conflicts.map((item) => `${item.date}: snapshot ${item.snapshot}; NY ${item.fetched}`).join("; ")}`,
        draws: existingDraws,
        conflicts,
        preserve: true,
        date: first.date,
        snapshot: first.snapshot,
        official: first.fetched,
      };
    }
    let draws = nyDraws;
    let status = "ny-primary";
    let source = "ny";
    if (recent?.ok && Array.isArray(recent.draws) && recent.draws.length) {
      const extended = extendWithOfficialRecent({
        existingDraws: nyDraws,
        recentDraws: recent.draws,
        now,
        minOverlap,
      });
      if (!extended.ok && extended.date) return { ...extended, preserve: true };
      if (extended.ok && extended.status === "extended") {
        draws = extended.draws;
        status = "ny-primary-extended";
        source = "hybrid";
      }
    }
    return { ok: true, status, source, draws, added: draws.length - nyDraws.length, preserve: false };
  }

  if (!recent?.ok) {
    return {
      ok: false,
      reason: recent?.reason || "official Mega Millions recent results failed",
      draws: existingDraws,
      preserve: true,
    };
  }
  const extended = extendWithOfficialRecent({
    existingDraws,
    recentDraws: recent.draws,
    now,
    minOverlap,
  });
  if (!extended.ok) return { ...extended, preserve: true };
  return {
    ...extended,
    source: "hybrid",
    preserve: false,
  };
}

export function refreshCanContinue(megamillions, powerball) {
  if (!megamillions?.ok || !powerball?.ok) {
    return { exitCode: 1, continueToJackpot: false };
  }
  return { exitCode: 0, continueToJackpot: true };
}
