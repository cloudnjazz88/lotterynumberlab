/**
 * Verification for the lump-sum vs. annuity guide and the record-jackpots
 * correction that this page replaces.
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES } from "../content/guides.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed += 1;
};

const SLUG = "lottery-lump-sum-vs-annuity";
const URL_PATH = `guides/${SLUG}.html`;
const CANONICAL = `https://lotterynumberlab.com/${URL_PATH}`;
const FAQ = [
  "Is the lottery lump sum the advertised jackpot?",
  "How many payments are in a Powerball or Mega Millions annuity?",
  "Are the 30 annuity payments equal?",
  "Why does the cash value change relative to the advertised jackpot?",
  "Is the lump sum taxed only at the withholding rate?",
  "Is the annuity tax-free?",
  "What happens to remaining Powerball annuity payments if the winner dies?",
  "Can a winner change the choice after claiming?",
];

check("GUIDES length is 16", GUIDES.length === 16, `len=${GUIDES.length}`);
const guide = GUIDES.find((g) => g.slug === SLUG);
check("guide registered", !!guide);
check("guide is last entry", GUIDES[15] === guide);
check("kicker is Money", guide?.kicker === "Money");
check(
  "H1 title",
  guide?.title === "Lottery Lump Sum vs. Annuity: How Do the Two Jackpot Options Compare?",
);
check(
  "seo title",
  guide?.seoTitle === "Lottery Lump Sum vs. Annuity: Payments, Taxes and Tradeoffs",
);
check(
  "meta description",
  guide?.description ===
    "Compare lottery lump-sum and annuity payments, including cash value, payment schedules, tax timing and questions to review before choosing.",
);
check("published 2026-09-30", guide?.published === "2026-09-30" && guide?.updated === "2026-09-30");
check(
  "publication note",
  guide?.publicationMeta ===
    "Cash and annuity rules checked against official Powerball, Mega Millions and IRS materials",
);
check("faq has 8 items", guide?.faq?.length === 8);
check(
  "faq questions match",
  JSON.stringify(guide?.faq?.map((item) => item.q)) === JSON.stringify(FAQ),
);
check(
  "faq plain matches answers",
  guide?.faq?.every((item) => item.a === item.plain),
);

const htmlPath = resolve(ROOT, URL_PATH);
check("generated page exists", existsSync(htmlPath));
const html = existsSync(htmlPath) ? readFileSync(htmlPath, "utf8") : "";
const flat = html.replace(/\s+/g, " ");

if (html) {
  check("exactly one h1", (html.match(/<h1[\s>]/g) || []).length === 1);
  check("rendered H1", html.includes(`<h1>${guide.title}</h1>`));
  check(
    "title",
    html.includes(`<title>${guide.seoTitle} | Lottery Number Lab</title>`),
  );
  check("meta description", html.includes(`content="${guide.description}"`));
  check("canonical", html.includes(`rel="canonical" href="${CANONICAL}"`));
  check("og title", html.includes(guide.seoTitle) && html.includes('property="og:title"'));
  check("og description", html.includes(guide.description) && html.includes('property="og:description"'));
  check("Article", html.includes('"@type":"Article"'));
  check("FAQPage", html.includes('"@type":"FAQPage"'));
  check("BreadcrumbList", html.includes('"@type":"BreadcrumbList"'));
  check("visible faq count", (html.match(/<dt>/g) || []).length === 8);
  for (const item of guide.faq) {
    check(`FAQ ${item.q.slice(0, 36)}`, html.includes(item.q) && html.includes(item.a));
  }
  const sources = [
    "https://www.powerball.com/faqs",
    "https://www.megamillions.com/difference-between-cash-value-and-annuity",
    "https://www.irs.gov/taxtopics/tc419",
    "https://www.irs.gov/forms-pubs/about-form-w-2-g",
  ];
  for (const url of sources) check(`source ${url}`, html.includes(url));
  check(
    "cash and annuity definitions",
    html.includes("one lump-sum payment before applicable taxes") &&
      html.includes("one immediate payment followed by 29 annual payments"),
  );
  check("5% increase", html.includes("5% larger than the previous"));
  check(
    "hypothetical cash is labeled",
    flat.includes("$45 million") &&
      flat.includes("hypothetical published cash option") &&
      flat.includes("not a fixed 45% rule"),
  );
  check(
    "no permanent cash percentage",
    !/permanently about/i.test(flat) &&
      !/49%/.test(flat) &&
      !/consistently around/i.test(flat) &&
      !/historically about/i.test(flat) &&
      !/nine out of ten/i.test(flat),
  );
  check("withholding is not the final tax", html.includes("not a guarantee of the final tax bill") && !/withholding equals the final tax\./i.test(html.replace(/Assuming withholding equals the final tax\./, "")));
  check("mistakes list names the withholding error", html.includes("Assuming withholding equals the final tax."));
  check("no personalized recommendation", html.includes("does not recommend a payment option"));
  check("neither option universally better", html.includes("Neither option is automatically better."));
  check("previous is claim checklist", html.includes('href="what-to-do-if-you-win-the-lottery.html"') && html.includes(">Previous<"));
  check(
    "next cycles to the odds guide",
    html.includes('article-nav__side--next" href="mega-millions-vs-powerball-odds.html"'),
  );
  check("related keep reading includes record jackpots", html.includes('id="more-guides"') && html.includes("record-jackpots-and-taxes.html"));
  check("stylesheet unchanged", html.includes("/styles.css?v=4b735dc77ae2"));

  let depth = 0;
  let nested = false;
  for (const tag of html.matchAll(/<\/?a\b[^>]*>/gi)) {
    if (tag[0].startsWith("</")) depth = Math.max(0, depth - 1);
    else {
      if (depth > 0) nested = true;
      if (!/\/>\s*$/.test(tag[0])) depth += 1;
    }
  }
  check("no nested anchors", !nested);
}

const recordPath = resolve(ROOT, "guides/record-jackpots-and-taxes.html");
const record = existsSync(recordPath) ? readFileSync(recordPath, "utf8").replace(/\s+/g, " ") : "";
check("record page links here", record.includes("lottery-lump-sum-vs-annuity.html"));
check(
  "record page drops fixed-ratio claims",
  !/49%/.test(record) &&
    !/consistently around/i.test(record) &&
    !/historically about/i.test(record) &&
    !/nine out of ten/i.test(record) &&
    !/roughly nine out of ten winners take the cash/i.test(record),
);
check(
  "record board explains a variable cash ratio",
  record.includes("money available at the time of the drawing") &&
    record.includes("The ratio is not fixed") &&
    record.includes("Use the cash option published for the specific drawing."),
);
check("record page drops lawsuit-loss claim", !record.includes("cannot be lost"));
check("record page drops lump-sum-wins arithmetic", !/lump sum wins on/i.test(record));
check(
  "record page has the corrected summary",
  record.includes("one immediate payment followed by 29 annual payments that increase by 5% each year") &&
    record.includes("Neither option is universally better."),
);

const sitemap = existsSync(resolve(ROOT, "sitemap.xml")) ? readFileSync(resolve(ROOT, "sitemap.xml"), "utf8") : "";
check("sitemap entry", sitemap.includes(CANONICAL));
check("sitemap lastmod", sitemap.includes(`<loc>${CANONICAL}</loc>\n    <lastmod>2026-09-30</lastmod>`));

const hub = existsSync(resolve(ROOT, "guides/index.html")) ? readFileSync(resolve(ROOT, "guides/index.html"), "utf8") : "";
check("hub says Sixteen", hub.includes("Sixteen guides covering"));
check("hub has no leftover Fifteen", !hub.includes("Fifteen guides covering"));
check("hub card", hub.includes(`${SLUG}.html`));

const home = existsSync(resolve(ROOT, "index.html")) ? readFileSync(resolve(ROOT, "index.html"), "utf8") : "";
const analyze = existsSync(resolve(ROOT, "analyze/index.html")) ? readFileSync(resolve(ROOT, "analyze/index.html"), "utf8") : "";
const tools = existsSync(resolve(ROOT, "tools/index.html")) ? readFileSync(resolve(ROOT, "tools/index.html"), "utf8") : "";
check("not on home", !home.includes(SLUG));
check("not on analyze", !analyze.includes(SLUG));
check("not on tools hub", !tools.includes(SLUG));

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nlump-sum vs annuity guide checks passed");
