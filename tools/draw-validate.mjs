/**
 * Shared checks for official NY open-data drawing rows. Used by the fetch
 * script and by tests. Does not invent or repair numbers.
 */

export const GAME_RULES = {
  megamillions: {
    label: "Mega Millions",
    mainMax: 70,
    pick: 5,
    from: "2017-10-31",
    specialMaxOn: (date) => (date >= "2025-04-08" ? 24 : 25),
  },
  powerball: {
    label: "Powerball",
    mainMax: 69,
    pick: 5,
    from: "2015-10-07",
    specialMaxOn: () => 26,
  },
};

export function validateDraw(key, draw) {
  const rules = GAME_RULES[key];
  if (!rules) return "unknown game";
  if (!draw || typeof draw.d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(draw.d)) {
    return "invalid date";
  }
  if (draw.d < rules.from) return `date ${draw.d} is before the current matrix`;
  if (!Array.isArray(draw.n) || draw.n.length !== rules.pick) return "wrong white-ball count";
  if (new Set(draw.n).size !== rules.pick) return "duplicate white balls";
  if (draw.n.some((n, i) => i > 0 && n < draw.n[i - 1])) return "white balls are not sorted";
  if (draw.n.some((n) => !Number.isInteger(n) || n < 1 || n > rules.mainMax)) {
    return `white ball out of 1-${rules.mainMax}`;
  }
  const specialMax = rules.specialMaxOn(draw.d);
  if (!Number.isInteger(draw.s) || draw.s < 1 || draw.s > specialMax) {
    return `special ball out of 1-${specialMax} for ${draw.d}`;
  }
  return null;
}

export function validateGameHistory(key, history) {
  const rules = GAME_RULES[key];
  if (!history || !Array.isArray(history.draws)) return `${key}: missing draws`;
  if (history.draws.length < 100) return `${key}: too few draws (${history.draws.length})`;

  const seen = new Set();
  let previous = null;
  for (const draw of history.draws) {
    const error = validateDraw(key, draw);
    if (error) return `${key}: ${draw?.d || "?"} — ${error}`;
    if (seen.has(draw.d)) return `${key}: duplicate date ${draw.d}`;
    seen.add(draw.d);
    if (previous && draw.d > previous) {
      return `${key}: dates are not newest-first (${draw.d} after ${previous})`;
    }
    previous = draw.d;
  }

  const latest = history.draws[0].d;
  const first = history.draws[history.draws.length - 1].d;
  if (first !== rules.from) return `${key}: first draw ${first} is not ${rules.from}`;
  if (history.latestDraw && history.latestDraw !== latest) {
    return `${key}: latestDraw ${history.latestDraw} does not match ${latest}`;
  }
  if (history.count && history.count !== history.draws.length) {
    return `${key}: count ${history.count} does not match ${history.draws.length} rows`;
  }
  return null;
}

export function shouldReplaceSnapshot(current, next) {
  if (!current?.games) return { ok: true, reason: "no existing snapshot" };
  for (const key of Object.keys(GAME_RULES)) {
    const before = current.games[key];
    const after = next.games[key];
    if (!after) return { ok: false, reason: `${key}: missing from new snapshot` };
    if (before && after.draws.length < before.draws.length) {
      return {
        ok: false,
        reason: `${key}: new feed has ${after.draws.length} draws, existing has ${before.draws.length}`,
      };
    }
    if (before && after.latestDraw < before.latestDraw) {
      return {
        ok: false,
        reason: `${key}: new latest ${after.latestDraw} is older than ${before.latestDraw}`,
      };
    }
  }
  return { ok: true, reason: "validated" };
}

/**
 * A missing draw dated on or after this many days before the fetched latest
 * date is recent. Those gaps fail the fetch. Only older omissions may be
 * restored, and only from an already validated snapshot.
 */
export const RECENT_DRAW_WINDOW_DAYS = 365;

/** One omitted historical row can be kept. A broader hole is a truncated feed. */
export const MAX_HISTORICAL_BACKFILL = 1;

function shiftIsoDate(iso, days) {
  const utc = Date.parse(`${iso}T12:00:00Z`);
  return new Date(utc + days * 86400000).toISOString().slice(0, 10);
}

function copyDraw(draw) {
  return { d: draw.d, n: draw.n.slice(), s: draw.s };
}

/**
 * Combine a newly fetched drawing list with a previously validated snapshot.
 * The feed wins on any shared date. An omitted row is kept only when it is
 * older than RECENT_DRAW_WINDOW_DAYS before the fetched latest date, the
 * omission count is within MAX_HISTORICAL_BACKFILL, and the stored snapshot
 * itself passes validateGameHistory. Returns { ok, reason, draws, backfilled }.
 */
export function mergeDrawingHistory(key, fetchedDraws, existingHistory) {
  if (!Array.isArray(fetchedDraws) || fetchedDraws.length === 0) {
    return { ok: false, reason: `${key}: fetched feed is empty`, draws: [], backfilled: [] };
  }

  const seen = new Set();
  const fetched = [];
  for (const draw of fetchedDraws) {
    const error = validateDraw(key, draw);
    if (error) {
      return {
        ok: false,
        reason: `${key}: fetched row ${draw?.d || "?"} failed validation (${error}); refusing to replace it with a stored row`,
        draws: [],
        backfilled: [],
      };
    }
    if (seen.has(draw.d)) {
      return {
        ok: false,
        reason: `${key}: fetched feed has duplicate date ${draw.d}`,
        draws: [],
        backfilled: [],
      };
    }
    seen.add(draw.d);
    fetched.push(copyDraw(draw));
  }
  fetched.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));

  const existingDraws = Array.isArray(existingHistory?.draws) ? existingHistory.draws : [];
  const missing = [];
  const existingDates = new Set();
  for (const draw of existingDraws) {
    if (!draw || existingDates.has(draw.d)) continue;
    existingDates.add(draw.d);
    if (!seen.has(draw.d)) missing.push(draw);
  }

  const backfilled = [];
  if (missing.length > 0) {
    if (missing.length > MAX_HISTORICAL_BACKFILL) {
      return {
        ok: false,
        reason: `${key}: feed omitted ${missing.length} stored rows; historical backfill limit is ${MAX_HISTORICAL_BACKFILL}`,
        draws: [],
        backfilled: [],
      };
    }
    const existingError = validateGameHistory(key, existingHistory);
    if (existingError) {
      return {
        ok: false,
        reason: `${key}: existing snapshot failed validation; historical fallback refused (${existingError})`,
        draws: [],
        backfilled: [],
      };
    }
    const latest = fetched[0].d;
    const cutoff = shiftIsoDate(latest, -RECENT_DRAW_WINDOW_DAYS);
    for (const draw of missing) {
      if (draw.d > latest) {
        return {
          ok: false,
          reason: `${key}: omitted ${draw.d} is newer than fetched latest ${latest}; refusing to hide a missing recent drawing`,
          draws: [],
          backfilled: [],
        };
      }
      if (draw.d >= cutoff) {
        return {
          ok: false,
          reason: `${key}: omitted ${draw.d} is within ${RECENT_DRAW_WINDOW_DAYS} days of fetched latest ${latest}; refusing to backfill a recent gap`,
          draws: [],
          backfilled: [],
        };
      }
      const storedError = validateDraw(key, draw);
      if (storedError) {
        return {
          ok: false,
          reason: `${key}: stored row ${draw.d} failed validation (${storedError}); historical fallback refused`,
          draws: [],
          backfilled: [],
        };
      }
      backfilled.push({
        date: draw.d,
        reason: `the current feed omitted ${draw.d}, which is before ${cutoff} (${RECENT_DRAW_WINDOW_DAYS} days before fetched latest ${latest})`,
      });
    }
  }

  const draws = fetched.concat(missing.map(copyDraw));
  draws.sort((a, b) => (a.d < b.d ? 1 : a.d > b.d ? -1 : 0));
  const history = {
    count: draws.length,
    latestDraw: draws[0].d,
    firstDraw: draws[draws.length - 1].d,
    draws,
  };
  const error = validateGameHistory(key, history);
  if (error) return { ok: false, reason: error, draws: [], backfilled: [] };
  return { ok: true, reason: "validated", ...history, backfilled };
}

export function drawingRowsEqual(current, next) {
  if (!current?.games || !next?.games) return false;
  return Object.keys(GAME_RULES).every((key) => {
    const a = current.games[key]?.draws;
    const b = next.games[key]?.draws;
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((draw, index) => {
      const other = b[index];
      return other && draw.d === other.d && draw.s === other.s && draw.n.join(",") === other.n.join(",");
    });
  });
}

export function snapshotUnchanged(current, next) {
  if (!current?.games || !next?.games) return false;
  return Object.keys(GAME_RULES).every((key) => {
    const a = current.games[key];
    const b = next.games[key];
    return a && b && a.latestDraw === b.latestDraw && a.count === b.count;
  });
}
