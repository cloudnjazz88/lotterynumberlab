/**
 * Illustrative jackpot-share math for the shared-jackpot guide.
 * DOM-free; used by content/guides.mjs and shared-jackpot-guide-test.mjs.
 * These helpers divide a stated annuity (or cash) figure by ticket count only —
 * they do not estimate real jackpots, taxes, or official final prizes.
 */

/** Equal pre-tax share of a stated prize pool for n winning tickets (n >= 1). */
export function equalTicketShare(total, ticketCount) {
  const pool = Number(total);
  const n = Number(ticketCount);
  if (!Number.isFinite(pool) || pool < 0) return null;
  if (!Number.isInteger(n) || n < 1) return null;
  return pool / n;
}

/** Simple fraction label such as 1/2, 1/3, 1/5. */
export function shareFractionLabel(ticketCount) {
  const n = Number(ticketCount);
  if (!Number.isInteger(n) || n < 1) return null;
  if (n === 1) return "100% (1/1)";
  return `1/${n}`;
}

/** Percentage of the full advertised annuity for one of n equal ticket shares. */
export function sharePercentLabel(ticketCount) {
  const n = Number(ticketCount);
  if (!Number.isInteger(n) || n < 1) return null;
  if (n === 1) return "100%";
  const pct = 100 / n;
  if (Number.isInteger(pct)) return `${pct}%`;
  return `${pct.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

export function formatMoneyUsd(amount) {
  if (amount == null || !Number.isFinite(amount)) return "—";
  return (
    "$" +
    Number(amount).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })
  );
}

/**
 * Rows for the illustrative $600M annuity split table.
 * @param {number} annuityTotal
 * @param {number[]} ticketCounts
 */
export function illustrativeAnnuityShareRows(
  annuityTotal = ILLUSTRATIVE_ANNUITY,
  ticketCounts = ILLUSTRATIVE_TICKET_COUNTS,
) {
  const total = Number(annuityTotal);
  if (!Number.isFinite(total) || total <= 0) return null;
  return ticketCounts.map((n) => {
    const share = equalTicketShare(total, n);
    return {
      tickets: n,
      fractionLabel: shareFractionLabel(n),
      percentLabel: sharePercentLabel(n),
      share,
      shareLabel: formatMoneyUsd(share),
      totalLabel: formatMoneyUsd(total),
    };
  });
}

export const ILLUSTRATIVE_ANNUITY = 600_000_000;
export const ILLUSTRATIVE_TICKET_COUNTS = [1, 2, 3, 5];
