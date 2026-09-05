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

export function presentJackpot(gameId, row, now = new Date()) {
  const sched = SCHEDULE[gameId];
  const cash = row?.cashOption || row?.cashValue;
  if (!sched || !row?.estimatedJackpot || !cash || !row.nextDrawing || !row.verifiedAt) return null;
  const state = freshness(row, now);
  if (state === "missing") return null;
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
    estimatedJackpot: state === "expired" ? null : row.estimatedJackpot,
    cash: state === "expired" ? null : cash,
  };
}

export function jackpotMarkup(est, compact = false) {
  if (!est) return "";
  if (est.state === "expired") {
    return `<div class="jackpot-est jackpot-est--unavailable" data-jackpot-state="expired">
            <p class="jackpot-est__unavailable">Current estimate unavailable</p>
          </div>`;
  }

  const staleClass = est.state === "stale" ? " jackpot-est--stale" : "";
  const hint = compact ? "" : `<small>Advertised pre-tax lump sum</small>`;
  return `<div class="jackpot-est${staleClass}" data-jackpot-state="${est.state}" data-jackpot-until="${escapeHtml(est.nextDrawing)}">
            <p class="jackpot-est__kicker">Next estimated jackpot</p>
            <p class="jackpot-est__amount">${escapeHtml(est.estimatedJackpot.display)}</p>
            <p class="jackpot-est__cash"><span>${escapeHtml(est.cashLabel)}</span> <b>${escapeHtml(est.cash.display)}</b>${hint}</p>
            <p class="jackpot-est__next">Next drawing ${escapeHtml(est.nextDrawingLabel)}</p>
            <p class="jackpot-est__meta">Official estimate · Last verified ${escapeHtml(est.verifiedLabel)}
              <a class="text-link" href="${escapeHtml(est.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(est.sourceName)}</a>
            </p>
          </div>`;
}
