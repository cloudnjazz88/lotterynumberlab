/**
 * Verification for the unclaimed-prizes guide: registration, rendered HTML,
 * official rule language, concept distinctions, hub count, and links.
 */
import { readFileSync, accessSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GUIDES } from "../content/guides.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let failed = 0;
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? `  ${extra}` : ""}`);
  if (!ok) failed += 1;
};

const guide = GUIDES.find((g) => g.slug === "what-happens-to-unclaimed-lottery-prizes");
check("guide registered in GUIDES", !!guide);
check("GUIDES length is 16", GUIDES.length === 16, `len=${GUIDES.length}`);
check("guide is among registered Money guides", GUIDES.includes(guide));
check("kicker is Money", guide?.kicker === "Money");
check("published 2026-09-28", guide?.published === "2026-09-28" && guide?.updated === "2026-09-28");
check(
  "publicationMeta omits September 28 date",
  guide?.publicationMeta ===
    "Claim rules verified against official Powerball, Mega Millions and state lottery materials",
);
check("faq has 5-7 items", guide?.faq?.length >= 5 && guide.faq.length <= 7, `n=${guide?.faq?.length}`);
check(
  "faq plain matches on-page answers",
  guide.faq.every((item) => item.a === item.plain),
);

const htmlPath = resolve(ROOT, "guides/what-happens-to-unclaimed-lottery-prizes.html");
let html = "";
try {
  accessSync(htmlPath);
  html = readFileSync(htmlPath, "utf8");
  check("built guide HTML exists", true);
} catch {
  check("built guide HTML exists", false);
}

if (html) {
  check("H1 matches", html.includes("<h1>What Happens to Unclaimed Lottery Prizes?</h1>"));
  check(
    "document title uses SEO candidate",
    html.includes(
      "<title>What Happens to Unclaimed Lottery Prizes After the Claim Deadline? | Lottery Number Lab</title>",
    ),
  );
  check(
    "meta description",
    html.includes(
      'content="Learn what happens when a Powerball or Mega Millions prize is not claimed, why deadlines vary by state, and where unclaimed jackpot money goes."',
    ),
  );
  check(
    "canonical URL",
    html.includes(
      'rel="canonical" href="https://lotterynumberlab.com/guides/what-happens-to-unclaimed-lottery-prizes.html"',
    ),
  );
  check("Article JSON-LD present", html.includes('"@type":"Article"'));
  check("FAQPage JSON-LD present", html.includes('"@type":"FAQPage"'));
  check("BreadcrumbList JSON-LD present", html.includes('"@type":"BreadcrumbList"'));
  check("Money kicker", html.includes("Money") && html.includes('page-kicker'));

  check(
    "lede core answer",
    /winning ticket generally expires/i.test(html) &&
      /Claim periods vary by jurisdiction/i.test(html) &&
      /does not\s+simply roll into the next jackpot/i.test(html),
  );

  const h2s = [
    "The claim deadline comes first",
    "What happens after a ticket expires?",
    "An unclaimed jackpot does not simply roll over",
    "Claim deadlines are not the same everywhere",
    "A real unclaimed Mega Millions jackpot",
    "Lost ticket, unclaimed ticket and unclaimed property",
    "Does the retailer get the unclaimed prize?",
    "A practical ticket-checking routine",
    "What this guide cannot tell you",
    "Practical takeaway",
  ];
  for (const h2 of h2s) {
    check(`H2: ${h2}`, html.includes(`<h2>${h2}</h2>`));
  }
  check("FAQ H2 present", html.includes('<h2 id="faq">FAQ</h2>'));

  check("90 days to one year (Powerball/MM range)", /90 days to one year/i.test(html));
  check("Powerball Grand Prize proportion language", /in proportion to their sales for the draw run/i.test(html));
  check(
    "Mega Millions contributed sales return",
    /each participating lottery\s+gets back all the money they contributed/i.test(html),
  );
  check("four-stage callout", /Deadline passes/i.test(html) && /Prize becomes unclaimed/i.test(html) && /Participating lotteries receive their shares/i.test(html) && /Local law determines the final use/i.test(html));

  check("CA 180 days postmarked or received", /postmarked or received/i.test(html) && /180 days/i.test(html));
  check("CA jackpot one-year exception", /Mega Millions and Powerball/i.test(html) && /Jackpots/i.test(html) && /one year/i.test(html));
  check("NY one-year draw-game rule", /expire <b>one year<\/b> from the date of the draw/i.test(html) || /expire one year from the date of the draw/i.test(html));
  check("NY jackpot column cautious", /Same one-year draw-game rule/i.test(html));
  check("California example wording", html.includes("A jurisdiction can set one deadline for most draw games and a longer deadline for multi-state jackpots"));
  check("New York example wording", html.includes("Jurisdictions set their own rules; New York's published one-year deadline applies to draw games generally"));
  check("examples-only caption", /Examples only, not a 50-state chart/i.test(html) && /Verified September 28, 2026/i.test(html));
  const nyRow = html.match(/<tr><td>New York<\/td>[\s\S]*?<\/tr>/i)?.[0] || "";
  check("no invented NY postmarked language", !/postmarked or received/i.test(nyRow));

  check("advertised $68 million wording", /advertised \$68/i.test(html) && /December 24, 2002/i.test(html));
  check("unclaimed jackpot revert by sales", /revert to the participating states based on their contribution to\s+sales/i.test(html));

  check("concept: unclaimed winning ticket", /Unclaimed winning ticket/i.test(html));
  check("concept: lost ticket bearer", /bearer instruments/i.test(html));
  check("concept: uncashed payment", /Uncashed payment/i.test(html));
  check("concept: general unclaimed property", /General unclaimed property/i.test(html));
  check(
    "does not send to unclaimed-property search for expired tickets",
    /does\s+<strong>not<\/strong>\s+send readers to a general unclaimed-property search/i.test(html) ||
      /Do not treat general unclaimed-property searches as a way to recover/i.test(html),
  );

  check("retailer does not get unclaimed prize", /Does the retailer get the unclaimed prize/i.test(html) && /not the same thing as receiving the winning prize/i.test(html));
  check("seven practical steps", (html.match(/<li>Sign the back of the ticket/i) || []).length >= 1 && html.includes("Photograph the front and back") && html.includes("Store the physical ticket") && html.includes("compare your numbers") && html.includes("follow the selling lottery's claim steps") && html.includes("Watch the claim deadline") && html.includes("contact the lottery that sold the ticket"));
  check("LNL does not verify claims", /does <strong>not<\/strong> verify claims/i.test(html));
  check("Ticket Match not official verification", /not official claim verification/i.test(html));

  check("forbids simple rollover claim", /does not simply roll into the next jackpot/i.test(html) && /Does an unclaimed jackpot roll over into the next drawing/i.test(html));
  check("not legal/tax advice", /not legal, tax, or claims advice/i.test(html));
  check("no purchase CTA", !/buy tickets now/i.test(html) && !/play now/i.test(html) && !/free money/i.test(html));
  check("no invented unclaimed totals", !/most winners claim within/i.test(html) && !/unclaimed rate/i.test(html));

  const mustExternal = [
    "https://www.powerball.com/faqs",
    "https://www.megamillions.com/faqs.aspx",
    "https://www.calottery.com/en/claim-a-prize",
    "https://nylottery.ny.gov/how-to-claim",
    "https://www.megamillions.com/News/2024/Jackpot-Nears-%241-Billion-for-Christmas-Eve-Drawing.aspx",
  ];
  for (const href of mustExternal) {
    check(`external link ${href}`, html.includes(`href="${href}"`));
  }

  const mustLinks = [
    "what-happens-when-multiple-people-win-the-lottery-jackpot.html",
    "../results/index.html",
    "../tools/ticket-match-checker.html",
    "record-jackpots-and-taxes.html",
    "expected-value-of-a-lottery-ticket.html",
    "../responsible-play.html",
    "../methodology.html",
  ];
  for (const href of mustLinks) {
    check(`internal link ${href}`, html.includes(`href="${href}"`));
  }

  for (const item of guide.faq) {
    check(`visible FAQ q: ${item.q.slice(0, 40)}…`, html.includes(item.q));
    check(`visible FAQ a present for: ${item.q.slice(0, 30)}…`, html.includes(item.a.slice(0, 60)));
  }

  check("adsense meta present", html.includes('name="google-adsense-account" content="ca-pub-9237217026636557"'));
  check("no ad-slot placeholder", !html.includes('class="ad-slot"'));
  check("deadline table wrap", html.includes("table-wrap") && html.includes("Jurisdiction (example)"));
  check("concept table present", html.includes("What it usually means"));
}

const sitemap = readFileSync(resolve(ROOT, "sitemap.xml"), "utf8");
check(
  "sitemap includes new guide",
  sitemap.includes("https://lotterynumberlab.com/guides/what-happens-to-unclaimed-lottery-prizes.html"),
);

const hub = readFileSync(resolve(ROOT, "guides/index.html"), "utf8");
check("guides hub says Sixteen guides", hub.includes("Sixteen guides covering"));
check("guides hub has no leftover Thirteen guides", !hub.includes("Thirteen guides covering"));
check("guides hub has no leftover Eleven guides", !hub.includes("Eleven guides covering"));
check(
  "guides hub lists new guide card",
  hub.includes("what-happens-to-unclaimed-lottery-prizes.html"),
);

if (failed) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}
console.log("\nunclaimed-prizes guide checks passed");
