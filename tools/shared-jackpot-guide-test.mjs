/**
 * Verification for the shared-jackpot guide: share math, rendered HTML,
 * canonical/sitemap, structured data, internal/external links, and hub count.
 */
import { readFileSync, accessSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES } from "../content/guides.mjs";
import {
  equalTicketShare,
  shareFractionLabel,
  illustrativeAnnuityShareRows,
  ILLUSTRATIVE_ANNUITY,
  ILLUSTRATIVE_TICKET_COUNTS,
} from "./shared-jackpot-math.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed += 1;
};

check("2 tickets → 1/2 of $600M", equalTicketShare(ILLUSTRATIVE_ANNUITY, 2) === 300_000_000);
check("3 tickets → 1/3 of $600M", equalTicketShare(ILLUSTRATIVE_ANNUITY, 3) === 200_000_000);
check("5 tickets → 1/5 of $600M", equalTicketShare(ILLUSTRATIVE_ANNUITY, 5) === 120_000_000);
check("1 ticket → full $600M", equalTicketShare(ILLUSTRATIVE_ANNUITY, 1) === 600_000_000);
check("fraction labels 2/3/5", shareFractionLabel(2) === "1/2" && shareFractionLabel(3) === "1/3" && shareFractionLabel(5) === "1/5");

const rows = illustrativeAnnuityShareRows();
check("illustrative rows for 1,2,3,5", rows.map((r) => r.tickets).join(",") === ILLUSTRATIVE_TICKET_COUNTS.join(","));
check("$600M share labels", rows.map((r) => r.shareLabel).join("|") === "$600,000,000|$300,000,000|$200,000,000|$120,000,000");

const guide = GUIDES.find((g) => g.slug === "what-happens-when-multiple-people-win-the-lottery-jackpot");
check("guide registered in GUIDES", !!guide);
check("GUIDES length is 16", GUIDES.length === 16, `len=${GUIDES.length}`);

const htmlPath = resolve(ROOT, "guides/what-happens-when-multiple-people-win-the-lottery-jackpot.html");
let html = "";
try {
  accessSync(htmlPath);
  html = readFileSync(htmlPath, "utf8");
  check("built guide HTML exists", true);
} catch {
  check("built guide HTML exists", false);
}

if (html) {
  check("H1 matches", html.includes("<h1>What Happens When Multiple People Win the Lottery Jackpot?</h1>"));
  check(
    "document title uses SEO candidate",
    html.includes(
      "<title>What Happens When Multiple People Win the Lottery Jackpot? How the Prize Is Split | Lottery Number Lab</title>",
    ),
  );
  check(
    "meta description",
    html.includes(
      'content="Learn how Powerball and Mega Millions jackpots are divided when multiple tickets win, how cash and annuity choices work, and why a lottery pool is different."',
    ),
  );
  check(
    "canonical URL",
    html.includes(
      'rel="canonical" href="https://lotterynumberlab.com/guides/what-happens-when-multiple-people-win-the-lottery-jackpot.html"',
    ),
  );
  check("Article JSON-LD present", html.includes('"@type":"Article"'));
  check("FAQPage JSON-LD present", html.includes('"@type":"FAQPage"'));
  check("BreadcrumbList JSON-LD present", html.includes('"@type":"BreadcrumbList"'));
  check("direct answer in lede", /divided among those jackpot-winning tickets/i.test(html));
  check("does not promise full jackpot each", /does <em>not<\/em> get the full/i.test(html) || /does not get the full advertised jackpot/i.test(html));
  check("$600M table values present", html.includes("$300,000,000") && html.includes("$200,000,000") && html.includes("$120,000,000"));
  check("illustrative footnote language", /Illustrative only/i.test(html) && /Not a claim estimate/i.test(html));
  check("annuity ≠ cash called out", /Annuity is not cash/i.test(html));
  check("separate tickets vs pool", /Multiple independent jackpot-winning tickets/i.test(html) && /owned by a pool/i.test(html));
  check("CA group claim as example not US-wide", /California Lottery/i.test(html) && /not a United States-wide rulebook/i.test(html));
  check("Form 5754 mentioned with caveat", /Form 5754/i.test(html) && /not giving legal or tax advice/i.test(html));
  check("cash/annuity share-focused", /each ticket is dealing with its/i.test(html) || /choosing independently for (its|their) share/i.test(html));
  check("PB annuity schedule cited", /29 annual payments that increase by 5%/i.test(html));
  check("MM annuity schedule cited separately", /Confirm each game/i.test(html));
  check("no blanket lower-tier split", /Do not claim that every tier splits like the jackpot/i.test(html) || /Do not assume every tier is split like the jackpot/i.test(html));
  check("pari-mutuel defined", /pari-mutuel/i.test(html) && /divided by the number of winning plays/i.test(html));
  check(
    "duplicate wording consistent with more-tickets",
    /does <em>not<\/em> raise the chance that combination\s+is drawn/i.test(html),
  );
  check("duplicate payout vs probability distinction", /payout question, not a hit-probability boost/i.test(html));
  check("jurisdiction caveats", /vary by state lottery/i.test(html));
  check("not legal/tax advice", /not legal, tax, or claims advice/i.test(html) || /not giving legal or tax advice/i.test(html));
  check("no purchase CTA", !/buy tickets now/i.test(html) && !/purchase tickets/i.test(html) && !/play now/i.test(html));

  const mustExternal = [
    "https://www.powerball.com/faqs",
    "https://www.megamillions.com/How-to-Play.aspx",
    "https://www.megamillions.com/FAQs",
    "https://www.calottery.com/en/claim-a-prize",
  ];
  for (const href of mustExternal) {
    check(`external link ${href}`, html.includes(`href="${href}"`));
  }

  const mustLinks = [
    "does-buying-more-lottery-tickets-improve-your-odds.html",
    "mega-millions-vs-powerball-odds.html",
    "expected-value-of-a-lottery-ticket.html",
    "record-jackpots-and-taxes.html",
    "how-lottery-odds-are-calculated.html",
    "../tools/odds-explorer.html",
    "../responsible-play.html",
  ];
  for (const href of mustLinks) {
    check(`internal link ${href}`, html.includes(`href="${href}"`));
  }

  check("visible FAQ present", html.includes('id="faq"') && html.includes("Do multiple jackpot winners each get the full"));
  check("adsense meta present", html.includes('name="google-adsense-account" content="ca-pub-9237217026636557"'));
  check("no ad-slot placeholder", !html.includes('class="ad-slot"'));
  check("comparison table wrap", html.includes("table-wrap") && html.includes("What is split?"));
}

const sitemap = readFileSync(resolve(ROOT, "sitemap.xml"), "utf8");
check(
  "sitemap includes new guide",
  sitemap.includes(
    "https://lotterynumberlab.com/guides/what-happens-when-multiple-people-win-the-lottery-jackpot.html",
  ),
);

const hub = readFileSync(resolve(ROOT, "guides/index.html"), "utf8");
check("guides hub says Sixteen guides", hub.includes(`${GUIDES.length} guides covering`));
check("guides hub has no leftover Ten guides", !hub.includes("Ten guides covering"));
check("guides hub has no leftover Eleven guides", !hub.includes("Eleven guides covering"));
check("guides hub has no leftover Thirteen guides", !hub.includes("Thirteen guides covering"));
check(
  "guides hub lists new guide card",
  hub.includes("what-happens-when-multiple-people-win-the-lottery-jackpot.html"),
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nshared-jackpot guide checks passed");
