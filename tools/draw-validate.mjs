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

export function snapshotUnchanged(current, next) {
  if (!current?.games || !next?.games) return false;
  return Object.keys(GAME_RULES).every((key) => {
    const a = current.games[key];
    const b = next.games[key];
    return a && b && a.latestDraw === b.latestDraw && a.count === b.count;
  });
}
