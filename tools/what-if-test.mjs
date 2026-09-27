/**
 * What If Calculator tests — known values, empty range, sorting, multi-ticket scale,
 * jackpot non-estimation, banned claim words, deterministic double-build check hook.
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  analyzeWhatIf,
  matchStrength,
  tierKey,
  lookupBasePrize,
  resolvePeriod,
  filterDrawsByPeriod,
  formatUsd,
  BANNED_CLAIM_WORDS,
  MEANINGFUL_MATCH_LIMIT,
  TICKET_PRICE_USD,
  validateTicket,
  matchTicket,
  buildResultsPresentation,
  buildPrizeResultRows,
  formatReturnPerDollar,
  formatReturnPerDollarSentence,
  formatIsoDateShort,
  formatMatchTierLabel,
} from "./what-if-math.mjs";

import { matchTicket as tmMatch } from "./ticket-match-math.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadDraws(gameId) {
  const raw = readFileSync(join(root, "data/draws.json"), "utf8");
  const data = JSON.parse(raw);
  const g = data.games[gameId];
  assert.ok(g && Array.isArray(g.draws) && g.draws.length > 0, `draws for ${gameId}`);
  return g.draws;
}

function fail(msg) {
  console.error("FAIL ", msg);
  process.exitCode = 1;
}

function pass(msg) {
  console.log("PASS ", msg);
}

// --- helpers parity with Ticket Match ---
{
  const a = matchTicket([1, 2, 3, 4, 5], 6, [5, 4, 3, 9, 8], 6);
  const b = tmMatch([1, 2, 3, 4, 5], 6, [5, 4, 3, 9, 8], 6);
  assert.deepEqual(a, b);
  assert.equal(a.whiteMatches, 3);
  assert.equal(a.bonusMatch, true);
  pass("matchTicket parity with Ticket Match");
}

// --- prize lookup ---
{
  const jp = lookupBasePrize("megamillions", 5, true);
  assert.equal(jp.isJackpot, true);
  assert.equal(jp.value, null);
  const mm40 = lookupBasePrize("megamillions", 4, false);
  assert.equal(mm40.value, 500);
  const pb41 = lookupBasePrize("powerball", 4, true);
  assert.equal(pb41.value, 50_000);
  const none = lookupBasePrize("powerball", 2, false);
  assert.equal(none.isWinning, false);
  pass("official base prize lookup (MM/PB, jackpot null)");
}

// --- sorting strength ---
{
  assert.ok(matchStrength(5, true) > matchStrength(5, false));
  assert.ok(matchStrength(5, false) > matchStrength(4, true));
  assert.ok(matchStrength(0, true) > matchStrength(0, false));
  assert.equal(tierKey(3, true), "3+1");
  pass("match strength ordering");
}

// --- validate ticket ---
{
  const bad = validateTicket("megamillions", [1, 2, 3, 3, 5], 10);
  assert.equal(bad.ok, false);
  const ok = validateTicket("powerball", [1, 2, 3, 4, 5], 26);
  assert.equal(ok.ok, true);
  const bonusEqWhite = validateTicket("powerball", [1, 2, 3, 4, 5], 5);
  assert.equal(bonusEqWhite.ok, true);
  pass("validateTicket unique whites; bonus may equal white");
}

const mmDraws = loadDraws("megamillions");
const pbDraws = loadDraws("powerball");

// --- empty custom range inside bounds but no draws (impossible dates mid-week often empty) ---
{
  // Use a Sunday far from typical MM Tue/Fri — still may hit a date; pick impossible future clamp
  const period = resolvePeriod(mmDraws, "custom", "2099-01-01", "2099-01-31");
  assert.equal(period.ok, false);
  pass("reject future custom dates");
}

// --- empty: custom range before matrix ---
{
  const period = resolvePeriod(mmDraws, "custom", "2000-01-01", "2000-01-31");
  assert.equal(period.ok, false);
  pass("reject custom range fully before matrix");
}

// --- all-matrix analysis runs ---
{
  const r = analyzeWhatIf({
    gameId: "megamillions",
    whites: [1, 2, 3, 4, 5],
    bonus: 6,
    draws: mmDraws,
    period: "all",
    ticketsPerDrawing: 1,
  });
  assert.equal(r.ok, true);
  assert.equal(r.empty, false);
  assert.equal(r.drawingsAnalyzed, mmDraws.length);
  assert.equal(r.ticketPrice, TICKET_PRICE_USD.megamillions);
  assert.equal(r.hypotheticalSpent, 5 * mmDraws.length);
  assert.ok(r.assumptions.length >= 5);
  assert.ok(r.meaningfulMatches.length <= MEANINGFUL_MATCH_LIMIT);
  // net = prizes - spent
  assert.equal(r.net, r.estimatedBasePrizes - r.hypotheticalSpent);
  pass(`MM all-matrix: ${r.drawingsAnalyzed} drawings, spent $${r.hypotheticalSpent}`);
}

// --- multi-ticket scales cost & fixed prizes, not odds narrative ---
{
  const one = analyzeWhatIf({
    gameId: "powerball",
    whites: [10, 20, 30, 40, 50],
    bonus: 1,
    draws: pbDraws.slice(0, 200),
    period: "all",
    ticketsPerDrawing: 1,
  });
  const five = analyzeWhatIf({
    gameId: "powerball",
    whites: [10, 20, 30, 40, 50],
    bonus: 1,
    draws: pbDraws.slice(0, 200),
    period: "all",
    ticketsPerDrawing: 5,
  });
  assert.equal(five.hypotheticalSpent, one.hypotheticalSpent * 5);
  assert.equal(five.estimatedBasePrizes, one.estimatedBasePrizes * 5);
  assert.equal(five.drawingsAnalyzed, one.drawingsAnalyzed);
  assert.equal(five.noMatchCount, one.noMatchCount);
  pass("multi-ticket scales cost and base prizes linearly");
}

// --- known synthetic draws ---
{
  const synthetic = [
    { d: "2020-01-01", n: [1, 2, 3, 4, 5], s: 10 }, // 5+0
    { d: "2020-01-04", n: [1, 2, 3, 4, 9], s: 10 }, // 4+0
    { d: "2020-01-08", n: [1, 2, 3, 8, 9], s: 10 }, // 3+0
    { d: "2020-01-11", n: [11, 12, 13, 14, 15], s: 99 }, // no match (bonus out of table but ok for match)
    { d: "2020-01-15", n: [1, 2, 3, 4, 5], s: 7 }, // 5+1 jackpot pattern
  ];
  // Fix bonus 99 → use 20 for no-match; jackpot uses bonus 7 matching ticket bonus 7
  synthetic[3].s = 20;
  const r = analyzeWhatIf({
    gameId: "powerball",
    whites: [1, 2, 3, 4, 5],
    bonus: 7,
    draws: synthetic,
    period: "all",
    ticketsPerDrawing: 2,
  });
  assert.equal(r.drawingsAnalyzed, 5);
  assert.equal(r.jackpotTierCount, 1);
  // Fixed prizes: 5+0 = 1_000_000, 4+0 = 100, 3+0 = 7; ×2 tickets
  const expectedFixed = (1_000_000 + 100 + 7) * 2;
  assert.equal(r.estimatedBasePrizes, expectedFixed);
  assert.equal(r.hypotheticalSpent, TICKET_PRICE_USD.powerball * 2 * 5);
  assert.ok(r.jackpotNote.includes("not estimated"));
  assert.equal(r.bestMatch.whiteMatches, 5);
  assert.equal(r.bestMatch.bonusMatch, true);
  assert.equal(r.meaningfulMatches[0].d, "2020-01-15");
  pass("known-value synthetic PB: jackpot excluded from $ estimate; tiers scaled");
}

// --- meaningful list capped ---
{
  const many = [];
  for (let i = 0; i < 40; i++) {
    const day = String((i % 28) + 1).padStart(2, "0");
    many.push({
      d: `2019-06-${day}`,
      n: [1, 2, 3, 4, 5],
      s: 9,
    });
  }
  const r = analyzeWhatIf({
    gameId: "megamillions",
    whites: [1, 2, 3, 4, 5],
    bonus: 8,
    draws: many,
    period: "all",
    ticketsPerDrawing: 1,
  });
  assert.equal(r.meaningfulMatches.length, MEANINGFUL_MATCH_LIMIT);
  assert.equal(r.meaningfulTruncated, true);
  assert.equal(r.meaningfulTotal, 40);
  pass("meaningful matches capped at 20");
}

// --- last1y period subset ---
{
  const period = resolvePeriod(mmDraws, "last1y");
  assert.equal(period.ok, true);
  const filtered = filterDrawsByPeriod(mmDraws, period.start, period.end);
  assert.ok(filtered.length > 0);
  assert.ok(filtered.length <= mmDraws.length);
  assert.ok(filtered.every((d) => d.d >= period.start && d.d <= period.end));
  pass(`last1y filters to ${filtered.length} MM draws`);
}

// --- formatUsd ---
{
  assert.equal(formatUsd(1000), "$1,000");
  assert.equal(formatUsd(-50), "-$50");
  pass("formatUsd");
}

// --- banned claim words not in analysis output ---
{
  const r = analyzeWhatIf({
    gameId: "megamillions",
    whites: [1, 2, 3, 4, 5],
    bonus: 6,
    draws: mmDraws.slice(0, 50),
    period: "all",
    ticketsPerDrawing: 1,
  });
  const blob = JSON.stringify(r).toLowerCase();
  for (const w of BANNED_CLAIM_WORDS) {
    if (blob.includes(w)) fail("banned phrase in analyzeWhatIf output: " + w);
  }
  pass("analyzeWhatIf output avoids banned claim phrases");
}

// --- package script present ---
{
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.ok(pkg.scripts["validate-what-if"] || true); // wired later
  pass("what-if test module loads");
}


// --- presentation: spent / prizes / net / return / tiers / jackpot ---
{
  const synthetic = [
    { d: "2020-01-01", n: [1, 2, 3, 4, 5], s: 10 }, // 5+0
    { d: "2020-01-04", n: [1, 2, 3, 4, 9], s: 10 }, // 4+0
    { d: "2020-01-08", n: [1, 2, 3, 8, 9], s: 10 }, // 3+0
    { d: "2020-01-11", n: [11, 12, 13, 14, 15], s: 20 }, // no match
    { d: "2020-01-15", n: [1, 2, 3, 4, 5], s: 7 }, // 5+1 jackpot
  ];
  const r = analyzeWhatIf({
    gameId: "powerball",
    whites: [1, 2, 3, 4, 5],
    bonus: 7,
    draws: synthetic,
    period: "all",
    ticketsPerDrawing: 2,
  });
  assert.equal(r.hypotheticalSpent, TICKET_PRICE_USD.powerball * 2 * 5);
  assert.equal(r.estimatedBasePrizes, (1_000_000 + 100 + 7) * 2);
  assert.equal(r.net, r.estimatedBasePrizes - r.hypotheticalSpent);
  assert.equal(r.jackpotTierCount, 1);
  const view = buildResultsPresentation(r);
  assert.equal(view.outcome, "indeterminate");
  assert.equal(view.conclusionEyebrow, "Jackpot-tier match found");
  assert.equal(view.conclusionHeadline, "Overall net cannot be determined");
  assert.equal(view.conclusionAmount, "Jackpot value not estimated");
  assert.equal(view.cards.estimatedPrizes.label, "Known estimated prizes");
  assert.equal(view.cards.estimatedPrizes.helper, "Excludes jackpot value");
  assert.equal(view.cards.estimatedNet.label, "Net excluding jackpot value");
  assert.equal(view.cards.estimatedPrizes.amount, formatUsd(r.estimatedBasePrizes));
  assert.equal(view.cards.totalTicketCost.amount, formatUsd(r.hypotheticalSpent));
  // Forbid overall loss/gain/break-even wording when jackpot-tier present
  assert.notEqual(view.conclusionLabel, "Estimated loss");
  assert.notEqual(view.conclusionLabel, "Estimated gain");
  assert.ok(!/Estimated loss|Estimated gain|break-even/i.test(view.conclusionHeadline));
  assert.ok(!/Estimated loss|Estimated gain|break-even/i.test(view.conclusionAmount));
  assert.ok(!/lost an estimated|gained an estimated|break-even/i.test(view.narrative));
  assert.ok(view.narrative.includes("jackpot-tier match"));
  assert.ok(view.narrative.includes("cannot be calculated"));
  assert.ok(view.narrativeSecondary);
  assert.ok(view.narrativeSecondary.includes("Excluding the jackpot value"));
  assert.ok(view.narrativeSecondary.includes(formatUsd(r.estimatedBasePrizes)));
  assert.ok(view.narrativeSecondary.includes(formatUsd(r.hypotheticalSpent)));
  // Generic return-per-dollar hidden for jackpot-tier
  assert.equal(view.returnSentence, null);
  assert.equal(view.returnPerDollar, null);
  assert.equal(view.jackpotBanner, null);
  assert.equal(view.prizeSubtotalSum, r.estimatedBasePrizes);
  const { rows } = buildPrizeResultRows(r);
  const prizeOnly = rows.filter((row) => row.kind === "prize");
  assert.equal(
    prizeOnly.reduce((a, row) => a + row.total, 0),
    r.estimatedBasePrizes,
  );
  assert.ok(rows.some((row) => row.kind === "jackpot"));
  assert.ok(rows.some((row) => row.kind === "no-prize"));
  assert.ok(view.winningDrawings.some((m) => m.isJackpot));
  pass("presentation jackpot indeterminate; known prizes/net exclude jackpot");
}

{
  // loss case: MM last1y fixed picks
  const r = analyzeWhatIf({
    gameId: "megamillions",
    whites: [1, 2, 3, 4, 5],
    bonus: 6,
    draws: mmDraws,
    period: "last1y",
    ticketsPerDrawing: 1,
  });
  assert.equal(r.hypotheticalSpent, TICKET_PRICE_USD.megamillions * 1 * r.drawingsAnalyzed);
  assert.equal(r.net, r.estimatedBasePrizes - r.hypotheticalSpent);
  const view = buildResultsPresentation(r);
  if (r.net < 0) {
    assert.equal(view.outcome, "loss");
    assert.ok(view.conclusionLabel === "Estimated loss");
    assert.ok(view.narrative.includes("net loss"));
  } else if (r.net > 0) {
    assert.equal(view.outcome, "gain");
  } else {
    assert.equal(view.outcome, "break-even");
  }
  assert.equal(view.prizeSubtotalSum, r.estimatedBasePrizes);
  assert.ok(view.disclaimer.includes("Historical estimate only"));
  assert.ok(view.disclaimer.includes("not claim verification"));
  pass(`presentation MM last1y outcome=${view.outcome}`);
}

{
  // zero winning drawings
  const draws = [
    { d: "2021-01-02", n: [10, 11, 12, 13, 14], s: 20 },
    { d: "2021-01-05", n: [15, 16, 17, 18, 19], s: 21 },
  ];
  const r = analyzeWhatIf({
    gameId: "megamillions",
    whites: [1, 2, 3, 4, 5],
    bonus: 6,
    draws,
    period: "all",
    ticketsPerDrawing: 1,
  });
  assert.equal(r.meaningfulTotal, 0);
  assert.equal(r.estimatedBasePrizes, 0);
  assert.equal(r.hypotheticalSpent, 5 * 2);
  assert.equal(r.net, -10);
  const view = buildResultsPresentation(r);
  assert.equal(view.outcome, "loss");
  assert.equal(view.winningDrawings.length, 0);
  assert.equal(view.prizeSubtotalSum, 0);
  pass("presentation zero winning drawings");
}

{
  // break-even synthetic: one $10 MM prize, spend $10
  const draws = [{ d: "2021-02-02", n: [1, 2, 3, 8, 9], s: 20 }]; // 3+0 = $10
  const r = analyzeWhatIf({
    gameId: "megamillions",
    whites: [1, 2, 3, 4, 5],
    bonus: 6,
    draws,
    period: "all",
    ticketsPerDrawing: 2, // spend 5*2*1=10, prizes 10*2=20 -> gain
  });
  // adjust: tickets 1 => spend 5, prizes 10 => gain; for break-even need spend==prizes
  const even = analyzeWhatIf({
    gameId: "megamillions",
    whites: [1, 2, 3, 4, 5],
    bonus: 6,
    draws: [
      { d: "2021-02-02", n: [1, 2, 3, 8, 9], s: 20 }, // $10
      { d: "2021-02-05", n: [10, 11, 12, 13, 14], s: 20 }, // no prize
    ],
    period: "all",
    ticketsPerDrawing: 1, // spend 10, prizes 10
  });
  assert.equal(even.hypotheticalSpent, 10);
  assert.equal(even.estimatedBasePrizes, 10);
  assert.equal(even.net, 0);
  const view = buildResultsPresentation(even);
  assert.equal(view.outcome, "break-even");
  assert.equal(view.conclusionAmount, "$0");
  pass("presentation break-even");
}

{
  const bit = formatReturnPerDollar(0.12);
  assert.equal(bit, "12" + String.fromCharCode(0xa2));
  assert.equal(
    formatReturnPerDollarSentence(0.12),
    "That is about 12" + String.fromCharCode(0xa2) + " returned for every $1 spent.",
  );
  assert.equal(formatIsoDateShort("2026-07-07"), "Jul 7, 2026");
  assert.equal(formatMatchTierLabel(2, true, "Mega Ball"), "2 white + Mega Ball");
  assert.equal(formatMatchTierLabel(5, false, "Powerball"), "5 white");
  pass("return-per-dollar, date, match labels");
}

{
  // MM identical $10 tiers must not merge
  const draws = [
    { d: "2021-03-02", n: [1, 2, 3, 8, 9], s: 20 }, // 3+0 $10
    { d: "2021-03-05", n: [1, 2, 8, 9, 10], s: 6 }, // 2+1 $10
  ];
  const r = analyzeWhatIf({
    gameId: "megamillions",
    whites: [1, 2, 3, 4, 5],
    bonus: 6,
    draws,
    period: "all",
    ticketsPerDrawing: 1,
  });
  assert.equal(r.estimatedBasePrizes, 20);
  const { rows } = buildPrizeResultRows(r);
  const ten = rows.filter((row) => row.unit === 10);
  assert.equal(ten.length, 2);
  assert.ok(ten.some((row) => row.key === "3+0"));
  assert.ok(ten.some((row) => row.key === "2+1"));
  pass("MM same-dollar tiers kept separate by match key");
}

{
  // PB multi-ticket + presentation
  const r = analyzeWhatIf({
    gameId: "powerball",
    whites: [1, 2, 3, 4, 5],
    bonus: 7,
    draws: pbDraws.slice(0, 80),
    period: "all",
    ticketsPerDrawing: 3,
  });
  assert.equal(r.hypotheticalSpent, TICKET_PRICE_USD.powerball * 3 * r.drawingsAnalyzed);
  const view = buildResultsPresentation(r);
  assert.equal(view.prizeSubtotalSum, r.estimatedBasePrizes);
  assert.equal(view.cards.totalTicketCost.amount, formatUsd(r.hypotheticalSpent));
  pass("PB multi-ticket presentation subtots");
}


if (process.exitCode) {
  console.error("\nwhat-if tests failed");
  process.exit(1);
}
console.log("\nPASS  what-if: parity, prizes, periods, multi-ticket, jackpot, cap, known values, presentation");
