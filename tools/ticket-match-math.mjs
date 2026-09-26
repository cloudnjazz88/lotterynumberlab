/**
 * Pure ticket-match math (Node + browser parity).
 * Order-independent white matches; bonus may equal a white ball.
 */

export const GAME_RANGES = {
  megamillions: {
    id: "megamillions",
    name: "Mega Millions",
    mainMax: 70,
    specialMax: 24,
    pick: 5,
    specialName: "Mega Ball",
    specialAbbr: "MB",
    matrixLabel: "5 of 70 + 1 of 24",
    matrixSince: "2017-10-31",
    matrixSinceLabel: "October 31, 2017",
    prizeChartUrl: "https://www.megamillions.com/How-to-Play.aspx",
    prizeChartLabel: "Mega Millions prize tiers (official)",
  },
  powerball: {
    id: "powerball",
    name: "Powerball",
    mainMax: 69,
    specialMax: 26,
    pick: 5,
    specialName: "Powerball",
    specialAbbr: "PB",
    matrixLabel: "5 of 69 + 1 of 26",
    matrixSince: "2015-10-07",
    matrixSinceLabel: "October 7, 2015",
    prizeChartUrl: "https://www.powerball.com/powerball-prize-chart",
    prizeChartLabel: "Powerball prize chart (official)",
  },
};

/** Max options in the Recent drawing select (DOM budget). */
export const RECENT_DRAW_LIMIT = 20;

export function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * @param {string} gameId
 * @param {number[]} whites
 * @param {number} bonus
 */
export function validateTicket(gameId, whites, bonus) {
  const game = GAME_RANGES[gameId];
  if (!game) return { ok: false, error: "Choose Mega Millions or Powerball." };

  const nums = (Array.isArray(whites) ? whites : []).map(Number);
  if (nums.length !== game.pick) {
    return { ok: false, error: `Pick exactly ${game.pick} white balls.` };
  }
  if (!nums.every((n) => Number.isInteger(n))) {
    return { ok: false, error: "White balls must be whole numbers." };
  }
  if (nums.some((n) => n < 1 || n > game.mainMax)) {
    return { ok: false, error: `White balls must be between 1 and ${game.mainMax}.` };
  }
  const unique = new Set(nums);
  if (unique.size !== nums.length) {
    return { ok: false, error: "White balls must be unique." };
  }

  const s = Number(bonus);
  if (!Number.isInteger(s) || s < 1 || s > game.specialMax) {
    return {
      ok: false,
      error: `${game.specialName} must be an integer from 1 to ${game.specialMax}.`,
    };
  }

  return {
    ok: true,
    whites: nums.slice().sort((a, b) => a - b),
    bonus: s,
    game,
  };
}

/** Order-independent white match + bonus match. */
export function matchTicket(ticketWhites, ticketBonus, drawWhites, drawBonus) {
  const ticketSet = new Set((ticketWhites || []).map(Number));
  const drawMain = (drawWhites || []).map(Number);
  let whiteMatches = 0;
  for (const n of drawMain) {
    if (ticketSet.has(n)) whiteMatches += 1;
  }
  const bonusMatch = Number(ticketBonus) === Number(drawBonus);
  return { whiteMatches, bonusMatch: Boolean(bonusMatch) };
}

/** Human phrase for a match pattern. Never claims a win or dollar amount. */
export function describeMatch(whiteMatches, bonusMatch, specialName = "bonus ball") {
  const w = Number(whiteMatches) || 0;
  const b = Boolean(bonusMatch);
  if (w === 0 && !b) return "No numbers matched";
  if (w === 0 && b) return `0 white balls + ${specialName} matched`;
  if (w > 0 && !b) {
    return w === 1 ? "1 white ball matched" : `${w} white balls matched`;
  }
  if (w === 1) return `1 white + ${specialName} matched`;
  return `${w} white + ${specialName} matched`;
}

/** Soft prize-tier context only  --  never dollar amounts. */
export function softTierHint(whiteMatches, bonusMatch, gameId) {
  const w = Number(whiteMatches) || 0;
  const b = Boolean(bonusMatch);
  if (w === 0 && !b) return null;
  const game = GAME_RANGES[gameId];
  const name = game ? game.name : "this game";
  if (w === 5 && b) {
    return `Pattern matches the top published ${name} jackpot tier. Confirm any claim with your state lottery.`;
  }
  if (w === 5 && !b) {
    return `Pattern matches a high published ${name} tier (5 white balls). Confirm any claim with your state lottery.`;
  }
  if (w >= 3 || (w >= 1 && b) || (w === 0 && b)) {
    return `This pattern may correspond to a published prize tier for ${name}. Verify amounts and eligibility with your state lottery  --  this site does not list payouts.`;
  }
  return null;
}

function matchKey(m) {
  return `${m.whiteMatches}-${m.bonusMatch ? 1 : 0}`;
}

/**
 * Rank all draws for a ticket.
 * Sort: whiteMatches desc, then bonusMatch true, then date newest.
 */
export function rankHistory(ticketWhites, ticketBonus, draws, options = {}) {
  const limit = options.limit == null ? 10 : Number(options.limit);
  const list = Array.isArray(draws) ? draws : [];
  if (!list.length) return { ok: false, error: "No drawings available for this game." };

  const results = list.map((draw) => {
    const m = matchTicket(ticketWhites, ticketBonus, draw.n, draw.s);
    return {
      d: draw.d,
      n: (draw.n || []).slice(),
      s: draw.s,
      whiteMatches: m.whiteMatches,
      bonusMatch: m.bonusMatch,
    };
  });

  results.sort((a, b) => {
    if (b.whiteMatches !== a.whiteMatches) return b.whiteMatches - a.whiteMatches;
    if (a.bonusMatch !== b.bonusMatch) return a.bonusMatch ? -1 : 1;
    if (a.d < b.d) return 1;
    if (a.d > b.d) return -1;
    return 0;
  });

  const best = results[0];
  const bestKey = matchKey(best);
  const countAtBest = results.filter((r) => matchKey(r) === bestKey).length;
  const dates = list.map((d) => d.d).slice().sort();
  return {
    ok: true,
    results,
    best,
    countAtBest,
    top: results.slice(0, Math.max(0, limit)),
    drawCount: list.length,
    firstDraw: dates[0],
    latestDraw: dates[dates.length - 1],
    maxWhiteMatches: best.whiteMatches,
  };
}

export function compareSelected(ticketWhites, ticketBonus, draw) {
  if (!draw) return { ok: false, error: "Select a drawing." };
  const m = matchTicket(ticketWhites, ticketBonus, draw.n, draw.s);
  return {
    ok: true,
    d: draw.d,
    official: { n: (draw.n || []).slice(), s: draw.s },
    ticket: { n: ticketWhites.slice().sort((a, b) => a - b), s: ticketBonus },
    whiteMatches: m.whiteMatches,
    bonusMatch: m.bonusMatch,
  };
}

/** Build date→draw Map once per game (O(n) build, O(1) lookup). */
export function buildDrawDateMap(draws) {
  const map = new Map();
  for (const draw of Array.isArray(draws) ? draws : []) {
    if (draw && typeof draw.d === "string") map.set(draw.d, draw);
  }
  return map;
}

/** Newest-first list truncated for the Recent drawing select. */
export function getRecentDraws(draws, limit = RECENT_DRAW_LIMIT) {
  const list = Array.isArray(draws) ? draws : [];
  const n = Math.max(0, Number(limit) || 0);
  return list.slice(0, n);
}

/** First and latest ISO dates in bundled history (ET drawing dates). */
export function drawingDateBounds(draws) {
  const list = Array.isArray(draws) ? draws : [];
  if (!list.length) return { min: null, max: null };
  let min = list[0].d;
  let max = list[0].d;
  for (const draw of list) {
    if (!draw || typeof draw.d !== "string") continue;
    if (draw.d < min) min = draw.d;
    if (draw.d > max) max = draw.d;
  }
  return { min, max };
}

export function lookupDrawByDate(dateMap, isoDate) {
  if (!dateMap || typeof isoDate !== "string" || !isoDate) return null;
  return dateMap.get(isoDate) || null;
}

/**
 * Nearest previous/next actual drawing dates around isoDate (sorted ascending).
 * Does not mutate the chosen date.
 */
export function findNearestDrawDates(draws, isoDate) {
  const dates = (Array.isArray(draws) ? draws : [])
    .map((d) => (d && d.d) || null)
    .filter(Boolean)
    .slice()
    .sort();
  let previous = null;
  let next = null;
  for (const d of dates) {
    if (d < isoDate) previous = d;
    else if (d > isoDate) {
      next = d;
      break;
    }
  }
  return { previous, next };
}

/**
 * Resolve which draw is active given recent select, older date, and last-changed source.
 * @param {"recent"|"date"} source
 */
export function resolveActiveDraw({ source, recentValue, dateValue, dateMap, draws, gameName }) {
  const list = Array.isArray(draws) ? draws : [];
  const bounds = drawingDateBounds(list);
  const name = gameName || "this game";

  if (source === "date") {
    if (!dateValue) {
      return {
        ok: false,
        error: "Enter an Eastern Time drawing date, or use Recent drawing.",
        draw: null,
        source: "date",
        suggestions: null,
      };
    }
    if (bounds.min && dateValue < bounds.min) {
      return {
        ok: false,
        error: `That date is before the earliest bundled ${name} drawing (${bounds.min}).`,
        draw: null,
        source: "date",
        suggestions: null,
      };
    }
    if (bounds.max && dateValue > bounds.max) {
      return {
        ok: false,
        error: `That date is after the latest bundled ${name} drawing (${bounds.max}).`,
        draw: null,
        source: "date",
        suggestions: null,
      };
    }
    const hit = lookupDrawByDate(dateMap, dateValue);
    if (!hit) {
      const near = findNearestDrawDates(list, dateValue);
      return {
        ok: false,
        error: `No ${name} drawing was held on this date.`,
        draw: null,
        source: "date",
        suggestions: near,
      };
    }
    return { ok: true, draw: hit, source: "date", error: null, suggestions: null };
  }

  // recent (default)
  const fromRecent = recentValue ? lookupDrawByDate(dateMap, recentValue) : null;
  const draw = fromRecent || list[0] || null;
  if (!draw) {
    return {
      ok: false,
      error: "No drawings available for this game.",
      draw: null,
      source: "recent",
      suggestions: null,
    };
  }
  return { ok: true, draw, source: "recent", error: null, suggestions: null };
}

/** Mega Millions matrix note for historical search UI. */
export const MM_MEGA_BALL_HISTORY_NOTE =
  "Historical search uses post-2017 white-ball matrix history; Mega Ball pool changed 25→24 in 2025; current input range 1–24; past Mega Ball 25 draws can exist and are not data errors.";
