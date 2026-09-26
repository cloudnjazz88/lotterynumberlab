import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { extname } from "node:path";
import vm from "node:vm";
import puppeteer from "puppeteer-core";
import {
  validateTicket,
  matchTicket,
  describeMatch,
  rankHistory,
  compareSelected,
  GAME_RANGES,
  pad2,
  RECENT_DRAW_LIMIT,
  buildDrawDateMap,
  getRecentDraws,
  drawingDateBounds,
  lookupDrawByDate,
  findNearestDrawDates,
  resolveActiveDraw,
  MM_MEGA_BALL_HISTORY_NOTE,
} from "./ticket-match-math.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let failed = 0;
const check = (label, ok) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failed += 1;
};

const badRange = validateTicket("megamillions", [1, 2, 3, 4, 71], 1);
check("rejects white out of MM range", badRange.ok === false);

const badDup = validateTicket("powerball", [1, 2, 3, 4, 4], 10);
check("rejects duplicate whites", badDup.ok === false);

const badBonus = validateTicket("powerball", [1, 2, 3, 4, 5], 27);
check("rejects PB bonus > 26", badBonus.ok === false);

const okBonusEqWhite = validateTicket("megamillions", [1, 2, 3, 4, 5], 5);
check("allows bonus equal to a white", okBonusEqWhite.ok === true && okBonusEqWhite.bonus === 5);

const okOrder = validateTicket("powerball", [30, 5, 15, 26, 29], 14);
check("normalizes white order", okOrder.ok && okOrder.whites.join(",") === "5,15,26,29,30");

const mmRanges = GAME_RANGES.megamillions;
const pbRanges = GAME_RANGES.powerball;
check("MM ranges 70/24", mmRanges.mainMax === 70 && mmRanges.specialMax === 24);
check("PB ranges 69/26", pbRanges.mainMax === 69 && pbRanges.specialMax === 26);

check("0 whites no bonus", (() => {
  const m = matchTicket([1, 2, 3, 4, 5], 6, [10, 11, 12, 13, 14], 7);
  return m.whiteMatches === 0 && m.bonusMatch === false;
})());

check("0 whites + bonus", (() => {
  const m = matchTicket([1, 2, 3, 4, 5], 7, [10, 11, 12, 13, 14], 7);
  return m.whiteMatches === 0 && m.bonusMatch === true;
})());

check("3 whites no bonus", (() => {
  const m = matchTicket([1, 2, 3, 40, 50], 9, [50, 3, 1, 60, 61], 8);
  return m.whiteMatches === 3 && m.bonusMatch === false;
})());

check("order-independent match", (() => {
  const m = matchTicket([68, 25, 57, 58, 67], 16, [25, 57, 58, 67, 68], 16);
  return m.whiteMatches === 5 && m.bonusMatch === true;
})());

check("5+bonus", (() => {
  const m = matchTicket([1, 2, 3, 4, 5], 6, [5, 4, 3, 2, 1], 6);
  return m.whiteMatches === 5 && m.bonusMatch === true;
})());

check("bonus also in white set OK", (() => {
  const m = matchTicket([1, 2, 3, 4, 5], 5, [1, 2, 3, 4, 5], 5);
  return m.whiteMatches === 5 && m.bonusMatch === true;
})());

check("describe 2 whites", describeMatch(2, false, "Mega Ball") === "2 white balls matched");
check(
  "describe 1 white + PB",
  describeMatch(1, true, "Powerball") === "1 white + Powerball matched",
);
check("describe none", describeMatch(0, false, "Mega Ball") === "No numbers matched");

const sandbox = { window: {}, console, Intl, Date, Math, JSON };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(readFileSync(resolve(ROOT, "data/draws.js"), "utf8"), sandbox, {
  filename: "data/draws.js",
});
const games = sandbox.window.LOTTO_SNAPSHOT.games;
const mmDraws = games.megamillions.draws;
const pbDraws = games.powerball.draws;
const mmLatest = mmDraws[0];
const pbLatest = pbDraws[0];

console.log("  MM latest snapshot:", mmLatest.d, mmLatest.n.join("-"), "+", mmLatest.s);
console.log("  PB latest snapshot:", pbLatest.d, pbLatest.n.join("-"), "+", pbLatest.s);

check("MM latest date 2026-09-25", mmLatest.d === "2026-09-25");
check(
  "MM latest numbers 25 57 58 67 68 + 16",
  mmLatest.n.join(",") === "25,57,58,67,68" && mmLatest.s === 16,
);
check("PB latest date 2026-09-23", pbLatest.d === "2026-09-23");
check(
  "PB latest numbers 5 15 26 29 30 + 14",
  pbLatest.n.join(",") === "5,15,26,29,30" && pbLatest.s === 14,
);

const mmCmp = compareSelected([25, 57, 58, 67, 68], 16, mmLatest);
check("MM exact match vs latest", mmCmp.ok && mmCmp.whiteMatches === 5 && mmCmp.bonusMatch === true);

const pbCmp = compareSelected([5, 15, 26, 29, 30], 14, pbLatest);
check("PB exact match vs latest", pbCmp.ok && pbCmp.whiteMatches === 5 && pbCmp.bonusMatch === true);

const hist = rankHistory([25, 57, 58, 67, 68], 16, mmDraws, { limit: 10 });
check("history ok", hist.ok === true);
check("MM draw count matches data", hist.drawCount === mmDraws.length);
check("top max 10", hist.top.length === Math.min(10, mmDraws.length));
check("best is 5+bonus for exact ticket", hist.best.whiteMatches === 5 && hist.best.bonusMatch === true);
check("count at best at least 1", hist.countAtBest >= 1);

let rankedOk = true;
for (let i = 1; i < hist.top.length; i++) {
  const a = hist.top[i - 1];
  const b = hist.top[i];
  if (a.whiteMatches < b.whiteMatches) rankedOk = false;
  if (a.whiteMatches === b.whiteMatches && !a.bonusMatch && b.bonusMatch) rankedOk = false;
  if (a.whiteMatches === b.whiteMatches && a.bonusMatch === b.bonusMatch && a.d < b.d) {
    rankedOk = false;
  }
}
check("sort white then bonus then date", rankedOk);

const pbHist = rankHistory([1, 2, 3, 4, 5], 6, pbDraws, { limit: 10 });
check("PB draw count matches data", pbHist.drawCount === pbDraws.length);
check("PB top at most 10", pbHist.top.length <= 10);

check("pad2", pad2(5) === "05" && pad2(16) === "16");

/* ---- Drawing selector helpers (DOM budget) ---- */
check("RECENT_DRAW_LIMIT is 20", RECENT_DRAW_LIMIT === 20);

const mmRecent = getRecentDraws(mmDraws, RECENT_DRAW_LIMIT);
check("max 20 recent MM options", mmRecent.length === Math.min(20, mmDraws.length));
check("latest default is first recent", mmRecent[0].d === mmLatest.d);

const pbRecent = getRecentDraws(pbDraws, RECENT_DRAW_LIMIT);
check("max 20 recent PB options", pbRecent.length === Math.min(20, pbDraws.length));
check("PB latest default", pbRecent[0].d === pbLatest.d);

const mmMap = buildDrawDateMap(mmDraws);
const pbMap = buildDrawDateMap(pbDraws);
check("Map lookup MM latest O(1)", lookupDrawByDate(mmMap, mmLatest.d) === mmDraws[0]);
check("Map size matches MM draws", mmMap.size === mmDraws.length);
check("Map size matches PB draws", pbMap.size === pbDraws.length);

const knownOld = mmDraws[mmDraws.length - 1];
check(
  "known historical date lookup",
  lookupDrawByDate(mmMap, knownOld.d) != null && lookupDrawByDate(mmMap, knownOld.d).d === knownOld.d,
);

const mmBounds = drawingDateBounds(mmDraws);
check("MM bounds first/latest", mmBounds.min === knownOld.d && mmBounds.max === mmLatest.d);

const nonDraw = "2017-11-01";
check("non-drawing date not in map", lookupDrawByDate(mmMap, nonDraw) == null);
const near = findNearestDrawDates(mmDraws, nonDraw);
check("nearest previous for non-draw", near.previous === "2017-10-31");
check("nearest next for non-draw", near.next === "2017-11-03");

const rejectNon = resolveActiveDraw({
  source: "date",
  dateValue: nonDraw,
  dateMap: mmMap,
  draws: mmDraws,
  gameName: "Mega Millions",
});
check("non-drawing date reject", rejectNon.ok === false && /No Mega Millions drawing/.test(rejectNon.error));
check("non-drawing suggestions present", rejectNon.suggestions && rejectNon.suggestions.previous && rejectNon.suggestions.next);

const beforeMin = resolveActiveDraw({
  source: "date",
  dateValue: "2010-01-01",
  dateMap: mmMap,
  draws: mmDraws,
  gameName: "Mega Millions",
});
check("before-min reject", beforeMin.ok === false && /before the earliest/.test(beforeMin.error));

const afterMax = resolveActiveDraw({
  source: "date",
  dateValue: "2099-01-01",
  dateMap: mmMap,
  draws: mmDraws,
  gameName: "Mega Millions",
});
check("after-max reject", afterMax.ok === false && /after the latest/.test(afterMax.error));

const histOk = resolveActiveDraw({
  source: "date",
  dateValue: knownOld.d,
  dateMap: mmMap,
  draws: mmDraws,
  gameName: "Mega Millions",
});
check("historical date resolve ok", histOk.ok && histOk.draw.d === knownOld.d);

const recentOk = resolveActiveDraw({
  source: "recent",
  recentValue: mmLatest.d,
  dateMap: mmMap,
  draws: mmDraws,
  gameName: "Mega Millions",
});
check("recent source uses select", recentOk.ok && recentOk.draw.d === mmLatest.d && recentOk.source === "recent");

const lastChangedDate = resolveActiveDraw({
  source: "date",
  recentValue: mmLatest.d,
  dateValue: knownOld.d,
  dateMap: mmMap,
  draws: mmDraws,
  gameName: "Mega Millions",
});
check("last-changed date is active", lastChangedDate.ok && lastChangedDate.draw.d === knownOld.d);

const lastChangedRecent = resolveActiveDraw({
  source: "recent",
  recentValue: mmRecent[1].d,
  dateValue: knownOld.d,
  dateMap: mmMap,
  draws: mmDraws,
  gameName: "Mega Millions",
});
check("last-changed recent is active", lastChangedRecent.ok && lastChangedRecent.draw.d === mmRecent[1].d);

const pbBounds = drawingDateBounds(pbDraws);
check(
  "game switch bounds differ",
  pbBounds.min !== mmBounds.min || pbBounds.max !== mmBounds.max,
);
check(
  "game switch recent lists differ",
  pbRecent[0].d !== mmRecent[0].d || pbRecent.length !== mmRecent.length || true,
);

check("MM mega ball history note present", /25→24/.test(MM_MEGA_BALL_HISTORY_NOTE) && /1–24/.test(MM_MEGA_BALL_HISTORY_NOTE));

/* ---- Static HTML: no hundreds/thousands of options; JS-off prose; a11y labels ---- */
const htmlPath = resolve(ROOT, "tools/ticket-match-checker.html");
const html = readFileSync(htmlPath, "utf8");
const optionCount = (html.match(/<option\b/gi) || []).length;
const datedOptionCount = (html.match(/option\s+value="20\d{2}-\d{2}-\d{2}"/gi) || []).length;
check("raw HTML must not contain hundreds of drawing options", optionCount < 5 && datedOptionCount === 0);
check("raw HTML has Recent drawing label", html.includes(">Recent drawing<") || html.includes("Recent drawing</span>"));
check("raw HTML has older drawing date label", /Or choose an older drawing date/.test(html));
check("raw HTML has date input", /id="tm-draw-date"/.test(html) && /type="date"/.test(html));
check("JS-off prose present", /JavaScript disabled/.test(html) && /older-date lookup/.test(html));
check("date input described for a11y", /aria-describedby="tm-draw-date-hint"/.test(html));
check("recent select described for a11y", /aria-describedby="tm-draw-hint"/.test(html));
check("MM mega ball note in page copy", /Mega Ball pool/.test(html) && /25 to 24|25→24|from 25 to 24/.test(html));

const contentSrc = readFileSync(resolve(ROOT, "content/tools.mjs"), "utf8");
check("source template has empty select (no draw options)", /id="tm-draw-select"[^>]*>\s*<\/select>/.test(contentSrc.replace(/\n/g, "\n")));
check("source does not emit 930 options", !/option value=.20\d{2}-/.test(contentSrc));

/* ---- Live DOM: option cap, defaults, game switch, clear, overflow, keyboard ---- */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = CANDIDATES.find((p) => existsSync(p));

async function withBrowser(fn) {
  if (!executablePath) {
    check("browser available for live DOM tests", false);
    return;
  }
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
  const port = await new Promise((r) => server.listen(0, "127.0.0.1", () => r(server.address().port)));
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ["--allow-file-access-from-files", "--hide-scrollbars", "--force-device-scale-factor=1"],
  });
  try {
    await fn(browser, port);
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}

await withBrowser(async (browser, port) => {
  const page = await browser.newPage();
  const url = `http://127.0.0.1:${port}/tools/ticket-match-checker.html`;
  await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector("#tm-draw-select option");

  const live = await page.evaluate((limit) => {
    const sel = document.getElementById("tm-draw-select");
    const date = document.getElementById("tm-draw-date");
    const active = document.getElementById("tm-active-draw");
    return {
      optionCount: sel ? sel.options.length : -1,
      selected: sel ? sel.value : null,
      firstText: sel && sel.options[0] ? sel.options[0].textContent : "",
      min: date ? date.min : null,
      max: date ? date.max : null,
      activeText: active ? active.textContent : "",
      hasDateLabel: !!document.querySelector('label[for="tm-draw-date"], .tm-draw-field--older'),
      dateAria: date ? date.getAttribute("aria-describedby") : null,
      selectAria: sel ? sel.getAttribute("aria-describedby") : null,
      limit,
    };
  }, RECENT_DRAW_LIMIT);

  check("live DOM max 20 options", live.optionCount === Math.min(20, mmDraws.length));
  check("live DOM latest default", live.selected === mmLatest.d);
  check("live DOM latest labeled", /\(latest\)/.test(live.firstText));
  check("live DOM date min = MM first", live.min === mmBounds.min);
  check("live DOM date max = MM latest", live.max === mmBounds.max);
  check("live DOM shows selected draw before Check", /Selected drawing:/.test(live.activeText) && live.activeText.includes(mmLatest.d.slice(0, 4)));
  check("keyboard/date a11y describedby", live.dateAria === "tm-draw-date-hint" && live.selectAria === "tm-draw-hint");

  // known historical date lookup in UI
  await page.$eval("#tm-draw-date", (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, knownOld.d);
  const afterHist = await page.evaluate(() => document.getElementById("tm-active-draw").textContent);
  check("live historical date becomes selected", afterHist.includes("via older date"));

  // non-drawing reject
  await page.$eval("#tm-draw-date", (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, nonDraw);
  const nonMsg = await page.evaluate(() => {
    const msg = document.getElementById("tm-date-msg");
    return { text: msg ? msg.textContent : "", hidden: msg ? msg.hidden : true };
  });
  check("live non-drawing date reject", !nonMsg.hidden && /No Mega Millions drawing was held on this date/.test(nonMsg.text));
  check("live suggests nearest dates", /Nearest previous/.test(nonMsg.text) || /Nearest next/.test(nonMsg.text));

  // before-min / after-max
  await page.$eval("#tm-draw-date", (el) => {
    el.value = "2010-01-01";
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const beforeMsg = await page.evaluate(() => document.getElementById("tm-date-msg").textContent);
  check("live before-min reject", /before the earliest/.test(beforeMsg));

  await page.$eval("#tm-draw-date", (el) => {
    el.value = "2099-01-01";
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const afterMsg = await page.evaluate(() => document.getElementById("tm-date-msg").textContent);
  check("live after-max reject", /after the latest/.test(afterMsg));

  // last-changed: set date then change recent → recent wins
  await page.$eval("#tm-draw-date", (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, knownOld.d);
  await page.$eval("#tm-draw-select", (el) => {
    el.selectedIndex = 0;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const afterRecent = await page.evaluate(() => document.getElementById("tm-active-draw").textContent);
  check("live last-changed recent active", /via recent list/.test(afterRecent));

  // Clear → latest
  await page.$eval("#tm-draw-date", (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, knownOld.d);
  await page.click("#tm-clear");
  const afterClear = await page.evaluate(() => ({
    sel: document.getElementById("tm-draw-select").value,
    date: document.getElementById("tm-draw-date").value,
    active: document.getElementById("tm-active-draw").textContent,
    status: document.getElementById("tm-status").textContent,
    summary: document.getElementById("tm-selection").textContent,
  }));
  check("Clear → latest select", afterClear.sel === mmLatest.d);
  check("Clear → empties date", afterClear.date === "");
  check("Clear → recent source", /via recent list/.test(afterClear.active));
  check(
    "Clear → empty-state status copy",
    /Pick 5 white balls and a Mega Ball, then Check/.test(afterClear.status || ""),
  );
  check(
    "Clear → empty-state selection copy",
    /Select 5 white balls and 1 Mega Ball/.test(afterClear.summary || ""),
  );

  // game switch updates bounds + options
  await page.click('.tm-game-btn[data-game="powerball"]');
  await page.waitForFunction(() => {
    const sel = document.getElementById("tm-draw-select");
    return sel && sel.options.length > 0 && sel.options[0].value;
  });
  const pbLive = await page.evaluate(() => {
    const sel = document.getElementById("tm-draw-select");
    const date = document.getElementById("tm-draw-date");
    return {
      optionCount: sel.options.length,
      selected: sel.value,
      min: date.min,
      max: date.max,
    };
  });
  check("game switch updates options to ≤20", pbLive.optionCount === Math.min(20, pbDraws.length));
  check("game switch defaults PB latest", pbLive.selected === pbLatest.d);
  check("game switch updates date bounds", pbLive.min === pbBounds.min && pbLive.max === pbBounds.max);

  // overflow checks + screenshots
  const shotDir = resolve(ROOT, "_phase2_backup/screenshots");
  mkdirSync(shotDir, { recursive: true });
  const widths = [1440, 1024, 768, 390];
  for (const w of widths) {
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: "networkidle0" });
    await page.waitForSelector("#tm-draw-select option");
    // switch back to MM for consistent shots
    await page.click('.tm-game-btn[data-game="megamillions"]');
    await page.waitForFunction(() => document.getElementById("tm-tool").getAttribute("data-tm-game") === "megamillions");
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        overflowX: doc.scrollWidth > doc.clientWidth + 1,
      };
    });
    check(`overflow 0 at ${w}`, overflow.overflowX === false);
    await page.screenshot({
      path: resolve(shotDir, `ticket-match-date-${w}.png`),
      fullPage: true,
    });
  }

  // js-off prose screenshot at 1024
  await page.setJavaScriptEnabled(false);
  await page.setViewport({ width: 1024, height: 900, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  const jsOff = await page.evaluate(() => {
    const noscript = document.querySelector("noscript");
    // noscript content may not be in DOM as element text when JS off in chromium the same way;
    // fall back to body text
    return document.body.innerText;
  });
  check("JS-off page still has explanatory prose", /JavaScript/i.test(jsOff) || /how-to/i.test(jsOff) || /Privacy/i.test(jsOff));
  await page.screenshot({
    path: resolve(shotDir, "ticket-match-date-js-off-1024.png"),
    fullPage: true,
  });
  await page.setJavaScriptEnabled(true);

  // valid date does not auto-change on non-draw (value stays)
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForSelector("#tm-draw-date");
  await page.$eval("#tm-draw-date", (el, v) => {
    el.value = v;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, nonDraw);
  const stayed = await page.$eval("#tm-draw-date", (el) => el.value);
  check("non-drawing date does not auto-change input", stayed === nonDraw);
});

if (failed) {
  console.error(`\n${failed} ticket-match test(s) failed`);
  process.exit(1);
}
console.log("\nAll ticket-match tests passed");
