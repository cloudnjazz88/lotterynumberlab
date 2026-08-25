/**
 * Renders every static page of the site from content/ plus the computed
 * statistics context. Run after changing content or refreshing the data:
 *
 *   node tools/build-site.mjs
 */

import { writeFile, mkdir, cp, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildContext } from "./compute-context.mjs";
import { SITE, PLACEHOLDERS, layout, link, num, dateLong, adSlot } from "../content/site.mjs";
import { homeBody, gameBody, guideCards } from "../content/app-views.mjs";
import { GUIDES } from "../content/guides.mjs";
import { aboutPage, privacyPage, termsPage, responsiblePage } from "../content/legal.mjs";
import { faqContent, glossaryPage, methodologyPage } from "../content/reference.mjs";
import { resultsHub, yearPage, yearPageSpecs, yearHref } from "../content/results.mjs";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ctx = buildContext();
const faq = faqContent(ctx);
const yearSpecs = yearPageSpecs(ctx);

const GAME_SCRIPTS = [
  "data/draws.js",
  "src/data.js",
  "src/stats.js",
  "src/generator.js",
  "src/charts.js",
  "src/app.js",
];
const HOME_SCRIPTS = ["src/data.js", "src/app.js"];

/* ------------------------------- guide pages ------------------------------ */

function guideArticle(guide, index) {
  const prev = GUIDES[(index - 1 + GUIDES.length) % GUIDES.length];
  const next = GUIDES[(index + 1) % GUIDES.length];
  const others = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  return `      <nav class="breadcrumb" aria-label="Breadcrumb">
        <a href="${link("index.html", 1)}">Home</a>
        <span aria-hidden="true">/</span>
        <a href="index.html">Guides</a>
        <span aria-hidden="true">/</span>
        <span>${guide.kicker}</span>
      </nav>

      <article class="panel prose prose--article">
        <header class="article-head">
          <p class="page-kicker">${guide.kicker}</p>
          <h1>${guide.title}</h1>
          <p class="article-dek">${guide.dek}</p>
          <p class="article-meta">
            <time datetime="${guide.published}">Published ${dateLong(guide.published)}</time>
            · figures computed from ${num(ctx.mm.history.count + ctx.pb.history.count)} drawings
            and the published game rules
          </p>
        </header>
${guide.body(ctx)}
        <footer class="article-foot">
          <p class="disclaimer-text">
            Entertainment and information only. Lottery drawings are independent random events
            and no method described on this site can improve your odds of winning. 18+ (21+ in
            some states). Verify all results with your state lottery.
            <a href="${link("terms.html", 1)}">Full disclaimer</a>.
          </p>
        </footer>
      </article>

      ${adSlot("guide-end")}

      <nav class="article-nav" aria-label="More guides">
        <a class="article-nav__side" href="${prev.slug}.html">
          <span>Previous</span><b>${prev.title}</b>
        </a>
        <a class="article-nav__side article-nav__side--next" href="${next.slug}.html">
          <span>Next</span><b>${next.title}</b>
        </a>
      </nav>

      <section class="section" aria-labelledby="more-guides">
        <h2 class="section__title" id="more-guides">Keep reading</h2>
        <div class="guide-cards">
        ${guideCards(others, 1)}
        </div>
      </section>
`;
}

function guidesHub() {
  return `      <section class="hero hero--slim">
        <p class="hero__eyebrow">Guides</p>
        <h1>Lottery statistics, explained properly</h1>
        <p class="hero__lead">
          Nine guides covering the probability, the prize structures, the tax arithmetic and the
          rule changes behind Mega Millions and Powerball. Every figure is computed from the
          published ball matrices and from
          ${num(ctx.mm.history.count + ctx.pb.history.count)} recorded drawings — if a number
          appears in one of these guides, you can reproduce it.
        </p>
      </section>

      <section class="section">
        <div class="guide-cards guide-cards--all">
        ${guideCards(GUIDES, 1)}
        </div>
      </section>

      ${adSlot("guides-hub")}

      <section class="panel prose">
        <h2>Start here if you are new</h2>
        <p>
          Read <a href="how-lottery-odds-are-calculated.html">how lottery odds are calculated</a>
          first — it is the foundation for everything else, and it takes ten minutes. Then
          <a href="mega-millions-vs-powerball-odds.html">compare the two games tier by tier</a>.
          If you have ever wondered whether hot numbers work, the answer is in
          <a href="hot-and-cold-numbers-tested.html">the test of the full drawing record</a>, and
          the reason is in <a href="independent-trials.html">the law of independent trials</a>.
        </p>
        <p>
          When you are ready to look at the data yourself, both generators publish the underlying
          statistics next to the numbers they produce:
          <a href="${link("mega-millions.html", 1)}">Mega Millions</a> and
          <a href="${link("powerball.html", 1)}">Powerball</a>.
        </p>
      </section>
`;
}

/* --------------------------------- pages ---------------------------------- */

const pages = [
  {
    slug: "index.html",
    view: "home",
    nav: "home",
    title: "Mega Millions & Powerball statistics, odds and drawing history",
    description:
      "Independent statistics for Mega Millions and Powerball: exact odds for every prize tier, past winning numbers in ET, and guides to probability, taxes and rule changes. This site does not sell tickets.",
    body: homeBody(ctx, GUIDES),
    scripts: HOME_SCRIPTS,
  },
  {
    slug: "mega-millions.html",
    view: "game",
    game: "megamillions",
    nav: "megamillions",
    title: "Mega Millions number generator and drawing statistics",
    description: `Mega Millions number generator weighted by ${num(ctx.mm.history.count)} drawings since ${dateLong(ctx.mm.history.firstDraw)}, with ball frequencies, sum distribution, prize tiers and exact odds.`,
    brandSub: `Mega Millions · ${ctx.mm.config.matrixLabel} · ${ctx.mm.config.drawDaysLabel}, ${ctx.mm.config.drawTimeLabel}`,
    body: gameBody(ctx, "megamillions", GUIDES),
    scripts: GAME_SCRIPTS,
  },
  {
    slug: "powerball.html",
    view: "game",
    game: "powerball",
    nav: "powerball",
    title: "Powerball number generator and drawing statistics",
    description: `Powerball number generator weighted by ${num(ctx.pb.history.count)} drawings since ${dateLong(ctx.pb.history.firstDraw)}, with ball frequencies, sum distribution, prize tiers and exact odds.`,
    brandSub: `Powerball · ${ctx.pb.config.matrixLabel} · ${ctx.pb.config.drawDaysLabel}, ${ctx.pb.config.drawTimeLabel}`,
    body: gameBody(ctx, "powerball", GUIDES),
    scripts: GAME_SCRIPTS,
  },
  {
    slug: "guides/index.html",
    nav: "guides",
    title: "Lottery odds and statistics guides",
    description:
      "Guides to Mega Millions and Powerball: odds compared tier by tier, independent trials, hot and cold numbers, expected value, record jackpots, and the 2015 and 2025 rule changes.",
    body: guidesHub(),
  },
  {
    slug: "about.html",
    nav: "about",
    title: "About this site and how to contact us",
    description:
      "Who runs this independent lottery statistics site, where the drawing data comes from, how figures are verified, how the site is funded, and how to send a correction.",
    body: aboutPage(ctx),
  },
  {
    slug: "privacy-policy.html",
    nav: "about",
    title: "Privacy policy",
    description:
      "What this site stores (generator settings in your own browser), what it does not collect, and how third-party advertising cookies and opt-outs work.",
    body: privacyPage(),
  },
  {
    slug: "terms.html",
    nav: "about",
    title: "Terms of use and full disclaimer",
    description:
      "Entertainment-only disclaimer, no guarantee of winnings, no affiliation with any lottery, data accuracy limits, age and legality requirements, and limitation of liability.",
    body: termsPage(ctx),
  },
  {
    slug: "responsible-play.html",
    nav: "about",
    title: "Responsible play and problem gambling help",
    description:
      "How to keep lottery play harmless, the warning signs of problem gambling, and where to get free confidential help in the US and elsewhere.",
    body: responsiblePage(ctx),
  },
  {
    slug: "faq.html",
    nav: "about",
    title: "Mega Millions and Powerball FAQ",
    description:
      "Jackpot odds, whether past numbers predict the next drawing, how jackpots are taxed, drawing times in Eastern Time, and what this independent statistics site does not do.",
    faq: faq.faq,
    body: faq.body,
  },
  {
    slug: "glossary.html",
    nav: "about",
    title: "Lottery glossary: annuity, matrix, Power Play and more",
    description:
      "Definitions of lottery terms used on Mega Millions and Powerball tickets and on this site: annuity, cash option, matrix, Megaplier, Power Play, rollover and independent trials.",
    body: glossaryPage(),
  },
  {
    slug: "methodology.html",
    nav: "about",
    title: "Methodology: how lottery odds and statistics are computed here",
    description:
      "How this site calculates prize-tier odds from ball matrices, which drawings are included, why eras are not mixed, the chi-square test, and how to send a correction.",
    body: methodologyPage(ctx),
  },
  {
    slug: "results/index.html",
    nav: "results",
    title: "Past Mega Millions and Powerball winning numbers",
    description: `Archive of ${num(ctx.mm.history.count + ctx.pb.history.count)} Mega Millions and Powerball drawings under the current matrices, organised by year, with sums and frequency notes. Not an official record.`,
    dataset: {
      name: "Mega Millions and Powerball drawing archive",
      coverage: `${ctx.pb.history.firstDraw}/${ctx.mm.history.latestDraw}`,
    },
    body: resultsHub(ctx),
  },
  ...yearSpecs.map((spec) => {
    const gameName = spec.gameId === "megamillions" ? "Mega Millions" : "Powerball";
    return {
      slug: `results/${yearHref(spec.gameId, spec.year)}`,
      nav: "results",
      title: `${gameName} winning numbers for ${spec.year}`,
      description: `All ${spec.count} ${gameName} drawings in ${spec.year}: winning numbers, sums, odd/even splits, and the year's most- and least-drawn balls. Convenience copy of public data; verify with your state lottery.`,
      body: yearPage(ctx, spec.gameId, spec.year),
    };
  }),
  ...GUIDES.map((guide, index) => ({
    slug: `guides/${guide.slug}.html`,
    kind: "guide",
    nav: "guides",
    title: guide.title,
    description: guide.description,
    published: guide.published,
    updated: guide.updated,
    body: guideArticle(guide, index),
  })),
];

/* -------------------------------- rendering ------------------------------- */

async function write(relative, contents) {
  const target = resolve(ROOT, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, contents, "utf8");
  return relative;
}

const written = [];
for (const page of pages) {
  written.push(await write(page.slug, layout(page)));
}

const base = SITE.url.replace(/\/$/, "");
const today = new Date().toISOString().slice(0, 10);
const sitemapUrls = pages
  .map((page) => {
    const loc = `${base}/${page.slug.replace(/index\.html$/, "")}`;
    const priority = page.slug === "index.html" ? "1.0" : page.kind === "guide" ? "0.8" : "0.6";
    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${page.view ? "daily" : "monthly"}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  })
  .join("\n");

written.push(
  await write(
    "sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>
`,
  ),
);
written.push(
  await write(
    "robots.txt",
    `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`,
  ),
);
written.push(
  await write(
    "favicon.svg",
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="b" cx="34%" cy="28%">
      <stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#ffc233"/>
      <stop offset="1" stop-color="#ff8f0f"/>
    </radialGradient>
  </defs>
  <rect width="64" height="64" rx="14" fill="#0b1128"/>
  <circle cx="32" cy="32" r="20" fill="url(#b)"/>
  <text x="32" y="40" font-family="Segoe UI, system-ui, sans-serif" font-size="22"
    font-weight="700" text-anchor="middle" fill="#241a02">5</text>
</svg>
`,
  ),
);

if (SITE.adsensePublisherId) {
  const publisher = SITE.adsensePublisherId.replace(/^ca-/, "");
  written.push(
    await write("ads.txt", `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n`),
  );
}

console.log(`built ${written.length} files:`);
for (const file of written) console.log("  " + file);

const todo = [];
if (SITE.url === PLACEHOLDERS.url) todo.push("SITE.url — your real domain (canonical URLs, sitemap)");
if (SITE.email === PLACEHOLDERS.email) todo.push("SITE.email — a working contact address");
if (!SITE.operatorName)
  todo.push("SITE.operatorName — the name you publish under (shown on About)");
if (!SITE.adsensePublisherId)
  todo.push('SITE.adsensePublisherId — e.g. "ca-pub-1234567890123456" (also emits ads.txt)');

if (todo.length) {
  console.log("\nACTION REQUIRED before publishing — edit content/site.mjs:");
  for (const item of todo) console.log("  - " + item);
}

const DIST = resolve(ROOT, "dist");
await rm(DIST, { recursive: true, force: true });

const assets = [
  "styles.css",
  "src/app.js",
  "src/data.js",
  "src/stats.js",
  "src/generator.js",
  "src/charts.js",
  "data/draws.js",
];
const publish = [...new Set([...written, ...assets])];
for (const file of publish) {
  const to = resolve(DIST, file);
  await mkdir(dirname(to), { recursive: true });
  await cp(resolve(ROOT, file), to);
}

await cp(resolve(DIST, "sitemap.xml"), resolve(DIST, "sitemap.txt"));
await cp(resolve(DIST, "favicon.svg"), resolve(DIST, "favicon.svg.txt"));
console.log(`\npublished ${publish.length} files to dist/`);
