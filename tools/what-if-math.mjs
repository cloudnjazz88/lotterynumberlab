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

/** Current published play prices (MM post-2025-04-08; PB unchanged). */
export const TICKET_PRICE_USD = {
  megamillions: 5,
  powerball: 2,
};

/** First Mega Millions drawing at $5 with built-in multiplier (official). */
export const MM_TICKET_PRICE_CHANGE_DATE = "2025-04-08";

/** Mega Millions play price before the Apr 8, 2025 drawing. */
export const MM_TICKET_PRICE_LEGACY_USD = 2;

/**
 * Per-drawing ticket price by Eastern Time drawing date.
 * Mega Millions: drawings before 2025-04-08 are $2; on/after that date $5.
 * Powerball: $2 for all bundled dates.
 */
export function ticketPriceForDrawing(gameId, drawingDate) {
  if (gameId === "powerball") return TICKET_PRICE_USD.powerball;
  if (gameId === "megamillions") {
    if (typeof drawingDate === "string" && drawingDate < MM_TICKET_PRICE_CHANGE_DATE) {
      return MM_TICKET_PRICE_LEGACY_USD;
    }
    return TICKET_PRICE_USD.megamillions;
  }
  return null;
}

/**
 * Official MM base prizes for drawings before 2025-04-08 (no Megaplier).
 * Only 0+1 and 1+1 differ from the post-change base-before-multiplier table.
 * Source: Wisconsin Lottery / Mega Millions consortium transition materials.
 */
export const MM_PRIZES_BEFORE_2025_04_08 = {
  "5+1": { label: "Jackpot", value: null },
  "5+0": { label: "$1,000,000", value: 1_000_000 },
  "4+1": { label: "$10,000", value: 10_000 },
  "4+0": { label: "$500", value: 500 },
  "3+1": { label: "$200", value: 200 },
  "3+0": { label: "$10", value: 10 },
  "2+1": { label: "$10", value: 10 },
  "1+1": { label: "$4", value: 4 },
  "0+1": { label: "$2", value: 2 },
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

export function basePrizesFor(gameId, drawingDate) {
  if (gameId === "powerball") return PB_PRIZES;
  if (gameId === "megamillions") {
    if (typeof drawingDate === "string" && drawingDate < MM_TICKET_PRICE_CHANGE_DATE) {
      return MM_PRIZES_BEFORE_2025_04_08;
    }
    // Post-2025-04-08: published base amounts before the built-in multiplier.
    return MM_PRIZES;
  }
  return null;
}

/**
 * Map a match pattern to official base prize metadata for a drawing date.
 * Unknown / non-winning patterns -> null prize (no estimate).
 * drawingDate selects pre- vs post-2025-04-08 Mega Millions base tables.
 */
export function lookupBasePrize(gameId, whiteMatches, bonusMatch, drawingDate) {
  const prizes = basePrizesFor(gameId, drawingDate);
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

/** Build per-price-band ticket cost breakdown for a drawing list. */
export function buildTicketCostBreakdown(gameId, drawsInRange, ticketsPerDrawing) {
  const tickets = Number(ticketsPerDrawing) || 0;
  const bands = new Map();
  for (const draw of drawsInRange || []) {
    const price = ticketPriceForDrawing(gameId, draw && draw.d);
    if (price == null) continue;
    const cur = bands.get(price) || { price, drawings: 0, tickets: 0, subtotal: 0 };
    cur.drawings += 1;
    cur.tickets += tickets;
    cur.subtotal += price * tickets;
    bands.set(price, cur);
  }
  const ordered = [...bands.values()].sort((a, b) => a.price - b.price);
  return ordered.map((b) => {
    let dateRule;
    if (gameId === "megamillions") {
      dateRule =
        b.price === MM_TICKET_PRICE_LEGACY_USD
          ? "Before Apr 8, 2025"
          : "Apr 8, 2025 and later";
    } else {
      dateRule = "All drawings";
    }
    return {
      price: b.price,
      drawings: b.drawings,
      tickets: b.tickets,
      subtotal: b.subtotal,
      dateRule,
    };
  });
}

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
  const ticketCostBreakdown = buildTicketCostBreakdown(gameId, drawsInRange, ticketsPerDrawing);
  const priceKindsUsed = ticketCostBreakdown.map((b) => b.price);
  const ticketPriceMixed = priceKindsUsed.length > 1;
  const ticketPrice = ticketPriceMixed ? null : priceKindsUsed[0] ?? TICKET_PRICE_USD[gameId];
  const hypotheticalSpent = ticketCostBreakdown.reduce((a, b) => a + b.subtotal, 0);
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
      ticketPrice: TICKET_PRICE_USD[gameId],
      ticketPriceMixed: false,
      priceKindsUsed: [],
      ticketCostBreakdown: [],
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
      assumptions: assumptionsList(game, { mixed: false, price: TICKET_PRICE_USD[gameId] }),
      message:
        "No drawings fall in this date range within the bundled current-matrix history. Try a wider period or different custom dates.",
    };
  }

  const tierCounts = Object.create(null);
  const tierPrizeTotals = Object.create(null);
  const tierUnitValues = Object.create(null);
  let noMatchCount = 0;
  let jackpotTierCount = 0;
  let estimatedBasePrizes = 0;
  const allMatches = [];

  for (const draw of drawsInRange) {
    const m = matchTicket(ticket.whites, ticket.bonus, draw.n, draw.s);
    const key = tierKey(m.whiteMatches, m.bonusMatch);
    tierCounts[key] = (tierCounts[key] || 0) + 1;

    const prize = lookupBasePrize(gameId, m.whiteMatches, m.bonusMatch, draw.d);
    const isNoMatch = !prize.isWinning;
    if (isNoMatch) noMatchCount += 1;

    if (prize.isJackpot) {
      jackpotTierCount += 1;
    } else if (prize.isWinning && prize.value != null) {
      const add = prize.value * ticketsPerDrawing;
      estimatedBasePrizes += add;
      tierPrizeTotals[key] = (tierPrizeTotals[key] || 0) + add;
      if (!tierUnitValues[key]) tierUnitValues[key] = new Set();
      tierUnitValues[key].add(prize.value);
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

  const net = estimatedBasePrizes - hypotheticalSpent;
  const returnRate = hypotheticalSpent > 0 ? estimatedBasePrizes / hypotheticalSpent : null;

  // Distribution across official winning tiers + no-match
  const distribution = [];
  // Prefer post-change labels for keys; per-row totals come from era-correct sums.
  const prizes = basePrizesFor(gameId, period.end);
  for (const key of Object.keys(prizes)) {
    const count = tierCounts[key] || 0;
    if (count === 0) continue;
    const row = prizes[key];
    const units = tierUnitValues[key] ? [...tierUnitValues[key]] : [];
    const unitMixed = units.length > 1;
    const unit = units.length === 1 ? units[0] : null;
    distribution.push({
      key,
      count,
      label: row.label,
      isJackpot: row.value == null,
      prizeTotal: row.value == null ? null : tierPrizeTotals[key] || 0,
      unit,
      unitMixed,
    });
  }
  if (noMatchCount > 0) {
    distribution.push({ key: "no-match", count: noMatchCount, label: "No prize-tier match", isJackpot: false, prizeTotal: 0, unit: null, unitMixed: false });
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
    ticketPrice,
    ticketPriceMixed,
    priceKindsUsed,
    ticketCostBreakdown,
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
    assumptions: assumptionsList(game, { mixed: ticketPriceMixed, price: ticketPrice, breakdown: ticketCostBreakdown }),
  };
}

function assumptionsList(game, priceInfo) {
  const info = priceInfo && typeof priceInfo === "object" ? priceInfo : { price: priceInfo, mixed: false };
  let priceLine;
  if (info.mixed) {
    priceLine = "Mega Millions hypothetical spend uses per-drawing historical prices: $2 before Apr 8, 2025 and $5 from Apr 8, 2025 onward (Powerball stays $2).";
  } else if (info.price != null) {
    priceLine = `Ticket price used for hypothetical spend: $${info.price} per drawing (date-based historical price for this period).`;
  } else {
    priceLine = "Ticket prices follow official historical play prices for each drawing date.";
  }
  return [
    `Official base prize amounts only for ${game.name} (${game.matrixLabel}). Pre-Apr 8, 2025 Mega Millions uses the legacy base table; later drawings use published base amounts before the built-in multiplier. Optional Megaplier (retired) and Power Play, taxes, jurisdiction rules, and promotions are excluded.`,
    priceLine,
    "Post-Apr 8, 2025 Mega Millions built-in multipliers (2X–10X) are assigned at purchase and are not in this drawing history, so prize totals use base-before-multiplier amounts — not a full paid prize with multiplier.",
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

/**
 * Presentation-only helpers for What If results UI.
 * Derives display copy from analyzeWhatIf output — does not recompute prizes/spent/net.
 */
export function formatIsoDateShort(iso) {
  if (!iso || typeof iso !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return String(iso || "");
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMatchTierLabel(whiteMatches, bonusMatch, specialName) {
  const w = Number(whiteMatches) || 0;
  const bonus = bonusMatch ? ` + ${specialName || "bonus"}` : "";
  return `${w} white${bonus}`;
}

export function formatUsdSigned(n, { forcePlus = false } = {}) {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n > 0 && forcePlus) return `+${formatUsd(n)}`;
  return formatUsd(n);
}

/**
 * Cents-per-dollar display from existing returnRate (prizes/spent).
 * 0.12 -> "12\u00a2"; >= $1 uses dollar formatting.
 */
export function formatReturnPerDollar(rate) {
  if (rate == null || !Number.isFinite(rate) || rate < 0) return null;
  const cents = Math.round(rate * 100);
  if (cents < 100) return `${cents}\u00a2`;
  return formatUsd(cents / 100);
}

export function formatReturnPerDollarSentence(rate, options = {}) {
  const bit = formatReturnPerDollar(rate);
  if (!bit) return null;
  if (options && options.qualifyBaseBeforeMultiplier) {
    return `That is about ${bit} in base prizes before the built-in multiplier for every $1 spent — not a definitive final return after multiplier.`;
  }
  return `That is about ${bit} returned for every $1 spent.`;
}

/**
 * MM prize-card era for presentation: post / mixed / pre.
 * Any drawing on/after 2025-04-08 => post or mixed (via $5 price band).
 */
export function mmPrizePresentationMode(result) {
  if (!result || result.gameId !== "megamillions") return null;
  const kinds = result.priceKindsUsed || [];
  const hasPost = kinds.includes(TICKET_PRICE_USD.megamillions);
  const hasPre = kinds.includes(MM_TICKET_PRICE_LEGACY_USD);
  if (hasPost && hasPre) return "mixed";
  if (hasPost) return "post";
  return "pre";
}

/**
 * Build prize-result rows keyed by match tier (never merge different tiers by $ alone).
 * Subtotals use official base prize × tickets × drawing count; jackpot $ excluded.
 */
export function buildPrizeResultRows(result) {
  const tickets = Number(result.ticketsPerDrawing) || 1;
  const drawings = Number(result.drawingsAnalyzed) || 0;
  const specialName = result.specialName || "bonus";
  const rows = [];
  let subtotalSum = 0;

  for (const row of result.distribution || []) {
    if (row.key === "no-match") {
      rows.push({
        key: "no-prize",
        kind: "no-prize",
        title: "No prize",
        matchLabel: null,
        count: row.count,
        countLabel: `${Number(row.count).toLocaleString("en-US")} drawing${row.count === 1 ? "" : "s"}`,
        total: 0,
        totalLabel: null,
        isJackpot: false,
        ratio: drawings > 0 ? row.count / drawings : 0,
      });
      continue;
    }

    const [wStr, bStr] = String(row.key).split("+");
    const w = Number(wStr) || 0;
    const bonusMatch = Number(bStr) === 1;
    const matchLabel = formatMatchTierLabel(w, bonusMatch, specialName);

    if (row.isJackpot) {
      rows.push({
        key: row.key,
        kind: "jackpot",
        title: "Jackpot",
        matchLabel,
        count: row.count,
        countLabel: `${row.count} winning drawing${row.count === 1 ? "" : "s"}`,
        total: null,
        totalLabel: "Amount not estimated",
        isJackpot: true,
        ratio: drawings > 0 ? row.count / drawings : 0,
      });
      continue;
    }

    // Prefer analyzer-provided era-correct totals; fall back to single-table lookup.
    let total;
    let unit = row.unit;
    if (typeof row.prizeTotal === "number") {
      total = row.prizeTotal;
    } else {
      const prize = lookupBasePrize(result.gameId, w, bonusMatch, result.periodEnd);
      if (prize.isJackpot || prize.value == null) {
        rows.push({
          key: row.key,
          kind: "jackpot",
          title: "Jackpot",
          matchLabel,
          count: row.count,
          countLabel: `${row.count} winning drawing${row.count === 1 ? "" : "s"}`,
          total: null,
          totalLabel: "Amount not estimated",
          isJackpot: true,
          ratio: drawings > 0 ? row.count / drawings : 0,
        });
        continue;
      }
      unit = prize.value;
      total = unit * tickets * row.count;
    }

    subtotalSum += total;
    let baseLabel;
    if (row.unitMixed) {
      baseLabel = "Base prize (era-mixed amounts)";
    } else if (unit != null) {
      baseLabel = `${formatUsd(unit)} base prize`;
    } else {
      baseLabel = "Base prize";
    }
    rows.push({
      key: row.key,
      kind: "prize",
      title: baseLabel,
      matchLabel,
      count: row.count,
      countLabel: `${row.count} winning drawing${row.count === 1 ? "" : "s"}`,
      total,
      totalLabel: `${formatUsd(total)} total`,
      isJackpot: false,
      ratio: drawings > 0 ? row.count / drawings : 0,
      unit,
    });
  }

  return { rows, subtotalSum };
}

export function buildResultsPresentation(result) {
  if (!result || !result.ok || result.empty) {
    return { ok: false, empty: Boolean(result && result.empty), message: result && result.message };
  }

  const spent = result.hypotheticalSpent;
  const prizes = result.estimatedBasePrizes;
  const net = result.net;
  const hasJackpot = (result.jackpotTierCount || 0) > 0;
  const mmMode = mmPrizePresentationMode(result);
  const mmUsesBuiltInMultiplierBase = mmMode === "post" || mmMode === "mixed";

  let outcome;
  let conclusionEyebrow = null;
  let conclusionHeadline;
  let conclusionLabel;
  let conclusionAmount;
  let narrative;
  let narrativeSecondary = null;
  let returnSentence = null;

  if (hasJackpot) {
    // Overall P/L unknown when any jackpot-tier match exists (jackpot $ not estimated).
    outcome = "indeterminate";
    conclusionEyebrow = "Jackpot-tier match found";
    conclusionHeadline = "Overall net cannot be determined";
    conclusionLabel = "";
    conclusionAmount = "Jackpot value not estimated";
    narrative =
      "This run includes a jackpot-tier match. Because the historical jackpot amount is not estimated, total prizes and overall gain or loss cannot be calculated.";
    narrativeSecondary = mmUsesBuiltInMultiplierBase
      ? (mmMode === "mixed"
          ? `Excluding the jackpot value, known base prizes total ${formatUsd(prizes)} (pre–Apr 8 without optional Megaplier, later before the built-in multiplier) against ${formatUsd(spent)} in ticket cost.`
          : `Excluding the jackpot value, known base prizes before the built-in multiplier total ${formatUsd(prizes)} against ${formatUsd(spent)} in ticket cost.`)
      : `Excluding the jackpot value, known base prizes total ${formatUsd(prizes)} against ${formatUsd(spent)} in ticket cost.`;
    // Hide generic return-per-dollar when jackpot-tier is present.
    returnSentence = null;
  } else {
    outcome = "break-even";
    if (net < 0) outcome = "loss";
    else if (net > 0) outcome = "gain";

    if (outcome === "loss") {
      conclusionHeadline = `You would have lost an estimated ${formatUsd(Math.abs(net))}`;
      conclusionLabel = "Estimated loss";
      conclusionAmount = formatUsd(net);
      if (mmMode === "post") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes before the built-in multiplier, for a net loss of ${formatUsd(Math.abs(net))}.`;
      } else if (mmMode === "mixed") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes (pre–Apr 8 without optional Megaplier, later before the built-in multiplier), for a net loss of ${formatUsd(Math.abs(net))}.`;
      } else if (mmMode === "pre") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes without Megaplier, for a net loss of ${formatUsd(Math.abs(net))}.`;
      } else {
        narrative = `You would have spent ${formatUsd(spent)} and received an estimated ${formatUsd(prizes)} in base prizes, for a net loss of ${formatUsd(Math.abs(net))}.`;
      }
    } else if (outcome === "gain") {
      conclusionHeadline = `You would have gained an estimated ${formatUsd(net)}`;
      conclusionLabel = "Estimated gain";
      conclusionAmount = `+${formatUsd(net)}`;
      if (mmMode === "post") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes before the built-in multiplier, for a net gain of ${formatUsd(net)}.`;
      } else if (mmMode === "mixed") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes (pre–Apr 8 without optional Megaplier, later before the built-in multiplier), for a net gain of ${formatUsd(net)}.`;
      } else if (mmMode === "pre") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes without Megaplier, for a net gain of ${formatUsd(net)}.`;
      } else {
        narrative = `You would have spent ${formatUsd(spent)} and received an estimated ${formatUsd(prizes)} in base prizes, for a net gain of ${formatUsd(net)}.`;
      }
    } else {
      conclusionHeadline = "Estimated break-even";
      conclusionLabel = "Estimated break-even";
      conclusionAmount = "$0";
      if (mmMode === "post") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes before the built-in multiplier, for a break-even net of $0.`;
      } else if (mmMode === "mixed") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes (pre–Apr 8 without optional Megaplier, later before the built-in multiplier), for a break-even net of $0.`;
      } else if (mmMode === "pre") {
        narrative = `You would have spent ${formatUsd(spent)} and matched ${formatUsd(prizes)} in base prizes without Megaplier, for a break-even net of $0.`;
      } else {
        narrative = `You would have spent ${formatUsd(spent)} and received an estimated ${formatUsd(prizes)} in base prizes, for a break-even net of $0.`;
      }
    }
    returnSentence = formatReturnPerDollarSentence(result.returnRate, {
      qualifyBaseBeforeMultiplier: mmUsesBuiltInMultiplierBase,
    });
  }

  const { rows: prizeRows, subtotalSum } = buildPrizeResultRows(result);

  const best = result.bestMatch;
  const bestMatchLabel = best
    ? formatMatchTierLabel(best.whiteMatches, best.bonusMatch, result.specialName)
    : "No prize-tier match";
  const bestMatchDate = best ? formatIsoDateShort(best.d) : "—";

  const winningDrawings = (result.meaningfulMatches || []).map((m) => ({
    d: m.d,
    dateLabel: formatIsoDateShort(m.d),
    matchLabel: formatMatchTierLabel(m.whiteMatches, m.bonusMatch, result.specialName),
    prizeLabel: m.isJackpot
      ? "Jackpot (amount not estimated)"
      : formatUsd(m.estimatedPrize),
    isJackpot: Boolean(m.isJackpot),
  }));

  return {
    ok: true,
    empty: false,
    outcome,
    conclusionEyebrow,
    conclusionHeadline,
    conclusionLabel,
    conclusionAmount,
    narrative,
    narrativeSecondary,
    returnSentence,
    returnPerDollar: hasJackpot ? null : formatReturnPerDollar(result.returnRate),
    cards: {
      totalTicketCost: { label: "Total ticket cost", amount: formatUsd(spent) },
      estimatedPrizes: (() => {
        if (mmUsesBuiltInMultiplierBase) {
          return {
            label: "Base prizes before multiplier",
            amount: formatUsd(prizes),
            helper: hasJackpot
              ? "Excludes jackpot value; base amounts before built-in multiplier"
              : "Official base amounts before the built-in multiplier (2×–10× not applied)",
          };
        }
        if (mmMode === "pre") {
          return {
            label: "Base prizes without Megaplier",
            amount: formatUsd(prizes),
            helper: hasJackpot
              ? "Excludes jackpot value"
              : "Official base amounts only (optional Megaplier not included)",
          };
        }
        return {
          label: hasJackpot ? "Known estimated prizes" : "Estimated prizes",
          amount: formatUsd(prizes),
          helper: hasJackpot
            ? "Excludes jackpot value"
            : "Official base amounts only (before MM built-in multiplier; Megaplier excluded)",
        };
      })(),
      estimatedNet: {
        label: hasJackpot ? "Net excluding jackpot value" : "Estimated net",
        amount: formatUsdSigned(net, { forcePlus: net > 0 }),
      },
    },
    // Conclusion already carries jackpot-unknown copy; avoid a redundant banner.
    jackpotBanner: null,
    ticketCostBreakdown: (result.ticketCostBreakdown || []).map((b) => ({
      price: b.price,
      priceLabel: formatUsd(b.price),
      drawings: b.drawings,
      tickets: b.tickets,
      subtotal: b.subtotal,
      subtotalLabel: formatUsd(b.subtotal),
      dateRule: b.dateRule,
    })),
    ticketPriceMixed: Boolean(result.ticketPriceMixed),
    priceKindsUsed: result.priceKindsUsed || [],
    runDetails: {
      drawingsAnalyzed: result.drawingsAnalyzed,
      ticketsPerDrawing: result.ticketsPerDrawing,
      ticketPrice: result.ticketPriceMixed
        ? "Mixed ($2 and $5)"
        : result.ticketPrice != null
          ? `${formatUsd(result.ticketPrice)} per drawing`
          : "—",
      ticketPriceMixed: Boolean(result.ticketPriceMixed),
      winningDrawings: result.meaningfulTotal || 0,
      noPrizeDrawings: result.noMatchCount || 0,
      bestMatch: bestMatchLabel,
      bestMatchDate,
    },
    prizeRows,
    prizeSubtotalSum: subtotalSum,
    winningDrawings,
    winningTruncated: Boolean(result.meaningfulTruncated),
    winningTotal: result.meaningfulTotal || 0,
    winningLimit: result.meaningfulMatchLimit || MEANINGFUL_MATCH_LIMIT,
    disclaimer:
      "Historical estimate only. Mega Millions ticket cost uses $2 before Apr 8, 2025 and $5 from that drawing on. Prize totals use official base amounts (legacy table before Apr 8, 2025; base-before-multiplier afterward). Built-in multipliers, optional Megaplier, Power Play, jackpot cash, taxes, and jurisdiction rules are not included. This is not claim verification.",
    picksLabel: `${(result.whites || []).map((n) => String(n).padStart(2, "0")).join("-")} + ${result.specialAbbr} ${String(result.bonus).padStart(2, "0")}`,
    periodLabel: result.period,
  };
}
