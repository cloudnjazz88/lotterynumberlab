/** Parse and validate official USD jackpot / cash-value strings. */

const MIN_USD = 5_000_000;
const MAX_USD = 10_000_000_000;

export function parseUsdEstimate(raw) {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw);
  const text = String(raw).replace(/,/g, "").replace(/\s+/g, " ").trim();
  const match = text.match(/^\$?\s*([\d.]+)\s*(million|billion)?\s*$/i);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = (match[2] || "").toLowerCase();
  const amount = unit === "billion" ? value * 1e9 : unit === "million" ? value * 1e6 : value;
  return Math.round(amount);
}

export function formatUsdEstimate(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (amount >= 1e9) {
    const billions = amount / 1e9;
    const digits = Number.isInteger(billions) || billions >= 10 ? 0 : 1;
    return `$${billions.toFixed(digits)} Billion`;
  }
  const millions = amount / 1e6;
  const digits = Number.isInteger(millions) || millions >= 100 ? 0 : 1;
  return `$${millions.toFixed(digits)} Million`;
}

export function moneyPair(amount, display) {
  const value = parseUsdEstimate(amount ?? display);
  if (value == null || value < MIN_USD || value > MAX_USD) return null;
  return {
    amount: value,
    display: typeof display === "string" && display.includes("$") ? display.trim() : formatUsdEstimate(value),
    currency: "USD",
  };
}

export function validatePair(jackpot, cash) {
  if (!jackpot || !cash) return "missing jackpot or cash value";
  if (jackpot.currency !== "USD" || cash.currency !== "USD") return "currency must be USD";
  if (jackpot.amount < cash.amount) return "jackpot is smaller than cash value";
  return null;
}

export const SCHEDULE = {
  megamillions: {
    days: [2, 5],
    hour: 23,
    minute: 0,
    timeLabel: "11:00 p.m. ET",
    cashLabel: "Cash option",
    sourceUrl: "https://www.megamillions.com/",
    sourceName: "megamillions.com",
  },
  powerball: {
    days: [1, 3, 6],
    hour: 22,
    minute: 59,
    timeLabel: "10:59 p.m. ET",
    cashLabel: "Cash value",
    sourceUrl: "https://www.powerball.com/",
    sourceName: "powerball.com",
  },
};

const TZ = "America/New_York";

function tzOffsetMs(instant) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = {};
  for (const part of fmt.formatToParts(instant)) parts[part.type] = part.value;
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUTC - instant.getTime();
}

/** UTC instant for a New York wall-clock time (handles DST). */
export function easternTimeToInstant(year, month, day, hour, minute, second = 0) {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  for (let i = 0; i < 3; i++) {
    guess = new Date(Date.UTC(year, month - 1, day, hour, minute, second) - tzOffsetMs(guess));
  }
  return guess;
}

/** Accepts an ISO instant or a timezone-naive ET datetime from Mega Millions. */
export function parseEtDateTime(raw) {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(text)) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/);
  if (!match) return null;
  return easternTimeToInstant(+match[1], +match[2], +match[3], +match[4], +match[5], +(match[6] || 0)).toISOString();
}

export function formatEtDate(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function etShortDate(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function etWeekday(iso) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(new Date(iso));
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[weekday];
}

export function formatEtDateTime(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatEtShort(iso) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}
