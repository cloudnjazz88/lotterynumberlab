import {
  moneyPair,
  validatePair,
  SCHEDULE,
  etWeekday,
  parseEtDateTime,
  etShortDate,
} from "./jackpot-money.mjs";

const CHALLENGE = /cf-challenge|just a moment|attention required|access denied|cdn-cgi\/challenge/i;

export function looksLikeChallenge(text) {
  return typeof text === "string" && CHALLENGE.test(text);
}

function labeledMoney(html, label) {
  const pattern = new RegExp(
    `${label.replace(/\s+/g, "\\s+")}\\s*</[^>]+>\\s*<[^>]+>\\s*(\\$[\\d,.]+\\s*(?:Million|Billion)?)`,
    "i",
  );
  const tagged = html.match(pattern);
  if (tagged) return tagged[1].replace(/\s+/g, " ").trim();

  const loose = new RegExp(`${label.replace(/\s+/g, "\\s+")}[^$]{0,240}(\\$[\\d,.]+\\s*(?:Million|Billion)?)`, "i");
  const match = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").match(loose);
  return match ? match[1].trim() : null;
}

export function parseMegaMillionsPayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("Mega Millions: empty payload");
  const jackpot = payload.Jackpot;
  if (!jackpot || jackpot.Verified !== true) throw new Error("Mega Millions: jackpot is not verified");
  const annuity = moneyPair(jackpot.NextPrizePool);
  const cash = moneyPair(jackpot.NextCashValue);
  const pairError = validatePair(annuity, cash);
  if (pairError) throw new Error(`Mega Millions: ${pairError}`);

  const nextRaw = payload.NextDrawingDate || payload.nextDrawingDate;
  if (!nextRaw) throw new Error("Mega Millions: missing NextDrawingDate");
  const nextDrawing = parseEtDateTime(nextRaw);
  if (!nextDrawing) throw new Error("Mega Millions: invalid NextDrawingDate");
  const weekday = etWeekday(nextDrawing);
  if (!SCHEDULE.megamillions.days.includes(weekday)) {
    throw new Error(`Mega Millions: NextDrawingDate falls on weekday ${weekday}`);
  }

  return {
    estimatedJackpot: annuity,
    cashOption: cash,
    nextDrawing,
    sourceUrl: SCHEDULE.megamillions.sourceUrl,
  };
}

export function parsePowerballHtml(html) {
  if (!html || html.length < 2000) throw new Error("Powerball: response too short");
  if (looksLikeChallenge(html)) throw new Error("Powerball: challenge or block page");
  if (!/Powerball/i.test(html) || !/Estimated Jackpot/i.test(html)) {
    throw new Error("Powerball: unexpected page");
  }

  const jackpotDisplay = labeledMoney(html, "Estimated Jackpot");
  const cashDisplay = labeledMoney(html, "Cash Value");
  const annuity = moneyPair(null, jackpotDisplay);
  const cash = moneyPair(null, cashDisplay);
  const pairError = validatePair(annuity, cash);
  if (pairError) throw new Error(`Powerball: ${pairError}`);

  const utc = html.match(/data-drawdateutc="([^"]+)"/i);
  if (!utc) throw new Error("Powerball: missing data-drawdateutc");
  const nextDrawing = parseEtDateTime(utc[1]);
  if (!nextDrawing) throw new Error("Powerball: invalid next drawing");

  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const visible = text.match(
    /Next Drawing\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,\s+[A-Za-z]{3}\s+\d{1,2},\s+\d{4})/i,
  );
  if (!visible) throw new Error("Powerball: missing Next Drawing label");
  const expected = etShortDate(nextDrawing).replace(/,/g, "").toLowerCase();
  const labeled = visible[1].replace(/,/g, "").toLowerCase();
  if (expected !== labeled) {
    throw new Error("Powerball: Next Drawing date does not match data-drawdateutc");
  }
  const weekday = etWeekday(nextDrawing);
  if (!SCHEDULE.powerball.days.includes(weekday)) {
    throw new Error(`Powerball: next drawing falls on weekday ${weekday}`);
  }

  return {
    estimatedJackpot: annuity,
    cashValue: cash,
    nextDrawing,
    sourceUrl: SCHEDULE.powerball.sourceUrl,
  };
}

export function gameContentEqual(a, b) {
  if (!a || !b) return false;
  return (
    a.estimatedJackpot?.amount === b.estimatedJackpot?.amount &&
    (a.cashOption?.amount ?? a.cashValue?.amount) === (b.cashOption?.amount ?? b.cashValue?.amount) &&
    a.nextDrawing === b.nextDrawing
  );
}

export function freshness(estimate, now = new Date()) {
  if (!estimate) return "missing";
  if (Date.parse(estimate.nextDrawing) <= now.getTime()) return "expired";
  const age = now.getTime() - Date.parse(estimate.verifiedAt);
  if (!Number.isFinite(age) || age < 0) return "stale";
  if (age > 48 * 3600 * 1000) return "stale";
  return "fresh";
}
