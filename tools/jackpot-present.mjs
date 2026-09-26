import { SCHEDULE, formatEtDate, formatEtShort } from "./jackpot-money.mjs";
import { freshness } from "./jackpot-parse.mjs";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

/**
 * Present a jackpot row for UI. Amounts are only shown when amount + target
 * drawing (nextDrawing) + verifiedAt are coherent and not expired/mismatched.
 * Stale/mismatched/expired rows render as awaiting/unavailable — never as
 * dollars that look like they belong to a newer drawing.
 */
export function presentJackpot(gameId, row, now = new Date(), scheduleNextIso = null) {
  const sched = SCHEDULE[gameId];
  const cash = row?.cashOption || row?.cashValue;
  if (!sched || !row?.estimatedJackpot || !cash || !row.nextDrawing || !row.verifiedAt) return null;
  const state = freshness(row, now, scheduleNextIso);
  if (state === "missing") return null;
  const showDollars = state === "fresh" || state === "stale";
  return {
    state,
    gameId,
    cashLabel: sched.cashLabel,
    sourceUrl: row.sourceUrl || sched.sourceUrl,
    sourceName: sched.sourceName,
    nextDrawing: row.nextDrawing,
    nextDrawingLabel: `${formatEtDate(row.nextDrawing)} · ${sched.timeLabel}`,
    verifiedAt: row.verifiedAt,
    verifiedLabel: `${formatEtShort(row.verifiedAt)} ET`,
    estimatedJackpot: showDollars ? row.estimatedJackpot : null,
    cash: showDollars ? cash : null,
  };
}

export function jackpotMarkup(est, compact = false) {
  if (!est) return "";
  const gameAttr = escapeHtml(est.gameId);
  // data-next-drawing keeps the baked-in next-draw line in sync with fillNextDrawings(),
  // but only when the card is unavailable (no dollars). Active amount cards bind the
  // label to data-jackpot-until so JS cannot retarget dollars onto a newer drawing.
  const nextLine = est.estimatedJackpot
    ? `<p class="jackpot-est__next">Next drawing <span data-jackpot-next-label>${escapeHtml(est.nextDrawingLabel)}</span></p>`
    : `<p class="jackpot-est__next">Next drawing <span data-next-drawing="${gameAttr}">${escapeHtml(est.nextDrawingLabel)}</span></p>`;

  if (est.state === "expired" || est.state === "mismatched" || !est.estimatedJackpot) {
    const state = est.state === "mismatched" ? "mismatched" : "expired";
    return `<div class="jackpot-est jackpot-est--unavailable" data-jackpot-state="${state}" data-jackpot-game="${gameAttr}">
            <p class="jackpot-est__unavailable">Current estimate unavailable</p>
            ${nextLine}
          </div>`;
  }

  const staleClass = est.state === "stale" ? " jackpot-est--stale" : "";
  const hint = compact ? "" : `<small>Advertised pre-tax lump sum</small>`;
  return `<div class="jackpot-est${staleClass}" data-jackpot-state="${est.state}" data-jackpot-until="${escapeHtml(est.nextDrawing)}" data-jackpot-verified="${escapeHtml(est.verifiedAt)}" data-jackpot-game="${gameAttr}">
            <p class="jackpot-est__kicker">Next estimated jackpot</p>
            <p class="jackpot-est__amount">${escapeHtml(est.estimatedJackpot.display)}</p>
            <p class="jackpot-est__cash"><span>${escapeHtml(est.cashLabel)}</span> <b>${escapeHtml(est.cash.display)}</b>${hint}</p>
            ${nextLine}
            <p class="jackpot-est__meta">Official estimate · Last verified ${escapeHtml(est.verifiedLabel)}
              <a class="text-link" href="${escapeHtml(est.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(est.sourceName)}</a>
            </p>
          </div>`;
}