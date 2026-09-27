/**
 * What If Calculator math (Node + browser parity).
 * Same numbers repeated across current-matrix history — not one-draw Ticket Match.
 * Prizes: estimated/hypothetical official base only. No Megaplier/Power Play/tax/jackpot cash.
 */

import {
  GAME_RANGES,
  validateTicket,
  matchTicket,
  drawingDateBounds,
} from "./ticket-match-math.mjs";
import { MM_PRIZES, PB_PRIZES } from "./compute-context.mjs";

export { GAME_RANGES, validateTicket, matchTicket, drawingDateBounds };

export const TICKET_PRICE_USD = {
  megamillions: 5,
  powerball: 2,
};

export const MAX_TICKETS_PER_DRAWING = 100;
export const MEANINGFUL_MATCH_LIMIT = 20;

/** Strength rank for sorting (higher = stronger). Jackpot 5+1 is strongest. */
export function matchStrength(whiteMatches, bonusMatch) {
  const w = Number(whiteMatches) || 0;
  const b = bonusMatch ? 1 : 0;
  return w * 2 + b;
}

export function tierKey(whiteMatches, bonusMatch) {
  return `${Number(whiteMatches) || 0}+${bonusMatch ? 1 : 0}`;
}

export function basePrizesFor(gameId) {
  if (gameId === "megamillions") return MM_PRIZES;
  if (gameId === "powerball") return PB_PRIZES;
  return null;
}

/**
 * Map a match pattern to official base prize metadata.
 * Unknown / non-winning patterns → null prize (no estimate).
 */
export function lookupBasePrize(gameId, whiteMatches, bonusMatch) {
  const prizes = basePrizesFor(gameId);
  if (!prizes) return { key: tierKey(whiteMatches, bonusMatch), isWinning: false };
  const key = tierKey(whiteMatches, bonusMatch);
  const row = prizes[key];
  if (!row) {
    return { key, isWinning: false, isJackpot: false, label: null, value: null };
  }
  const isJackpot = row.value == null && /jackpot/i.test(row.label || "");
  return {
    key,
    isWinning: true,
    isJackpot,
    label: row.label,
    value: row.value,
  };
}

/** Add calendar days to an ISO YYYY-MM-DD (UTC noon to avoid DST edge cases on date-only). */
export function addIsoDays(isoDate, days) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Resolve analysis period against bundled draws (ET drawing dates as ISO strings).
 * @param {"last1y"|"last5y"|"all"|"custom"} period
 */
export function resolvePeriod(draws, period, customStart, customEnd) {
  const list = Array.isArray(draws) ? draws : [];
  const bounds = drawingDateBounds(list);
  if (!bounds.min || !bounds.max) {
    return {
      ok: false,
      error: "No drawings available for this game.",
      start: null,
      end: null,
      label: null,
    };
  }

  let start = bounds.min;
  let end = bounds.max;
  let label = `All current-matrix history (${bounds.min} – ${bounds.max} ET)`;

  if (period === "last1y") {
    start = addIsoDays(bounds.max, -365);
    if (start < bounds.min) start = bounds.min;
    label = `Last 1 year through ${bounds.max} ET`;
  } else if (period === "last5y") {
    start = addIsoDays(bounds.max, -365 * 5);
    if (start < bounds.min) start = bounds.min;
    label = `Last 5 years through ${bounds.max} ET`;
  } else if (period === "all") {
    start = bounds.min;
    end = bounds.max;
    label = `All current-matrix history (${bounds.min} – ${bounds.max} ET)`;
  } else if (period === "custom") {
    const a = typeof customStart === "string" ? customStart.trim() : "";
    const b = typeof customEnd === "string" ? customEnd.trim() : "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a) || !/^\d{4}-\d{2}-\d{2}$/.test(b)) {
      return {
        ok: false,
        error: "Enter custom start and end dates as Eastern Time drawing dates (YYYY-MM-DD).",
        start: null,
        end: null,
        label: null,
      };
    }
    if (a > b) {
      return {
        ok: false,
        error: "Custom start date must be on or before the end date.",
        start: null,
        end: null,
        label: null,
      };
    }
    if (a > bounds.max || b < bounds.min) {
      return {
        ok: false,
        error: `Custom range is outside bundled history (${bounds.min} – ${bounds.max} ET).`,
        start: null,
        end: null,
        label: null,
      };
    }
    if (a > bounds.max) {
      return {
        ok: false,
        error: "Custom dates cannot be after the latest bundled drawing.",
        start: null,
        end: null,
        label: null,
      };
    }
    start = a < bounds.min ? bounds.min : a;
    end = b > bounds.max ? bounds.max : b;
    // Reject fully future relative to max (already covered). Also reject start after max.
    if (customStart > bounds.max || customEnd > bounds.max) {
      // Allow clamp of end to max only when start is in range; if either exceeds max, error.
      if (customStart > bounds.max) {
        return {
          ok: false,
          error: `Start date is after the latest bundled drawing (${bounds.max} ET).`,
          start: null,
          end: null,
          label: null,
        };
      }
      if (customEnd > bounds.max) {
        return {
          ok: false,
          error: `End date is after the latest bundled drawing (${bounds.max} ET). Future drawings are not included.`,
          start: null,
          end: null,
          label: null,
        };
      }
    }
    label = `Custom range ${start} – ${end} ET`;
  } else {
    return {
      ok: false,
      error: "Choose a period: Last 1 year, Last 5 years, All current-matrix, or Custom.",
      start: null,
      end: null,
      label: null,
    };
  }

  return { ok: true, start, end, label, bounds };
}

export function filterDrawsByPeriod(draws, start, end) {
  const list = Array.isArray(draws) ? draws : [];
  return list.filter((d) => d && typeof d.d === "string" && d.d >= start && d.d <= end);
}

export function parseTicketsPerDrawing(value) {
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < 1 || n > MAX_TICKETS_PER_DRAWING) return null;
  return n;
}

/**
 * Run What If analysis: same ticket numbers on every drawing in range.
 * Multi-ticket scales cost and fixed base prizes only — never implies better odds.
 */
export function analyzeWhatIf(input) {
  const gameId = input && input.gameId;
  const ticket = validateTicket(gameId, input && input.whites, input && input.bonus);
  if (!ticket.ok) return { ok: false, error: ticket.error };

  const ticketsPerDrawing = parseTicketsPerDrawing(input && input.ticketsPerDrawing);
  if (ticketsPerDrawing == null) {
    return {
      ok: false,
      error: `Tickets per drawing must be a whole number from 1 to ${MAX_TICKETS_PER_DRAWING}.`,
    };
  }

  const period = resolvePeriod(
    input && input.draws,
    (input && input.period) || "all",
    input && input.customStart,
    input && input.customEnd,
  );
  if (!period.ok) return { ok: false, error: period.error };

  const drawsInRange = filterDrawsByPeriod(input.draws, period.start, period.end);
  const price = TICKET_PRICE_USD[gameId];
  const game = ticket.game;

  if (!drawsInRange.length) {
    return {
      ok: true,
      empty: true,
      gameId,
      gameName: game.name,
      specialName: game.specialName,
      specialAbbr: game.specialAbbr,
      whites: ticket.whites,
      bonus: ticket.bonus,
      period: period.label,
      periodStart: period.start,
      periodEnd: period.end,
      drawingsAnalyzed: 0,
      ticketsPerDrawing,
      ticketPrice: price,
      hypotheticalSpent: 0,
      estimatedBasePrizes: 0,
      estimatedBasePrizesLabel: "$0",
      net: 0,
      returnRate: null,
      bestMatch: null,
      tierCounts: {},
      noMatchCount: 0,
      jackpotTierCount: 0,
      meaningfulMatches: [],
      meaningfulMatchLimit: MEANINGFUL_MATCH_LIMIT,
      meaningfulTruncated: false,
      assumptions: assumptionsList(game, price),
      message:
        "No drawings fall in this date range within the bundled current-matrix history. Try a wider period or different custom dates.",
    };
  }

  const tierCounts = Object.create(null);
  let noMatchCount = 0;
  let jackpotTierCount = 0;
  let estimatedBasePrizes = 0;
  const allMatches = [];

  for (const draw of drawsInRange) {
    const m = matchTicket(ticket.whites, ticket.bonus, draw.n, draw.s);
    const key = tierKey(m.whiteMatches, m.bonusMatch);
    tierCounts[key] = (tierCounts[key] || 0) + 1;

    const prize = lookupBasePrize(gameId, m.whiteMatches, m.bonusMatch);
    const isNoMatch = !prize.isWinning;
    if (isNoMatch) noMatchCount += 1;

    if (prize.isJackpot) {
      jackpotTierCount += 1;
    } else if (prize.isWinning && prize.value != null) {
      estimatedBasePrizes += prize.value * ticketsPerDrawing;
    }

    if (prize.isWinning) {
      allMatches.push({
        d: draw.d,
        n: (draw.n || []).slice(),
        s: draw.s,
        whiteMatches: m.whiteMatches,
        bonusMatch: m.bonusMatch,
        tierKey: key,
        isJackpot: Boolean(prize.isJackpot),
        prizeLabel: prize.isJackpot
          ? "Jackpot-tier match — historical jackpot payout not estimated"
          : prize.label,
        estimatedPrize:
          prize.isJackpot || prize.value == null ? null : prize.value * ticketsPerDrawing,
      });
    }
  }

  allMatches.sort((a, b) => {
    const sa = matchStrength(a.whiteMatches, a.bonusMatch);
    const sb = matchStrength(b.whiteMatches, b.bonusMatch);
    if (sb !== sa) return sb - sa;
    if (b.whiteMatches !== a.whiteMatches) return b.whiteMatches - a.whiteMatches;
    if (a.bonusMatch !== b.bonusMatch) return a.bonusMatch ? -1 : 1;
    if (a.d < b.d) return 1;
    if (a.d > b.d) return -1;
    return 0;
  });

  const bestMatch = allMatches.length ? allMatches[0] : null;
  const meaningfulTruncated = allMatches.length > MEANINGFUL_MATCH_LIMIT;
  const meaningfulMatches = allMatches.slice(0, MEANINGFUL_MATCH_LIMIT);

  const hypotheticalSpent = price * ticketsPerDrawing * drawsInRange.length;
  const net = estimatedBasePrizes - hypotheticalSpent;
  const returnRate = hypotheticalSpent > 0 ? estimatedBasePrizes / hypotheticalSpent : null;

  // Distribution across official winning tiers + no-match
  const distribution = [];
  const prizes = basePrizesFor(gameId);
  for (const key of Object.keys(prizes)) {
    const count = tierCounts[key] || 0;
    if (count === 0) continue;
    const row = prizes[key];
    distribution.push({
      key,
      count,
      label: row.value == null ? row.label : row.label,
      isJackpot: row.value == null,
    });
  }
  if (noMatchCount > 0) {
    distribution.push({ key: "no-match", count: noMatchCount, label: "No prize-tier match", isJackpot: false });
  }

  return {
    ok: true,
    empty: false,
    gameId,
    gameName: game.name,
    specialName: game.specialName,
    specialAbbr: game.specialAbbr,
    matrixLabel: game.matrixLabel,
    whites: ticket.whites,
    bonus: ticket.bonus,
    period: period.label,
    periodStart: period.start,
    periodEnd: period.end,
    drawingsAnalyzed: drawsInRange.length,
    ticketsPerDrawing,
    ticketPrice: price,
    hypotheticalSpent,
    estimatedBasePrizes,
    estimatedBasePrizesLabel: formatUsd(estimatedBasePrizes),
    jackpotTierCount,
    jackpotNote:
      jackpotTierCount > 0
        ? "Jackpot-tier match — historical jackpot payout not estimated"
        : null,
    net,
    returnRate,
    bestMatch,
    tierCounts,
    noMatchCount,
    distribution,
    meaningfulMatches,
    meaningfulMatchLimit: MEANINGFUL_MATCH_LIMIT,
    meaningfulTruncated,
    meaningfulTotal: allMatches.length,
    assumptions: assumptionsList(game, price),
  };
}

function assumptionsList(game, price) {
  return [
    `Official base prize table only for ${game.name} (${game.matrixLabel}). Megaplier / Power Play, taxes, jurisdiction rules, and promotions are excluded.`,
    `Ticket price used for hypothetical spend: $${price} (current published price). Historical price changes are not modeled.`,
    "Jackpot-tier matches are counted but cash value is not estimated — advertised jackpots vary by drawing.",
    "The same numbers are treated as independent trials on each drawing. Hot/cold history does not change per-draw odds.",
    "Multi-ticket input scales cost and fixed base prizes linearly; it does not improve odds per ticket.",
    "Bundled current-matrix history only (Eastern Time drawing dates). Incompatible older matrices are not merged.",
    "Hypothetical / estimated figures only — not claim verification, not a prediction, and not advice to play.",
  ];
}

export function formatUsd(n) {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  return (
    sign +
    "$" +
    abs.toLocaleString("en-US", {
      minimumFractionDigits: abs % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatReturnRate(rate) {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${(rate * 100).toFixed(2)}%`;
}

/** Banned marketing / claim wording for UI copy checks. */
export const BANNED_CLAIM_WORDS = [
  "you won",
  "you earned",
  "guaranteed",
  "lucky",
  "due",
];
