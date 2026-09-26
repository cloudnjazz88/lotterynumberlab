/**
 * Lottery Odds Explorer math (DOM-free). Reuses prizeTable from compute-context
 * so jackpot / any-prize / tier probabilities stay in sync with the site matrix.
 */

import { prizeTable } from "./compute-context.mjs";

const TICKET_PRICE_USD = {
  megamillions: 5,
  powerball: 2,
};

/** P(at least one success) = 1 - (1 - p)^n via -expm1(n * log1p(-p)). */
export function probabilityAtLeastOne(p, n) {
  const prob = Number(p);
  const trials = Number(n);
  if (!Number.isFinite(prob) || !Number.isFinite(trials)) return null;
  if (prob < 0 || prob > 1) return null;
  if (trials < 0) return null;
  if (trials === 0) return 0;
  if (prob === 0) return 0;
  if (prob === 1) return 1;
  if (trials === 1) return prob;
  return -Math.expm1(trials * Math.log1p(-prob));
}

export function parsePositiveInt(value, { min = 1, max = 1000 } = {}) {
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

export function formatProbability(p) {
  if (p == null || !Number.isFinite(p)) return { text: "--", oneIn: null };
  if (p <= 0) return { text: "0", oneIn: null };
  if (p >= 1) return { text: "100%", oneIn: 1 };
  const oneIn = 1 / p;
  const pct = p * 100;
  let text;
  // Display-only: never use scientific notation in user-facing odds text.
  if (pct >= 0.01) {
    text = pct.toFixed(2) + "%";
  } else {
    const decimals = Math.min(12, Math.max(4, Math.ceil(-Math.log10(pct)) + 3));
    text = pct.toFixed(decimals) + "%";
  }
  return { text, oneIn };
}

export function formatOneIn(oneIn) {
  if (oneIn == null || !Number.isFinite(oneIn) || oneIn < 1) return null;
  // High probabilities: avoid "about 1 in 1.01" -- use N-in-100 phrasing.
  if (oneIn < 2) {
    const n = Math.min(99, Math.max(1, Math.round(100 / oneIn)));
    return "About a " + n + " in 100 chance";
  }
  if (oneIn >= 1000) {
    return "About 1 in " + Math.round(oneIn).toLocaleString("en-US");
  }
  if (oneIn >= 10) return "About 1 in " + oneIn.toFixed(1);
  return "About 1 in " + oneIn.toFixed(2);
}

export function expectedPerMillion(p) {
  if (p == null || !Number.isFinite(p) || p < 0) return null;
  return p * 1_000_000;
}

/**
 * Build explorer payload for one game.
 * @param {object} config game config from site context
 * @param {number} ticketsPerDrawing
 * @param {number} drawings
 */
export function exploreGame(config, ticketsPerDrawing, drawings) {
  const tickets = parsePositiveInt(ticketsPerDrawing, { min: 1, max: 1000 });
  const draws = parsePositiveInt(drawings, { min: 1, max: 1000 });
  if (!config || !config.id || tickets == null || draws == null) {
    return { ok: false, error: "Enter whole numbers from 1 to 1000 for tickets and drawings." };
  }

  const table = prizeTable(config);
  const jackpotRow = table.rows.find((r) => r.key === "5+1");
  const jackpotP = jackpotRow ? jackpotRow.probability : 1 / config.jackpotOdds;
  const anyP = table.anyPrize;
  const attempts = tickets * draws;
  const price = TICKET_PRICE_USD[config.id];
  if (price == null) {
    return { ok: false, error: "Unknown game." };
  }

  const pJackpot = probabilityAtLeastOne(jackpotP, attempts);
  const pAny = probabilityAtLeastOne(anyP, attempts);
  if (pJackpot == null || pAny == null) {
    return { ok: false, error: "Could not compute probabilities for these inputs." };
  }

  const tiers = table.rows.map((row) => {
    const pAcross = probabilityAtLeastOne(row.probability, attempts);
    return {
      key: row.key,
      match: row.match,
      oneTicketOdds: row.oneIn,
      oneTicketP: row.probability,
      acrossAttempts: pAcross,
      expectedPer1M: expectedPerMillion(row.probability),
    };
  });

  return {
    ok: true,
    gameId: config.id,
    name: config.name,
    ticketPrice: price,
    ticketPriceLabel: config.ticketPrice || ("$" + price),
    ticketsPerDrawing: tickets,
    drawings: draws,
    totalTickets: attempts,
    estimatedSpend: price * attempts,
    oneTicketJackpotOdds: config.jackpotOdds,
    oneTicketJackpotP: jackpotP,
    pAtLeastOneJackpot: pJackpot,
    pAtLeastOnePrize: pAny,
    anyPrizeOneIn: table.anyPrizeOneIn,
    tiers,
  };
}

export function exploreOdds(input) {
  const mode = input && input.mode;
  const tickets = parsePositiveInt(input && input.ticketsPerDrawing, { min: 1, max: 1000 });
  const drawings = parsePositiveInt(input && input.drawings, { min: 1, max: 1000 });
  if (tickets == null || drawings == null) {
    return { ok: false, error: "Enter whole numbers from 1 to 1000 for tickets per drawing and drawings." };
  }
  const configs = (input && input.configs) || {};
  if (mode === "megamillions" || mode === "powerball") {
    const cfg = configs[mode];
    if (!cfg) return { ok: false, error: "Missing game configuration." };
    const one = exploreGame(cfg, tickets, drawings);
    if (!one.ok) return one;
    return {
      ok: true,
      mode,
      ticketsPerDrawing: tickets,
      drawings,
      totalAttempts: tickets * drawings,
      games: [one],
    };
  }
  if (mode === "compare") {
    const mm = configs.megamillions;
    const pb = configs.powerball;
    if (!mm || !pb) return { ok: false, error: "Missing game configuration." };
    const a = exploreGame(mm, tickets, drawings);
    const b = exploreGame(pb, tickets, drawings);
    if (!a.ok) return a;
    if (!b.ok) return b;
    return {
      ok: true,
      mode,
      ticketsPerDrawing: tickets,
      drawings,
      totalAttempts: tickets * drawings,
      games: [a, b],
    };
  }
  return { ok: false, error: "Choose Mega Millions, Powerball, or Compare both." };
}

export { TICKET_PRICE_USD, prizeTable };
