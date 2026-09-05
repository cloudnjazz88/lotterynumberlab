import { readFile } from "node:fs/promises";
import { parseUsdEstimate, formatUsdEstimate, moneyPair, validatePair, parseEtDateTime, SCHEDULE, etWeekday } from "./jackpot-money.mjs";
import {
  parseMegaMillionsPayload,
  parsePowerballHtml,
  freshness,
  looksLikeChallenge,
  gameContentEqual,
} from "./jackpot-parse.mjs";
import { presentJackpot, jackpotMarkup } from "./jackpot-present.mjs";

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

const throws = (fn) => {
  try {
    fn();
    return false;
  } catch {
    return true;
  }
};

check("$177 Million", parseUsdEstimate("$177 Million") === 177_000_000);
check("$1.2 Billion", parseUsdEstimate("$1.2 Billion") === 1_200_000_000);
check("$76.3 Million", parseUsdEstimate("$76.3 Million") === 76_300_000);
check("comma amount", parseUsdEstimate("$173,000,000") === 173_000_000);
check("format millions", formatUsdEstimate(193_000_000) === "$193 Million");
check("format 82.8", formatUsdEstimate(82_800_000) === "$82.8 Million");
check("reject zero", moneyPair(0) === null);
check("reject negative", parseUsdEstimate("-12 Million") === null);
check("jackpot < cash", validatePair(moneyPair(50_000_000), moneyPair(80_000_000)) !== null);
check("jackpot >= cash", validatePair(moneyPair(193_000_000), moneyPair(82_800_000)) === null);

check("naive ET in September is EDT", parseEtDateTime("2026-09-08T23:00:00") === "2026-09-09T03:00:00.000Z");
check("naive ET in January is EST", parseEtDateTime("2026-01-09T23:00:00") === "2026-01-10T04:00:00.000Z");
check("offset datetime kept", parseEtDateTime("2026-09-08T23:00:00-04:00") === "2026-09-09T03:00:00.000Z");

const mm = parseMegaMillionsPayload({
  NextDrawingDate: "2026-09-08T23:00:00",
  Jackpot: {
    CurrentPrizePool: 177000000,
    NextPrizePool: 193000000,
    CurrentCashValue: 76300000,
    NextCashValue: 82800000,
    Verified: true,
  },
});
check("MM uses NextPrizePool not Current", mm.estimatedJackpot.amount === 193000000);
check("MM uses NextCashValue not Current", mm.cashOption.amount === 82800000);
check("MM next is Tuesday 11 p.m. ET", mm.nextDrawing === "2026-09-09T03:00:00.000Z");

check(
  "tiny MM amounts rejected",
  throws(() => parseMegaMillionsPayload({
    NextDrawingDate: "2026-09-08T23:00:00",
    Jackpot: { NextPrizePool: 10, NextCashValue: 8, Verified: true },
  })),
);
check(
  "wrong MM weekday rejected",
  throws(() => parseMegaMillionsPayload({
    NextDrawingDate: "2026-09-07T23:00:00",
    Jackpot: { NextPrizePool: 193000000, NextCashValue: 82800000, Verified: true },
  })),
);
check(
  "unverified MM rejected",
  throws(() => parseMegaMillionsPayload({
    NextDrawingDate: "2026-09-08T23:00:00",
    Jackpot: { NextPrizePool: 193000000, NextCashValue: 82800000, Verified: false },
  })),
);
check("empty MM payload rejected", throws(() => parseMegaMillionsPayload(null)));

const pbHtml = `<!doctype html><html><title>Home | Powerball</title><body>
${"x".repeat(2500)}
<span>Estimated Jackpot</span>
<span>$173 Million</span>
<span>Cash Value</span>
<span>$74.6 Million</span>
<h4>Next Drawing</h4>
<p>Sat, Sep 5, 2026</p>
<div id="nextDraw" data-drawdateutc="2026-09-06T02:59:00.0000000Z"></div>
</body></html>`;
const pb = parsePowerballHtml(pbHtml);
check("PB jackpot", pb.estimatedJackpot.amount === 173000000);
check("PB cash", pb.cashValue.amount === 74600000);
check("PB next from utc", pb.nextDrawing === "2026-09-06T02:59:00.000Z");

check("empty html rejected", throws(() => parsePowerballHtml("")));
check("HTTP-like empty body rejected", throws(() => parsePowerballHtml("<html></html>")));
check("challenge detected", looksLikeChallenge("Just a moment... cf-challenge"));
check(
  "challenge html rejected",
  throws(() => parsePowerballHtml(`Just a moment ${"x".repeat(2500)} Estimated Jackpot $173 Million`)),
);
check(
  "missing utc rejected",
  throws(() => parsePowerballHtml(pbHtml.replace(/data-drawdateutc="[^"]+"/, ""))),
);
check(
  "visible date mismatch rejected",
  throws(() => parsePowerballHtml(pbHtml.replace("Sat, Sep 5, 2026", "Mon, Sep 7, 2026"))),
);
check(
  "wrong PB weekday rejected",
  throws(() => parsePowerballHtml(
    pbHtml
      .replace("Sat, Sep 5, 2026", "Sun, Sep 6, 2026")
      .replace("2026-09-06T02:59:00.0000000Z", "2026-09-07T03:00:00.0000000Z"),
  )),
);

const now = new Date("2026-09-05T16:00:00Z");
const freshRow = {
  estimatedJackpot: { amount: 193000000, display: "$193 Million", currency: "USD" },
  cashOption: { amount: 82800000, display: "$82.8 Million", currency: "USD" },
  nextDrawing: "2026-09-08T03:00:00.000Z",
  verifiedAt: "2026-09-05T15:00:00.000Z",
  sourceUrl: "https://www.megamillions.com/",
};
check("fresh under 48h", freshness(freshRow, now) === "fresh");
check(
  "stale after 48h",
  freshness({ ...freshRow, verifiedAt: "2026-09-03T12:00:00.000Z" }, now) === "stale",
);
check(
  "expired after next draw",
  freshness({ ...freshRow, nextDrawing: "2026-09-05T02:59:00.000Z" }, now) === "expired",
);
check("missing", freshness(null, now) === "missing");

const freshUi = presentJackpot("megamillions", freshRow, now);
const staleUi = presentJackpot("megamillions", { ...freshRow, verifiedAt: "2026-09-03T12:00:00.000Z" }, now);
const expiredUi = presentJackpot("megamillions", { ...freshRow, nextDrawing: "2026-09-05T02:59:00.000Z" }, now);
check("no data renders nothing", jackpotMarkup(null) === "");
check("fresh shows amount", jackpotMarkup(freshUi).includes("$193 Million") && !jackpotMarkup(freshUi).includes("unavailable"));
check("stale still shows amount", jackpotMarkup(staleUi).includes("$193 Million") && jackpotMarkup(staleUi).includes("jackpot-est--stale"));
check("expired hides amount", !jackpotMarkup(expiredUi).includes("$193 Million") && jackpotMarkup(expiredUi).includes("Current estimate unavailable"));
check("missing row is omitted", presentJackpot("megamillions", null, now) === null);

const same = { ...freshRow, verifiedAt: "2026-09-05T16:00:00.000Z" };
check("duplicate content is unchanged", gameContentEqual(freshRow, same));
check("amount change is detected", !gameContentEqual(freshRow, { ...freshRow, estimatedJackpot: { ...freshRow.estimatedJackpot, amount: 200000000 } }));

const previous = { megamillions: freshRow, powerball: { ...pb, verifiedAt: freshRow.verifiedAt } };
const afterOneFailure = { ...previous, megamillions: { ...freshRow, estimatedJackpot: { ...freshRow.estimatedJackpot, amount: 200000000, display: "$200 Million" } } };
check("one-game update keeps the other row", afterOneFailure.powerball === previous.powerball);

try {
  const stored = JSON.parse(await readFile(new URL("../data/jackpots.json", import.meta.url), "utf8"));
  for (const gameId of Object.keys(SCHEDULE)) {
    const row = stored.games?.[gameId];
    if (!row) continue;
    const cash = row.cashOption || row.cashValue;
    check(`${gameId} snapshot pair`, validatePair(row.estimatedJackpot, cash) === null);
    check(`${gameId} snapshot weekday`, SCHEDULE[gameId].days.includes(etWeekday(row.nextDrawing)));
    check(`${gameId} snapshot has verifiedAt`, Boolean(row.verifiedAt && !Number.isNaN(Date.parse(row.verifiedAt))));
  }
} catch {
  console.log("SKIP  stored jackpots.json (not written yet)");
}

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nall jackpot checks passed");
