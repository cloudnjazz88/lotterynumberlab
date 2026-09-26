/**
 * DOM-free unit tests + browser smoke for Lottery Odds Explorer.
 * Verifies against project prizeTable / jackpot denominators -- does not invent odds.
 */

import { buildContext, prizeTable } from "./compute-context.mjs";
import {
  probabilityAtLeastOne,
  parsePositiveInt,
  exploreGame,
  exploreOdds,
  formatProbability,
  formatOneIn,
  expectedPerMillion,
  TICKET_PRICE_USD,
} from "./odds-math.mjs";
import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve, extname } from "node:path";

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

const ctx = buildContext();
const mm = ctx.mm.config;
const pb = ctx.pb.config;
const mmTable = prizeTable(mm);
const pbTable = prizeTable(pb);

check("MM jackpot denominator 290472336", mm.jackpotOdds === 290472336);
check("PB jackpot denominator 292201338", pb.jackpotOdds === 292201338);
check(
  "MM jackpot tier matches config",
  Math.abs(mmTable.rows[0].oneIn - mm.jackpotOdds) < 1e-6,
);
check(
  "PB jackpot tier matches config",
  Math.abs(pbTable.rows[0].oneIn - pb.jackpotOdds) < 1e-6,
);
check(
  "MM any-prize matches site matrix",
  Math.abs(mmTable.anyPrizeOneIn - ctx.mm.table.anyPrizeOneIn) < 1e-9,
);
check(
  "PB any-prize matches site matrix",
  Math.abs(pbTable.anyPrizeOneIn - ctx.pb.table.anyPrizeOneIn) < 1e-9,
);

const pMm = 1 / mm.jackpotOdds;
const pPb = 1 / pb.jackpotOdds;

check("n=1 equals p (MM jackpot)", Math.abs(probabilityAtLeastOne(pMm, 1) - pMm) < 1e-18);
check("n=1 equals p (PB jackpot)", Math.abs(probabilityAtLeastOne(pPb, 1) - pPb) < 1e-18);
check("n=1 equals p (MM any)", Math.abs(probabilityAtLeastOne(mmTable.anyPrize, 1) - mmTable.anyPrize) < 1e-15);

const nSeq = [1, 5, 10, 52, 104, 500];
let mono = true;
let prev = -1;
for (const n of nSeq) {
  const v = probabilityAtLeastOne(pMm, n);
  if (!(v > prev) || v < 0 || v > 1) mono = false;
  prev = v;
}
check("monotonic in n and in [0,1]", mono);

check("p=0 -> 0", probabilityAtLeastOne(0, 100) === 0);
check("p=1 -> 1", probabilityAtLeastOne(1, 3) === 1);
check("n=0 -> 0", probabilityAtLeastOne(pMm, 0) === 0);
check("bad p rejects", probabilityAtLeastOne(-0.1, 5) === null);
check("bad n rejects", probabilityAtLeastOne(pMm, -1) === null);
check("parse 25", parsePositiveInt(25) === 25);
check("parse rejects 0", parsePositiveInt(0) === null);
check("parse rejects 1001", parsePositiveInt(1001) === null);
check("parse rejects 1.5", parsePositiveInt(1.5) === null);

const configs = { megamillions: mm, powerball: pb };
const mm1 = exploreGame(mm, 1, 1);
check("explore MM n=1 ok", mm1.ok === true);
check("MM ticket price $5", mm1.ticketPrice === 5 && TICKET_PRICE_USD.megamillions === 5);
check("MM spend $5 for 1 ticket", mm1.estimatedSpend === 5);
check("MM total tickets 1", mm1.totalTickets === 1);
check(
  "MM p jackpot equals one-ticket p",
  Math.abs(mm1.pAtLeastOneJackpot - pMm) < 1e-18,
);
check(
  "MM p any equals one-ticket any",
  Math.abs(mm1.pAtLeastOnePrize - mmTable.anyPrize) < 1e-15,
);

const pb104 = exploreGame(pb, 1, 104);
check("PB 104 tickets spend $208", pb104.ok && pb104.estimatedSpend === 208);
check("PB 104 total tickets", pb104.totalTickets === 104);
check(
  "PB 104 jackpot p in (p, 104p)",
  pb104.pAtLeastOneJackpot > pPb && pb104.pAtLeastOneJackpot < 104 * pPb,
);

const cmp = exploreOdds({ mode: "compare", ticketsPerDrawing: 10, drawings: 52, configs });
check("compare ok", cmp.ok === true && cmp.games.length === 2);
check("compare same n", cmp.totalAttempts === 520);
check("compare MM spend", cmp.games[0].estimatedSpend === 5 * 520);
check("compare PB spend", cmp.games[1].estimatedSpend === 2 * 520);

const bad = exploreOdds({ mode: "megamillions", ticketsPerDrawing: 0, drawings: 1, configs });
check("bad input guard", bad.ok === false);

const tiersOk =
  mm1.tiers.length === 9 &&
  mm1.tiers.every(
    (t, i) =>
      Math.abs(t.oneTicketP - mmTable.rows[i].probability) < 1e-18 &&
      Math.abs(t.acrossAttempts - t.oneTicketP) < 1e-18 &&
      Math.abs(t.expectedPer1M - t.oneTicketP * 1e6) < 1e-9,
  );
check("tier probs match site matrix (n=1)", tiersOk);

const fmt = formatProbability(pMm);
check("format tiny jackpot is percent not sci", /%$/.test(fmt.text) && !/[eE][+-]?\d+/.test(fmt.text) && fmt.oneIn > 1e8);
check("formatOneIn rare uses 1-in-X", /About 1 in /.test(formatOneIn(fmt.oneIn)));
const highFmt = formatProbability(0.99);
check("format high p is percent", highFmt.text === "99.00%");
check("formatOneIn high uses N-in-100", /About a 99 in 100 chance/.test(formatOneIn(highFmt.oneIn)));
check("formatOneIn avoids 1 in 1.01", !/1 in 1\.0/.test(formatOneIn(highFmt.oneIn) || ""));
check("expectedPerMillion jackpot tiny", expectedPerMillion(pMm) < 0.01);


/* -------------------- browser smoke + screenshots -------------------- */
const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = 4177;
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split("?")[0]);
  const target = resolve(ROOT, "." + (path.endsWith("/") ? path + "index.html" : path));
  if (!target.startsWith(ROOT) || !existsSync(target)) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(target)] || "application/octet-stream" });
  res.end(readFileSync(target));
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const url = `http://127.0.0.1:${PORT}/tools/odds-explorer.html`;

const CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("Chrome/Edge not found for odds-explorer browser checks");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--hide-scrollbars", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();

await page.setViewport({ width: 1024, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle0" });
await page.waitForSelector("#odds-results .odds-game-card");

const live = await page.evaluate(() => {
  const card = document.querySelector(".odds-game-card");
  const h1 = document.querySelector("h1")?.textContent.trim();
  const responsibility = [...document.querySelectorAll(".callout h3")].map((h) => h.textContent.trim());
  const attempts = document.getElementById("odds-attempts")?.textContent.trim();
  const jackpotDd = [...card.querySelectorAll("dt")].find((dt) => /P\\(at least one jackpot\\)/.test(dt.textContent));
  return {
    h1,
    responsibility,
    attempts,
    hasTierTable: !!card.querySelector(".odds-tier-table"),
    cardTitle: card.querySelector("h3")?.textContent.trim(),
    interpret: card.querySelector(".odds-interpret")?.textContent || "",
  };
});
check("live H1", live.h1 === "Lottery Odds Explorer");
check(
  "responsibility title",
  live.responsibility.some((t) => /More tickets do not make lottery play a good investment/i.test(t)),
);
check("default attempts 1", /1 total attempts/.test(live.attempts || ""));
check("default MM card", live.cardTitle === "Mega Millions");
check("tier table rendered", live.hasTierTable === true);
check("interpretive sentence present", /Mega Millions/i.test(live.interpret));

// keyboard: Tab to a mode button and activate Powerball with Enter
await page.focus('.odds-mode-btn[data-mode="powerball"]');
await page.keyboard.press("Enter");
await page.waitForFunction(() => document.querySelector(".odds-game-card h3")?.textContent.includes("Powerball"));
const pbTitle = await page.$eval(".odds-game-card h3", (el) => el.textContent.trim());
check("keyboard selects Powerball", pbTitle === "Powerball");

// compare both + 104 drawings
await page.click('.odds-mode-btn[data-mode="compare"]');
await page.click('.odds-drawings-btn[data-value="104"]');
await page.waitForFunction(() => document.querySelectorAll(".odds-game-card").length === 2);
const compare = await page.evaluate(() => ({
  cards: document.querySelectorAll(".odds-game-card").length,
  attempts: document.getElementById("odds-attempts")?.textContent.trim(),
  spends: [...document.querySelectorAll(".odds-results__grid dd")].map((d) => d.textContent.trim()),
}));
check("compare both shows 2 cards", compare.cards === 2);
check("104 drawings attempts", /104 total attempts/.test(compare.attempts || ""));

// custom tickets clamp guard
await page.click('.odds-tickets-btn[data-value="custom"]');
await page.$eval("#odds-tickets-custom", (el) => {
  el.value = "0";
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
const badStatus = await page.$eval("#odds-status", (el) => el.textContent);
check("bad custom tickets guarded", /1 to 1000/.test(badStatus));

const shotDir = resolve(ROOT, "_phase3_backup/screenshots");
mkdirSync(shotDir, { recursive: true });

async function assertNoClip(page, label) {
  const report = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowX = doc.scrollWidth > doc.clientWidth + 1;
    const panels = [...document.querySelectorAll(".odds-game-card")];
    if (!panels.length) return { overflowX, wrapOverflow: true, clippedCount: 1, samples: ["missing panel"] };
    let wrapOverflow = false;
    const clipped = [];
    let wrapH = 0;
    for (const panel of panels) {
      const wrap = panel.querySelector(".odds-tier-wrap");
      if (!wrap) continue;
      const panelRect = panel.getBoundingClientRect();
      if (wrap.scrollWidth > wrap.clientWidth + 1) wrapOverflow = true;
      wrapH = Math.max(wrapH, Math.round(wrap.getBoundingClientRect().height));
      const sel = window.matchMedia("(max-width: 900px)").matches
        ? ".odds-tier-table tbody td, .odds-results__grid dt, .odds-results__grid dd"
        : ".odds-tier-table thead th, .odds-tier-table tbody td, .odds-results__grid dt, .odds-results__grid dd";
      for (const el of panel.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (el.scrollWidth > el.clientWidth + 1 || r.right > panelRect.right + 2) clipped.push(el);
      }
    }
    const body = document.getElementById("odds-results")?.innerText || "";
    return {
      overflowX,
      wrapOverflow,
      clippedCount: clipped.length,
      samples: clipped.slice(0, 3).map((el) => el.innerText.replace(/\s+/g, " ").trim().slice(0, 48)),
      hasSci: /\d+\.?\d*e[+-]?\d+/i.test(body),
      hasBadOneIn: /about 1 in 1\.0/i.test(body),
      wrapH,
    };
  });
  check(`${label}: overflow 0`, report.overflowX === false);
  check(`${label}: wrap overflow 0`, report.wrapOverflow === false);
  check(`${label}: no text clip`, report.clippedCount === 0);
  check(`${label}: no sci notation`, report.hasSci === false);
  check(`${label}: no 1-in-1.01`, report.hasBadOneIn === false);
  if (report.clippedCount) console.log("  clip samples:", report.samples);
  return report;
}

// Single-game screenshots + clip checks
for (const w of [1440, 1024, 768, 390]) {
  await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector("#odds-results .odds-game-card");
  await page.click('.odds-mode-btn[data-mode="megamillions"]');
  await page.click('.odds-tickets-btn[data-value="1"]');
  await page.click('.odds-drawings-btn[data-value="104"]');
  await page.waitForFunction(() => /104 total attempts/.test(document.getElementById("odds-attempts")?.textContent || ""));
  await assertNoClip(page, `MM ${w}`);
  await page.screenshot({ path: resolve(shotDir, `odds-explorer-p1-${w}.png`), fullPage: true });
}

// Compare-both at the same widths
for (const w of [1440, 1024, 768, 390]) {
  await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector("#odds-results .odds-game-card");
  await page.click('.odds-mode-btn[data-mode="compare"]');
  await page.click('.odds-tickets-btn[data-value="1"]');
  await page.click('.odds-drawings-btn[data-value="104"]');
  await page.waitForFunction(() => document.querySelectorAll(".odds-game-card").length === 2);
  await page.waitForFunction(() => /104 total attempts/.test(document.getElementById("odds-attempts")?.textContent || ""));
  await assertNoClip(page, `Compare ${w}`);
  await page.screenshot({ path: resolve(shotDir, `odds-explorer-p1-compare-${w}.png`), fullPage: true });
}

await page.setJavaScriptEnabled(false);
await page.setViewport({ width: 1024, height: 900, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "domcontentloaded" });
const jsOff = await page.evaluate(() => document.body.innerText);
check("JS-off has purpose prose", /educational|probability|Interactive explorer needs JavaScript/i.test(jsOff));
check("JS-off has formula", /p_at_least_one|1 - \\(1 - p\\)/i.test(jsOff));
check("JS-off has FAQ", /Does buying more tickets/i.test(jsOff));
check("JS-off has both jackpot odds", /290,472,336/.test(jsOff) && /292,201,338/.test(jsOff));
await page.screenshot({ path: resolve(shotDir, "odds-explorer-js-off-1024.png"), fullPage: true });

await browser.close();
server.close();

if (failed) {
  console.error(`\n${failed} odds-explorer test(s) failed`);
  process.exit(1);
}
console.log("\nAll odds-explorer tests passed");
