/**
 * Same-draw distinct-ticket and multi-draw complement math for the
 * "Does buying more lottery tickets improve your odds?" guide.
 * DOM-free; used by the guide SoT and by more-tickets-guide-test.mjs.
 */

/** Jackpot hit probability for n distinct combinations in one drawing: n / N (n ≤ N). */
export function sameDrawJackpotProbability(n, N) {
  const tickets = Number(n);
  const pool = Number(N);
  if (!Number.isFinite(tickets) || !Number.isFinite(pool)) return null;
  if (!Number.isInteger(tickets) || tickets < 0) return null;
  if (!Number.isInteger(pool) || pool <= 0) return null;
  if (tickets > pool) return null;
  return tickets / pool;
}

/**
 * Independent attempts across drawings (or any i.i.d. trials):
 * P(at least one) = 1 - (1 - 1/N)^n via -expm1(n * log1p(-p)).
 */
export function multiDrawAtLeastOne(n, N) {
  const tickets = Number(n);
  const pool = Number(N);
  if (!Number.isFinite(tickets) || !Number.isFinite(pool)) return null;
  if (!Number.isInteger(tickets) || tickets < 0) return null;
  if (!Number.isInteger(pool) || pool <= 0) return null;
  const p = 1 / pool;
  if (tickets === 0) return 0;
  if (tickets === 1) return p;
  return -Math.expm1(tickets * Math.log1p(-p));
}

/** Display-only percentage for tiny jackpot probabilities (no scientific notation). */
export function formatTinyPercentage(p) {
  if (p == null || !Number.isFinite(p)) return "—";
  if (p <= 0) return "0%";
  if (p >= 1) return "100%";
  const pct = p * 100;
  if (pct >= 0.01) return pct.toFixed(2) + "%";
  const decimals = Math.min(12, Math.max(4, Math.ceil(-Math.log10(pct)) + 3));
  return pct.toFixed(decimals) + "%";
}

export function formatApproxOneIn(oneIn) {
  if (oneIn == null || !Number.isFinite(oneIn) || oneIn < 1) return "—";
  return "1 in " + Math.round(oneIn).toLocaleString("en-US");
}

export function formatMoneyUsd(amount) {
  return (
    "$" +
    Number(amount).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })
  );
}

/**
 * Comparison rows for one game.
 * @param {number} N jackpot combination count
 * @param {number} ticketPriceUsd numeric price per play
 * @param {number[]} ticketCounts default 1,5,10,100
 */
export function comparisonRows(N, ticketPriceUsd, ticketCounts = [1, 5, 10, 100]) {
  const pool = Number(N);
  const price = Number(ticketPriceUsd);
  if (!Number.isInteger(pool) || pool <= 0) return null;
  if (!Number.isFinite(price) || price < 0) return null;

  return ticketCounts.map((n) => {
    const p = sameDrawJackpotProbability(n, pool);
    const approxOneIn = p > 0 ? 1 / p : null;
    return {
      tickets: n,
      probability: p,
      probabilityLabel: `${n.toLocaleString("en-US")} / ${pool.toLocaleString("en-US")}`,
      approxOneIn,
      approxOneInLabel: formatApproxOneIn(approxOneIn),
      percentageLabel: formatTinyPercentage(p),
      cost: price * n,
      costLabel: formatMoneyUsd(price * n),
      multiDrawP: multiDrawAtLeastOne(n, pool),
    };
  });
}

export const GUIDE_TICKET_COUNTS = [1, 5, 10, 100];
