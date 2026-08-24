/**
 * Headless smoke test for the whole static site: crawls every generated page,
 * checks the SEO head tags and internal links, exercises both generators, and
 * writes screenshots to screenshots/.
 *
 * Run: node tools/browser-check.mjs
 */

import puppeteer from "puppeteer-core";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { resolve, extname } from "node:path";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const SHOTS = resolve(ROOT, "screenshots");
const PORT = 4173;
const SETTLE = 1200;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* Served over HTTP rather than file:// so storage and fetch behave normally. */
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
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
const pageUrl = (rel) => `http://127.0.0.1:${PORT}/${rel}`;

const GAMES = {
  megamillions: { page: "mega-millions.html", name: "Mega Millions", mainMax: 70, specialMax: 24, abbr: "MB" },
  powerball: { page: "powerball.html", name: "Powerball", mainMax: 69, specialMax: 26, abbr: "PB" },
};

const PAGES = [
  "index.html",
  "mega-millions.html",
  "powerball.html",
  "guides/index.html",
  "guides/mega-millions-vs-powerball-odds.html",
  "guides/independent-trials.html",
  "guides/hot-and-cold-numbers-tested.html",
  "guides/what-winning-combinations-look-like.html",
  "guides/expected-value-of-a-lottery-ticket.html",
  "guides/record-jackpots-and-taxes.html",
  "guides/powerball-2015-rule-change.html",
  "guides/mega-millions-2025-rule-change.html",
  "guides/how-lottery-odds-are-calculated.html",
  "results/index.html",
  "results/mega-millions-2026.html",
  "results/powerball-2026.html",
  "faq.html",
  "glossary.html",
  "methodology.html",
  "about.html",
  "privacy-policy.html",
  "terms.html",
  "responsible-play.html",
];

const CANDIDATES = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];
const executablePath = CANDIDATES.find((p) => existsSync(p));
if (!executablePath) throw new Error("Chrome/Edge executable not found");

mkdirSync(SHOTS, { recursive: true });

const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: ["--allow-file-access-from-files", "--hide-scrollbars", "--force-device-scale-factor=1"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1200, deviceScaleFactor: 1.5 });

const problems = [];
let context = "startup";
page.on("console", (msg) => {
  if (msg.type() === "error" || msg.type() === "warning") {
    problems.push(`[${context}] console.${msg.type()}: ${msg.text()}`);
  }
});
page.on("pageerror", (err) => problems.push(`[${context}] pageerror: ${err.message}`));
page.on("requestfailed", (req) => problems.push(`[${context}] requestfailed: ${req.url()}`));

/* ------------------------- every page: head + links ------------------------ */

const titles = new Set();
const descriptions = new Set();

console.log("page audit:");
for (const path of PAGES) {
  context = path;
  await page.goto(pageUrl(path), { waitUntil: "load" });

  const info = await page.evaluate(() => {
    const meta = (name) =>
      document.querySelector(`meta[name="${name}"]`)?.content ||
      document.querySelector(`meta[property="${name}"]`)?.content ||
      "";
    return {
      title: document.title,
      description: meta("description"),
      canonical: document.querySelector('link[rel="canonical"]')?.href || "",
      og: meta("og:title"),
      jsonLd: document.querySelectorAll('script[type="application/ld+json"]').length,
      h1s: [...document.querySelectorAll("h1")].map((h) => h.textContent.trim()),
      words: document.body.innerText.trim().split(/\s+/).length,
      links: [...document.querySelectorAll("a[href]")]
        .map((a) => a.getAttribute("href"))
        .filter((href) => !/^(https?:|mailto:|#)/.test(href)),
      external: [...document.querySelectorAll('a[href^="http"]')].length,
      cjk: (document.body.innerText.match(/[\u1100-\u11FF\uAC00-\uD7AF\u3040-\u30FF\u4E00-\u9FFF]/g) || []).join(""),
      footerDisclaimer: !!document.querySelector(".footer__disclaimer"),
    };
  });

  console.log(
    `  ${path.padEnd(48)} ${String(info.words).padStart(5)} words · h1=${info.h1s.length} · ld+json=${info.jsonLd} · links=${info.links.length}`,
  );

  if (info.h1s.length !== 1) problems.push(`${path}: expected exactly one <h1>, found ${info.h1s.length}`);
  if (!info.description) problems.push(`${path}: missing meta description`);
  if (!info.canonical) problems.push(`${path}: missing canonical link`);
  if (!info.og) problems.push(`${path}: missing og:title`);
  if (!info.footerDisclaimer) problems.push(`${path}: footer disclaimer missing`);
  if (info.cjk) problems.push(`${path}: untranslated characters rendered: ${info.cjk}`);
  if (info.words < 260) problems.push(`${path}: only ${info.words} words of content`);
  if (titles.has(info.title)) problems.push(`${path}: duplicate <title> "${info.title}"`);
  if (descriptions.has(info.description)) problems.push(`${path}: duplicate meta description`);
  titles.add(info.title);
  descriptions.add(info.description);

  const base = path.includes("/") ? path.replace(/[^/]+$/, "") : "";
  for (const href of info.links) {
    const target = resolve(ROOT, base, href.replace(/[?#].*$/, ""));
    if (!existsSync(target)) problems.push(`${path}: dead link → ${href}`);
  }
}

const guideWords = [];
context = "guides/index.html";
await page.goto(pageUrl("guides/index.html"), { waitUntil: "load" });
const hubCards = await page.evaluate(() => document.querySelectorAll(".guide-card").length);
console.log(`\nguides hub lists ${hubCards} guides`);
if (hubCards !== 9) problems.push(`guides hub should list 9 guides, lists ${hubCards}`);

/* --------------------------------- home ----------------------------------- */

context = "index.html";
await page.goto(pageUrl("index.html"), { waitUntil: "load" });
await page.waitForFunction(() =>
  [...document.querySelectorAll("[data-next-drawing]")].every((n) => n.textContent.includes("ET")),
);

const home = await page.evaluate(() =>
  [...document.querySelectorAll(".game-card")].map((card) => ({
    game: card.dataset.game,
    title: card.querySelector("h3").textContent.trim(),
    href: card.getAttribute("href"),
    balls: [...card.querySelectorAll(".ball")].map((b) => b.textContent.trim()),
    facts: [...card.querySelectorAll(".game-card__facts div")].map((row) =>
      row.textContent.replace(/\s+/g, " ").trim(),
    ),
  })),
);

console.log("\nhome cards:");
for (const card of home) {
  console.log(`  ${card.title} → ${card.href}: ${card.balls.join(" ")}`);
  for (const fact of card.facts) console.log(`    ${fact}`);
  if (card.balls.length !== 6) problems.push(`${card.game}: home card should show 6 balls`);
  if (!card.facts.some((f) => f.includes("ET"))) {
    problems.push(`${card.game}: home card is missing an Eastern Time next drawing`);
  }
}

const recent = await page.evaluate(() =>
  [...document.querySelectorAll(".recent-col")].map((col) => ({
    game: col.dataset.game,
    title: col.querySelector("h3").textContent.trim(),
    rows: [...col.querySelectorAll(".draw-row")].map((row) => ({
      date: row.querySelector(".draw-row__date").textContent.trim(),
      balls: [...row.querySelectorAll(".ball")].map((b) => b.textContent.trim()),
    })),
  })),
);

console.log("\nlatest winning numbers:");
for (const col of recent) {
  console.log(`  ${col.title}`);
  for (const row of col.rows) console.log(`    ${row.date}  ${row.balls.join(" ")}`);
  if (col.rows.length !== 8) problems.push(`${col.game}: expected 8 recent drawings`);
  const spec = GAMES[col.game];
  for (const row of col.rows) {
    const nums = row.balls.map(Number);
    if (nums.slice(0, 5).some((n) => n < 1 || n > spec.mainMax)) {
      problems.push(`${col.game}: recent draw outside 1-${spec.mainMax}: ${row.balls.join(",")}`);
    }
    if (nums[5] < 1 || nums[5] > spec.specialMax + 1) {
      problems.push(`${col.game}: recent bonus ball out of range: ${nums[5]}`);
    }
  }
}

await page.screenshot({ path: resolve(SHOTS, "01-home.png"), fullPage: true });

/* -------------------------------- guides ---------------------------------- */

context = "guides/independent-trials.html";
await page.goto(pageUrl("guides/independent-trials.html"), { waitUntil: "load" });
const article = await page.evaluate(() => ({
  h1: document.querySelector("h1").textContent.trim(),
  headings: [...document.querySelectorAll("article h2")].map((h) => h.textContent.trim()),
  tables: document.querySelectorAll("article table").length,
  breadcrumb: document.querySelector(".breadcrumb")?.textContent.replace(/\s+/g, " ").trim(),
}));
console.log(`\narticle: ${article.h1}`);
console.log(`  breadcrumb: ${article.breadcrumb}`);
console.log(`  ${article.headings.length} sections, ${article.tables} tables`);
for (const h of article.headings) console.log(`    · ${h}`);
if (article.tables < 2) problems.push("independent-trials: expected data tables");
await page.screenshot({ path: resolve(SHOTS, "06-guide.png"), fullPage: true });

context = "guides/how-lottery-odds-are-calculated.html";
await page.goto(pageUrl("guides/how-lottery-odds-are-calculated.html"), { waitUntil: "load" });
await page.screenshot({ path: resolve(SHOTS, "07-guide-math.png"), fullPage: true });

context = "terms.html";
await page.goto(pageUrl("terms.html"), { waitUntil: "load" });
const terms = await page.evaluate(() => document.body.innerText);
for (const phrase of [
  "entertainment purposes only",
  "independent event",
  "do not buy lottery tickets excessively",
  "not affiliated",
  "1-800-GAMBLER",
]) {
  if (!terms.toLowerCase().includes(phrase.toLowerCase())) {
    problems.push(`terms.html: missing required disclaimer phrase "${phrase}"`);
  }
}
await page.screenshot({ path: resolve(SHOTS, "08-terms.png"), fullPage: true });

/* ------------------------------- generators ------------------------------- */

async function generateAndRead() {
  await page.click("#generateBtn");
  await page.waitForFunction(() => document.querySelectorAll(".game").length === 5);
  await wait(SETTLE);
  return page.evaluate(() =>
    [...document.querySelectorAll(".game")].map((row) => ({
      balls: [...row.querySelectorAll(".ball:not(.ball--special)")].map((b) => b.textContent),
      special: row.querySelector(".ball--special").textContent,
      facts: row.querySelector(".game__facts").textContent.replace(/\s+/g, " ").trim(),
      score: Number(row.querySelector(".score__value").textContent),
    })),
  );
}

function inspect(gameId, lines, label) {
  const spec = GAMES[gameId];
  console.log(`\n${label}:`);
  for (const line of lines) {
    console.log(
      ` ${line.balls.join(" ")} + ${spec.abbr} ${line.special} | ${line.facts} | shape ${line.score}`,
    );
  }
  if (lines.length !== 5) problems.push(`${label}: expected 5 lines, got ${lines.length}`);
  for (const line of lines) {
    const nums = line.balls.map(Number);
    if (new Set(nums).size !== 5) problems.push(`${label}: duplicate numbers ${line.balls}`);
    if (nums.some((n) => !Number.isInteger(n) || n < 1 || n > spec.mainMax)) {
      problems.push(`${label}: white ball outside 1-${spec.mainMax}: ${line.balls.join(",")}`);
    }
    if (nums.some((n, i) => i > 0 && n <= nums[i - 1])) {
      problems.push(`${label}: numbers not sorted: ${line.balls.join(",")}`);
    }
    const special = Number(line.special);
    if (!Number.isInteger(special) || special < 1 || special > spec.specialMax) {
      problems.push(`${label}: bonus ball outside 1-${spec.specialMax}: ${line.special}`);
    }
    if (!Number.isFinite(line.score) || line.score < 0 || line.score > 100) {
      problems.push(`${label}: bad shape score ${line.score}`);
    }
  }
}

for (const [gameId, spec] of Object.entries(GAMES)) {
  context = spec.page;
  await page.goto(pageUrl(spec.page), { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelectorAll(".summary__item").length === 6);

  const info = await page.evaluate(() => ({
    title: document.getElementById("genTitle").textContent.trim(),
    nextDraw: document.querySelector("[data-next-drawing]").textContent.trim(),
    windowHint: document.getElementById("windowHint").textContent.replace(/\s+/g, " ").trim(),
    windows: [...document.querySelectorAll("#windowSelect option")].map((o) => o.textContent.trim()),
    cells: document.querySelectorAll(".cell").length,
    dataSource: document.getElementById("dataSource").textContent.trim(),
    prizeRows: document.querySelectorAll(".panel--reference tbody tr").length,
    navActive: document.querySelector(".nav a.is-on")?.textContent.trim(),
    accent: getComputedStyle(document.body).getPropertyValue("--accent").trim(),
  }));

  console.log(`\n${"=".repeat(64)}\n${info.title}  [${spec.page}]`);
  console.log(`  next drawing: ${info.nextDraw}`);
  console.log(`  nav active: ${info.navActive} · accent ${info.accent}`);
  console.log(`  window: ${info.windowHint}`);
  console.log(`  windows: ${info.windows.join(" | ")}`);
  console.log(`  grid cells: ${info.cells} · prize tiers listed: ${info.prizeRows}`);
  console.log(`  ${info.dataSource}`);

  if (info.cells !== spec.mainMax) {
    problems.push(`${gameId}: grid should have ${spec.mainMax} cells, has ${info.cells}`);
  }
  if (!info.nextDraw.includes("ET")) problems.push(`${gameId}: next drawing missing ET`);
  if (info.prizeRows !== 9) problems.push(`${gameId}: expected 9 prize tiers, got ${info.prizeRows}`);
  if (info.navActive !== spec.name) problems.push(`${gameId}: nav highlight is "${info.navActive}"`);

  inspect(gameId, await generateAndRead(), `${spec.name} · balanced`);
  await page.screenshot({ path: resolve(SHOTS, `02-${gameId}.png`), fullPage: true });

  const firstRow = await page.$(".game");
  if (firstRow) await firstRow.screenshot({ path: resolve(SHOTS, `02-${gameId}-row.png`) });

  const statsPanel = await page.$(".panel--stats");
  for (const tab of ["special", "sum", "grid", "recent"]) {
    await page.click(`[data-tab="${tab}"]`);
    await wait(260);
    await (statsPanel ?? page).screenshot({ path: resolve(SHOTS, `03-${gameId}-${tab}.png`) });
  }
  await page.click('[data-tab="main"]');

  await page.click('[data-preset="cold"]');
  const preset = await page.evaluate(() => ({
    gap: document.getElementById("wGap").value,
    active: document.querySelector(".chip.is-on")?.textContent.trim() ?? null,
  }));
  if (Number(preset.gap) <= 0 || preset.active === null) {
    problems.push(`${gameId}: cold preset did not apply (${JSON.stringify(preset)})`);
  }

  const lastWindow = await page.evaluate(() => {
    const select = document.getElementById("windowSelect");
    return select.options[select.options.length - 1].value;
  });
  await page.select("#windowSelect", lastWindow);
  await wait(200);
  inspect(gameId, await generateAndRead(), `${spec.name} · cold preset, ${lastWindow} window`);
}

/* ---------------------- settings persist across loads ---------------------- */

context = "settings persistence";
await page.goto(pageUrl("powerball.html"), { waitUntil: "load" });
await page.waitForFunction(() => document.querySelectorAll(".summary__item").length === 6);
const persisted = await page.evaluate(() => ({
  preset: document.querySelector(".chip.is-on")?.textContent.trim(),
  window: document.getElementById("windowSelect").value,
}));
console.log("\npowerball settings restored on reload:", JSON.stringify(persisted));
if (persisted.preset !== "Cold & overdue") {
  problems.push(`settings did not persist across page loads: ${JSON.stringify(persisted)}`);
}
await page.click('[data-preset="balanced"]');
await page.select("#windowSelect", "matrix");

/* ------------------------------ live refresh ------------------------------ */

context = "live refresh";
await page.click("#refreshBtn");
await page.waitForFunction(
  () => !document.getElementById("refreshStatus").textContent.includes("Fetching"),
  { timeout: 30000 },
);
const refreshStatus = await page.evaluate(
  () => document.getElementById("refreshStatus").textContent,
);
console.log("live refresh:", refreshStatus);
if (refreshStatus.includes("Could not")) console.log("  (offline — bundled snapshot kept)");

/* --------------------------------- mobile --------------------------------- */

context = "mobile";
await page.setViewport({ width: 420, height: 900, deviceScaleFactor: 2 });
await page.goto(pageUrl("mega-millions.html"), { waitUntil: "load" });
await page.waitForFunction(() => document.querySelectorAll(".summary__item").length === 6);
inspect("megamillions", await generateAndRead(), "Mega Millions · mobile");
await page.screenshot({ path: resolve(SHOTS, "05-mobile-game.png"), fullPage: true });

await page.goto(pageUrl("index.html"), { waitUntil: "load" });
await wait(300);
await page.screenshot({ path: resolve(SHOTS, "04-mobile-home.png"), fullPage: true });

await page.goto(pageUrl("guides/record-jackpots-and-taxes.html"), { waitUntil: "load" });
await wait(200);
await page.screenshot({ path: resolve(SHOTS, "09-mobile-guide.png"), fullPage: true });

await browser.close();
server.close();

if (problems.length) {
  console.log("\nproblems found:");
  for (const p of problems) console.log(" -", p);
  process.exit(1);
}
console.log("\nbrowser smoke test passed · screenshots in", SHOTS);
